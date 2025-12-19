"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { INTERNAL_ROLES, type AppRole } from "@/lib/roles";
import { formatMoney } from "@/lib/utils";
import { YCFlags } from "@/components/YCFlags";
import { AnalystScreeningEditor } from "@/components/AnalystScreeningEditor";
import { AnalystYCFlags } from "@/components/AnalystYCFlags";
import { AnalystAnalysesView } from "@/components/AnalystAnalysesView";

type Deal = any;

export default function DealDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [interest, setInterest] = useState<{ signal: string; indicative_ticket: string; note: string }>({
    signal: "maybe",
    indicative_ticket: "",
    note: "",
  });
  const [icVote, setIcVote] = useState<{ vote: string; confidence: number; comment: string }>({
    vote: "yes",
    confidence: 3,
    comment: "",
  });
  const [chair, setChair] = useState<{ decision: string; rationale: string; publish: boolean }>({
    decision: "recommended",
    rationale: "",
    publish: true,
  });

  const isInternal = useMemo(() => role ? INTERNAL_ROLES.includes(role) : false, [role]);

  async function load() {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (uid) {
      const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).single();
      setRole((p?.role as AppRole) ?? null);
    }

    const { data, error } = await supabase
      .from("deals")
      .select(`
        id,status,round_type,target_amount,min_ticket,valuation,instrument,highlights,risks,use_of_funds,created_at,
        startup:startup_id(id,name,sector,hq_location,description,team_summary,traction_summary),
        documents(id,storage_path,file_name,visibility,created_at),
        screening_reviews(id,overall_score,decision,summary_memo,manager_user_id,created_at),
        ic_decisions(id,decision,rationale,chair_user_id,decided_at,chair:chair_user_id(full_name,email)),
        screening_reports(id,report_type,report_data,decision_rationale,decided_at),
        ic_votes(id,vote,confidence,comment,ic_member_user_id,updated_at,ic_member:ic_member_user_id(full_name,email)),
        screening_scores(id,score,note,criterion_id,criterion:criterion_id(name,description,weight)),
        deal_flags(id,green_flags,red_flags,manager_user_id)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      setDeal(null);
      return;
    }
    setDeal(data);
  }

  useEffect(() => { load(); }, [id]);

  async function submitInterest() {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid) return;

    const payload = {
      deal_id: id,
      investor_user_id: uid,
      signal: interest.signal,
      indicative_ticket: interest.indicative_ticket ? Number(interest.indicative_ticket) : null,
      note: interest.note || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("interests").upsert(payload, { onConflict: "deal_id,investor_user_id" });
    if (error) return alert(error.message);
    alert("Interest saved.");
  }

  async function dealflowTransition(action: "start_screening"|"approve_to_ic"|"reject_screening") {
    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess.session?.access_token;
    if (!jwt) return;

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dealflow-transition`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ deal_id: id, action }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "Failed");
    await load();
  }

  async function submitICVote() {
    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess.session?.access_token;
    if (!jwt) return;

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ic-vote`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ deal_id: id, vote: icVote.vote, confidence: icVote.confidence, comment: icVote.comment }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "Failed");
    alert("Vote saved.");
  }

  async function chairDecision() {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess.session?.access_token;
      if (!jwt) {
        alert("Not authenticated");
        return;
      }

      // If publish checkbox is true, send "published" as decision
      const finalDecision = chair.publish && chair.decision === "recommended" ? "published" : chair.decision;

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ic-chair-decision`;
      console.log("Calling IC chair decision:", { url, decision: finalDecision });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ deal_id: id, decision: finalDecision, rationale: chair.rationale }),
      });

      console.log("Response status:", res.status);

      const j = await res.json().catch(() => ({ error: "Invalid response from server" }));
      console.log("Response data:", j);

      if (!res.ok) {
        alert(`Failed to save decision: ${j.error || res.statusText}`);
        return;
      }

      alert("Decision saved successfully!");
      await load();
    } catch (e: any) {
      console.error("Chair decision error:", e);
      alert(`Error: ${e.message || "Network error - check console for details"}`);
    }
  }

  if (!deal) return <div className="text-sm text-black/60">Deal not accessible (RLS) or not found.</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-lg font-semibold">{deal.startup?.name ?? "Startup"}</div>
                <div className="mt-1 text-xs text-black/60">
                  {(deal.startup?.sector ?? "—")} • {(deal.startup?.hq_location ?? "—")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{deal.status}</Badge>
                {(role === "dealflow_manager" || role === "admin") && (
                  <Button
                    variant="secondary"
                    onClick={() => window.location.href = `/app/deals/${id}/edit`}
                    className="text-xs"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-xs text-black/70">
              <div><div className="text-black/40">Round</div><div className="mt-0.5">{deal.round_type ?? "—"}</div></div>
              <div><div className="text-black/40">Instrument</div><div className="mt-0.5">{deal.instrument ?? "—"}</div></div>
              <div><div className="text-black/40">Target</div><div className="mt-0.5">{formatMoney(deal.target_amount)}</div></div>
              <div><div className="text-black/40">Min Ticket</div><div className="mt-0.5">{formatMoney(deal.min_ticket)}</div></div>
              <div><div className="text-black/40">Valuation</div><div className="mt-0.5">{formatMoney(deal.valuation)}</div></div>
            </div>

            <div className="mt-5 space-y-3">
              {deal.highlights ? (
                <div>
                  <div className="text-xs font-semibold">Highlights</div>
                  <div className="text-sm text-black/70 whitespace-pre-wrap mt-1">{deal.highlights}</div>
                </div>
              ) : null}
              {deal.risks ? (
                <div>
                  <div className="text-xs font-semibold">Risks</div>
                  <div className="text-sm text-black/70 whitespace-pre-wrap mt-1">{deal.risks}</div>
                </div>
              ) : null}
              {deal.use_of_funds ? (
                <div>
                  <div className="text-xs font-semibold">Use of funds</div>
                  <div className="text-sm text-black/70 whitespace-pre-wrap mt-1">{deal.use_of_funds}</div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Data room</div>
            <div className="text-xs text-black/60">Documents are secured by storage policies + documents table visibility.</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Upload section for dealflow managers */}
              {(role === "dealflow_manager" || role === "admin") && (
                <DocumentUpload dealId={id} onUploaded={load} />
              )}

              {/* List of documents */}
              <div className="space-y-2">
                {(deal.documents ?? []).length === 0 ? (
                  <div className="text-sm text-black/60">No documents available.</div>
                ) : (
                  (deal.documents ?? []).map((doc: any) => (
                    <DocRow key={doc.id} doc={doc} />
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isInternal ? (
          <>
            {/* IC Members and IC Chair: Show detailed screening analysis */}
            {(role === "ic_member" || role === "ic_chair") ? (
              <>
                {/* Show finalized report if exists, otherwise show live screening details */}
                {(deal.screening_reports ?? []).length > 0 ? (
                  <FullScreeningReport report={(deal.screening_reports ?? [])[0]} />
                ) : (
                  <LiveScreeningDetails dealId={id} />
                )}
              </>
            ) : (
              /* Dealflow Managers and Admins: Show basic screening memo card */
              <Card>
                <CardHeader>
                  <div className="text-sm font-semibold">Screening memo</div>
                  <div className="text-xs text-black/60">Dealflow managers can write the memo & scores (7 criteria).</div>
                </CardHeader>
                <CardContent>
                  {(deal.screening_reviews ?? []).length === 0 ? (
                    <div className="text-sm text-black/60">No screening memo recorded yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {deal.screening_reviews.map((r: any) => (
                        <div key={r.id} className="rounded-xl border border-black/10 bg-white/50 p-3 backdrop-blur">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold">Decision: {r.decision}</div>
                            <div className="text-xs text-black/50">Score: {r.overall_score ?? "—"}</div>
                          </div>
                          {r.summary_memo ? <div className="mt-2 text-sm text-black/70 whitespace-pre-wrap">{r.summary_memo}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dealflow Manager: Show manager screening + view all analyst analyses */}
            {(role === "dealflow_manager" || role === "admin") ? (
              <>
                <ScreeningEditor dealId={id} onSaved={load} />
                <YCFlags dealId={id} onSaved={load} />
                <AnalystAnalysesView dealId={id} />
              </>
            ) : null}

            {/* Dealflow Analyst: Show analyst screening (cannot submit to IC) */}
            {role === "dealflow_analyst" ? (
              <>
                <AnalystScreeningEditor dealId={id} onSaved={load} />
                <AnalystYCFlags dealId={id} onSaved={load} />
              </>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Investor action</div>
            <div className="text-xs text-black/60">Express interest (Yes/Maybe/No) and optional ticket.</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <select
                className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm backdrop-blur"
                value={interest.signal}
                onChange={(e) => setInterest({ ...interest, signal: e.target.value })}
              >
                <option value="yes">Yes</option>
                <option value="maybe">Maybe</option>
                <option value="no">No</option>
              </select>
              <Input
                placeholder="Indicative ticket (number)"
                value={interest.indicative_ticket}
                onChange={(e) => setInterest({ ...interest, indicative_ticket: e.target.value })}
              />
              <Textarea
                placeholder="Note (optional)"
                rows={4}
                value={interest.note}
                onChange={(e) => setInterest({ ...interest, note: e.target.value })}
              />
              <Button onClick={submitInterest}>Save interest</Button>
            </div>
          </CardContent>
        </Card>

        {(role === "dealflow_manager" || role === "admin") &&
         deal.status !== "published" &&
         deal.status !== "ic_in_review" &&
         deal.status !== "screening_rejected" ? (
          <Card>
            <CardHeader>
              <div className="text-sm font-semibold">Dealflow controls</div>
              <div className="text-xs text-black/60">
                Move deal through screening workflow. Current: {deal.status}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {deal.status === "draft" || deal.status === "submitted" ? (
                  <Button onClick={() => dealflowTransition("start_screening")}>
                    Start screening
                  </Button>
                ) : null}

                {deal.status === "screening_in_progress" ? (
                  <>
                    <Button onClick={() => dealflowTransition("approve_to_ic")}>
                      Approve to IC
                    </Button>
                    <Button variant="secondary" onClick={() => dealflowTransition("reject_screening")}>
                      Reject (screening)
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {role === "ic_member" || role === "ic_chair" || role === "admin" ? (
          <>
            <Card>
              <CardHeader>
                <div className="text-sm font-semibold">IC vote</div>
                <div className="text-xs text-black/60">Submit a vote with confidence and a short comment.</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <select
                    className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm backdrop-blur"
                    value={icVote.vote}
                    onChange={(e) => setIcVote({ ...icVote, vote: e.target.value })}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="abstain">Abstain</option>
                  </select>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    placeholder="Confidence 1-5"
                    value={String(icVote.confidence)}
                    onChange={(e) => setIcVote({ ...icVote, confidence: Number(e.target.value || 3) })}
                  />
                  <Textarea
                    placeholder="Comment"
                    rows={3}
                    value={icVote.comment}
                    onChange={(e) => setIcVote({ ...icVote, comment: e.target.value })}
                  />
                  <Button onClick={submitICVote}>Submit vote</Button>
                </div>
              </CardContent>
            </Card>

            {/* Display IC Votes (for IC Chair and Admin) */}
            {(role === "ic_chair" || role === "admin") && (deal.ic_votes ?? []).length > 0 && (
              <Card>
                <CardHeader>
                  <div className="text-sm font-semibold">IC Votes ({(deal.ic_votes ?? []).length})</div>
                  <div className="text-xs text-black/60">Member voting summary</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(deal.ic_votes ?? []).map((vote: any) => {
                      const memberName = vote.ic_member?.full_name || vote.ic_member?.email || `IC Member ${vote.ic_member_user_id?.slice(0, 8)}...`;
                      return (
                        <div key={vote.id} className="rounded-xl border border-black/10 bg-white/50 p-3 backdrop-blur">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                vote.vote === "yes" ? "bg-green-50 text-green-700 border-green-200" :
                                vote.vote === "no" ? "bg-red-50 text-red-700 border-red-200" :
                                "bg-gray-50 text-gray-700 border-gray-200"
                              }>
                                {vote.vote.toUpperCase()}
                              </Badge>
                              <span className="text-sm font-medium text-black/80">{memberName}</span>
                            </div>
                            <div className="text-xs text-black/50">
                              Confidence: {vote.confidence ?? "—"}/5
                            </div>
                          </div>
                          {vote.comment && (
                            <div className="text-sm text-black/70 mt-2">
                              {vote.comment}
                            </div>
                          )}
                          <div className="text-xs text-black/40 mt-2">
                            {new Date(vote.updated_at).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}

        {role === "ic_chair" || role === "admin" ? (
          <Card>
            <CardHeader>
              <div className="text-sm font-semibold">Chair decision</div>
              <div className="text-xs text-black/60">Recommend and publish (investor visibility).</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <select
                  className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm backdrop-blur"
                  value={chair.decision}
                  onChange={(e) => setChair({ ...chair, decision: e.target.value })}
                >
                  <option value="recommended">Recommend</option>
                  <option value="rejected">Reject</option>
                </select>
                <Textarea
                  placeholder="Rationale"
                  rows={3}
                  value={chair.rationale}
                  onChange={(e) => setChair({ ...chair, rationale: e.target.value })}
                />
                <label className="flex items-center gap-2 text-xs text-black/60">
                  <input
                    type="checkbox"
                    checked={chair.publish}
                    onChange={(e) => setChair({ ...chair, publish: e.target.checked })}
                  />
                  Publish now (sets status = published)
                </label>
                <Button onClick={chairDecision}>Save decision</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function DocumentUpload({ dealId, onUploaded }: { dealId: string; onUploaded: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      alert("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
  }

  async function uploadFile() {
    if (!file) return;

    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      // Get startup_id for this deal
      const { data: dealData, error: dealError } = await supabase
        .from("deals")
        .select("startup_id")
        .eq("id", dealId)
        .single();

      if (dealError || !dealData) {
        throw new Error("Failed to fetch deal: " + (dealError?.message || "Not found"));
      }

      // Upload file to storage
      const fileName = `${dealId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("deal-docs")
        .upload(fileName, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw new Error("Failed to upload file: " + uploadError.message);

      // Create document record
      const { error: docError } = await supabase.from("documents").insert({
        deal_id: dealId,
        startup_id: dealData.startup_id,
        storage_path: fileName,
        file_name: file.name,
        visibility: "internal",
        uploaded_by_user_id: uid,
        created_by: uid,
        created_at: new Date().toISOString(),
      });

      if (docError) throw new Error("Failed to create document record: " + docError.message);

      alert("Document uploaded successfully!");
      setFile(null);
      await onUploaded();
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-black/10 bg-white/50 p-4 backdrop-blur">
      <div className="space-y-3">
        <div className="text-xs font-semibold text-black/70">Upload Pitch Deck</div>

        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
          id={`upload-${dealId}`}
        />

        {!file ? (
          <label
            htmlFor={`upload-${dealId}`}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-black/10 bg-white/70 px-4 py-3 text-sm font-medium hover:bg-white/90"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Choose PDF (max 10MB)
          </label>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-white/70 p-3">
              <div>
                <div className="text-sm font-medium">{file.name}</div>
                <div className="text-xs text-black/50">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-xs text-black/60 hover:text-black"
              >
                Remove
              </button>
            </div>

            <button
              onClick={uploadFile}
              disabled={uploading}
              className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DocRow({ doc }: { doc: any }) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      // Get signed URL for private bucket
      const { data, error } = await supabase.storage
        .from("deal-docs")
        .createSignedUrl(doc.storage_path, 3600); // Valid for 1 hour

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Failed to generate download link");
      }

      // Open in new tab
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      console.error("Download error:", e);
      alert("Failed to download: " + (e.message || String(e)));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/50 p-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
        <div>
          <div className="text-sm font-medium">{doc.file_name}</div>
          <div className="text-xs text-black/50">
            {doc.visibility} • {new Date(doc.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      <button
        className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-medium hover:bg-black/10 disabled:opacity-50"
        onClick={download}
        disabled={downloading}
      >
        {downloading ? "Loading..." : "Download"}
      </button>
    </div>
  );
}

// Reusable AI Recommendation Display Component
function AIRecommendationDisplay({ dealId }: { dealId: string }) {
  const [recommendation, setRecommendation] = useState<{score: number; recommendation: string; rationale: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecommendation() {
      try {
        const { data: aiRec } = await supabase
          .from("ai_recommendations")
          .select("score,recommendation_text,rationale")
          .eq("deal_id", dealId)
          .maybeSingle();

        if (aiRec) {
          setRecommendation({
            score: aiRec.score,
            recommendation: aiRec.recommendation_text,
            rationale: aiRec.rationale,
          });
        }
      } catch (e) {
        console.error("Failed to load AI recommendation:", e);
      } finally {
        setLoading(false);
      }
    }

    loadRecommendation();
  }, [dealId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/50 p-4 backdrop-blur">
        <div className="text-sm text-black/60">Loading AI recommendation...</div>
      </div>
    );
  }

  if (!recommendation) {
    return null;
  }

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-blue-900">🤖 AI Recommendation</div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${
              recommendation.score >= 80 ? "text-green-600" :
              recommendation.score >= 60 ? "text-orange-600" :
              recommendation.score >= 40 ? "text-yellow-600" :
              "text-red-600"
            }`}>
              {recommendation.score}
            </div>
            <div className="text-sm text-black/50">/ 100</div>
          </div>
        </div>

        {/* Visual meter */}
        <div className="relative h-3 rounded-full bg-gray-200 overflow-hidden mb-3">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-500 ${
              recommendation.score >= 80 ? "bg-gradient-to-r from-green-400 to-green-600" :
              recommendation.score >= 60 ? "bg-gradient-to-r from-orange-400 to-orange-600" :
              recommendation.score >= 40 ? "bg-gradient-to-r from-yellow-400 to-yellow-600" :
              "bg-gradient-to-r from-red-400 to-red-600"
            }`}
            style={{ width: `${recommendation.score}%` }}
          />
        </div>

        {/* Score thresholds */}
        <div className="grid grid-cols-4 gap-1 text-xs mb-3">
          <div className={`text-center p-1.5 rounded ${recommendation.score < 40 ? "bg-red-100 text-red-800 font-semibold" : "text-black/40"}`}>
            &lt;40: Reject
          </div>
          <div className={`text-center p-1.5 rounded ${recommendation.score >= 40 && recommendation.score < 60 ? "bg-yellow-100 text-yellow-800 font-semibold" : "text-black/40"}`}>
            40-59: More Info
          </div>
          <div className={`text-center p-1.5 rounded ${recommendation.score >= 60 && recommendation.score < 80 ? "bg-orange-100 text-orange-800 font-semibold" : "text-black/40"}`}>
            60-79: Deep Dive
          </div>
          <div className={`text-center p-1.5 rounded ${recommendation.score >= 80 ? "bg-green-100 text-green-800 font-semibold" : "text-black/40"}`}>
            80+: Recommend
          </div>
        </div>

        {/* Recommendation text */}
        <div className={`p-3 rounded-xl mb-3 ${
          recommendation.score >= 80 ? "bg-green-50 border border-green-200" :
          recommendation.score >= 60 ? "bg-orange-50 border border-orange-200" :
          recommendation.score >= 40 ? "bg-yellow-50 border border-yellow-200" :
          "bg-red-50 border border-red-200"
        }`}>
          <div className="text-sm font-medium mb-1">
            {recommendation.recommendation}
          </div>
        </div>

        {/* Rationale (collapsible) */}
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-700 hover:text-blue-900 font-medium mb-2">
            View detailed rationale
          </summary>
          <div className="mt-2 p-3 bg-white/80 rounded-xl border border-black/10 text-black/70 whitespace-pre-wrap leading-relaxed">
            {recommendation.rationale}
          </div>
        </details>
      </div>
    </div>
  );
}

function FullScreeningReport({ report }: { report: any }) {
  const reportData = report.report_data;
  const deal = reportData.deal;
  const screening = reportData.screening;
  const flags = reportData.flags;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">📊 Full Screening Report</div>
            <div className="text-xs text-black/60">
              Complete analysis from dealflow manager • {report.report_type === "approved" ? "✅ Approved" : "❌ Rejected"}
            </div>
          </div>
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            Score: {screening.overall_score ?? "—"} / 5.0
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* AI Recommendation - Show to IC members and IC chair */}
          <AIRecommendationDisplay dealId={reportData.deal.id} />
          {/* Executive Summary */}
          {screening.summary_memo && (
            <div className="rounded-xl border border-black/10 bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-4 backdrop-blur">
              <div className="text-xs font-semibold text-black/70 mb-2">📝 Executive Summary</div>
              <div className="text-sm text-black/80 whitespace-pre-wrap leading-relaxed">
                {screening.summary_memo}
              </div>
            </div>
          )}

          {/* Criteria Scores */}
          {screening.scores && screening.scores.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-black/70 mb-3">📈 Detailed Criteria Scores</div>
              <div className="space-y-3">
                {screening.scores.map((score: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-black/10 bg-white/70 p-3 backdrop-blur">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{score.criterion?.name || "Criterion"}</div>
                        {score.criterion?.description && (
                          <div className="text-xs text-black/60 mt-0.5">{score.criterion.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-black/50">Weight: {score.criterion?.weight || 1}</div>
                        <Badge className={`${
                          score.score >= 4 ? "bg-green-50 text-green-700 border-green-200" :
                          score.score >= 3 ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {score.score}/5
                        </Badge>
                      </div>
                    </div>
                    {score.note && (
                      <div className="text-sm text-black/70 mt-2 pl-3 border-l-2 border-black/10">
                        {score.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Green Flags */}
          {flags?.green_flags && flags.green_flags.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-black/70 mb-3">
                🟢 Green Flags ({flags.green_flags.length})
              </div>
              <div className="space-y-2">
                {flags.green_flags.map((flag: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-green-200 bg-green-50/50 p-3 backdrop-blur">
                    <div className="text-sm font-medium text-green-900">{flag.flag}</div>
                    {flag.note && (
                      <div className="text-xs text-green-700/80 mt-1">{flag.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red Flags */}
          {flags?.red_flags && flags.red_flags.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-black/70 mb-3">
                🔴 Red Flags ({flags.red_flags.length})
              </div>
              <div className="space-y-2">
                {flags.red_flags.map((flag: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-red-200 bg-red-50/50 p-3 backdrop-blur">
                    <div className="text-sm font-medium text-red-900">{flag.flag}</div>
                    {flag.note && (
                      <div className="text-xs text-red-700/80 mt-1">{flag.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision Rationale */}
          {report.decision_rationale && (
            <div className="rounded-xl border border-black/10 bg-black/5 p-4 backdrop-blur">
              <div className="text-xs font-semibold text-black/70 mb-2">💭 Decision Rationale</div>
              <div className="text-sm text-black/80 whitespace-pre-wrap">
                {report.decision_rationale}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-black/50 pt-3 border-t border-black/10">
            <div>Report Type: <span className="font-medium text-black/70">{report.report_type}</span></div>
            <div>Decided At: <span className="font-medium text-black/70">
              {new Date(report.decided_at).toLocaleString()}
            </span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveScreeningDetails({ dealId }: { dealId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScreeningDetails() {
      try {
        // Fetch screening scores with criteria
        const { data: scores } = await supabase
          .from("screening_scores")
          .select(`
            id,score,note,
            criterion:criterion_id(name,description,weight)
          `)
          .eq("deal_id", dealId);

        // Fetch screening review
        const { data: review } = await supabase
          .from("screening_reviews")
          .select("id,overall_score,decision,summary_memo")
          .eq("deal_id", dealId)
          .maybeSingle();

        // Fetch flags
        const { data: flags } = await supabase
          .from("deal_flags")
          .select("id,green_flags,red_flags")
          .eq("deal_id", dealId)
          .maybeSingle();

        setData({
          scores: scores || [],
          review: review || null,
          flags: flags || null,
        });
      } catch (e) {
        console.error("Failed to load screening details:", e);
      } finally {
        setLoading(false);
      }
    }

    loadScreeningDetails();
  }, [dealId]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="text-sm text-black/60">Loading screening details...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.scores.length === 0 && !data.review)) {
    return null; // No screening data available
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">📊 Screening Analysis</div>
            <div className="text-xs text-black/60">
              Dealflow manager's detailed screening analysis
            </div>
          </div>
          {data.review?.overall_score && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
              Score: {data.review.overall_score} / 5.0
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* AI Recommendation - Show to IC members and IC chair */}
          <AIRecommendationDisplay dealId={dealId} />
          {/* Executive Summary */}
          {data.review?.summary_memo && (
            <div className="rounded-xl border border-black/10 bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-4 backdrop-blur">
              <div className="text-xs font-semibold text-black/70 mb-2">📝 Executive Summary</div>
              <div className="text-sm text-black/80 whitespace-pre-wrap leading-relaxed">
                {data.review.summary_memo}
              </div>
            </div>
          )}

          {/* Criteria Scores */}
          {data.scores && data.scores.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-black/70 mb-3">📈 Detailed Criteria Scores</div>
              <div className="space-y-3">
                {data.scores.map((score: any) => (
                  <div key={score.id} className="rounded-xl border border-black/10 bg-white/70 p-3 backdrop-blur">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{score.criterion?.name || "Criterion"}</div>
                        {score.criterion?.description && (
                          <div className="text-xs text-black/60 mt-0.5">{score.criterion.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-black/50">Weight: {score.criterion?.weight || 1}</div>
                        <Badge className={`${
                          score.score >= 4 ? "bg-green-50 text-green-700 border-green-200" :
                          score.score >= 3 ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {score.score}/5
                        </Badge>
                      </div>
                    </div>
                    {score.note && (
                      <div className="text-sm text-black/70 mt-2 pl-3 border-l-2 border-black/10">
                        {score.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Green Flags */}
          {data.flags?.green_flags && data.flags.green_flags.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-black/70 mb-3">
                🟢 Green Flags ({data.flags.green_flags.length})
              </div>
              <div className="space-y-2">
                {data.flags.green_flags.map((flag: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-green-200 bg-green-50/50 p-3 backdrop-blur">
                    <div className="text-sm font-medium text-green-900">{flag.flag}</div>
                    {flag.note && (
                      <div className="text-xs text-green-700/80 mt-1">{flag.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red Flags */}
          {data.flags?.red_flags && data.flags.red_flags.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-black/70 mb-3">
                🔴 Red Flags ({data.flags.red_flags.length})
              </div>
              <div className="space-y-2">
                {data.flags.red_flags.map((flag: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-red-200 bg-red-50/50 p-3 backdrop-blur">
                    <div className="text-sm font-medium text-red-900">{flag.flag}</div>
                    {flag.note && (
                      <div className="text-xs text-red-700/80 mt-1">{flag.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision Status */}
          {data.review?.decision && (
            <div className="text-xs text-black/50 pt-3 border-t border-black/10">
              <div>Decision Status: <span className="font-medium text-black/70 capitalize">{data.review.decision}</span></div>
              {!data.review.screening_completed_at && (
                <div className="mt-1 text-yellow-700">⚠️ Screening not yet finalized by dealflow manager</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScreeningEditor({ dealId, onSaved }: { dealId: string; onSaved: () => Promise<void> }) {
  const [criteria, setCriteria] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, { score: number; note: string }>>({});
  const [decision, setDecision] = useState<"approve"|"reject"|"needs_info">("needs_info");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiRecommending, setAiRecommending] = useState(false);
  const [recommendation, setRecommendation] = useState<{score: number; recommendation: string; rationale: string} | null>(null);
  const [finalDecisionModal, setFinalDecisionModal] = useState<"approve"|"reject"|null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [screeningCompleted, setScreeningCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;

      const { data: c } = await supabase
        .from("screening_criteria")
        .select("id,name,description,weight,is_active,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      setCriteria(c ?? []);

      const { data: s } = await supabase
        .from("screening_scores")
        .select("criterion_id,score,note")
        .eq("deal_id", dealId)
        .eq("manager_user_id", uid);

      const next: Record<string, { score: number; note: string }> = {};
      (s ?? []).forEach((row: any) => {
        next[row.criterion_id] = { score: row.score, note: row.note ?? "" };
      });
      setScores(next);

      const { data: r } = await supabase
        .from("screening_reviews")
        .select("decision,summary_memo")
        .eq("deal_id", dealId)
        .eq("manager_user_id", uid)
        .maybeSingle();

      if (r?.decision) setDecision(r.decision);
      if (r?.summary_memo) setMemo(r.summary_memo);

      // Check if screening is finalized
      const { data: deal } = await supabase
        .from("deals")
        .select("screening_completed_at")
        .eq("id", dealId)
        .single();

      if (deal?.screening_completed_at) {
        setScreeningCompleted(true);
      }

      // Fetch existing AI recommendation
      const { data: aiRec } = await supabase
        .from("ai_recommendations")
        .select("score,recommendation_text,rationale")
        .eq("deal_id", dealId)
        .maybeSingle();

      if (aiRec) {
        setRecommendation({
          score: aiRec.score,
          recommendation: aiRec.recommendation_text,
          rationale: aiRec.rationale,
        });
      }
    })();
  }, [dealId]);

  function computeOverall() {
    if (!criteria.length) return null;
    let num = 0;
    let den = 0;
    for (const c of criteria) {
      const w = Number(c.weight ?? 1);
      const v = Number(scores[c.id]?.score ?? 3);
      num += w * v;
      den += w;
    }
    return den ? Math.round((num / den) * 100) / 100 : null;
  }

  async function aiScreen() {
    setAiScanning(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess.session?.access_token;
      if (!jwt) throw new Error("Not authenticated");

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      console.log("Supabase URL from env:", supabaseUrl);
      console.log("JWT token present:", !!jwt);

      const url = `${supabaseUrl}/functions/v1/ai-screen-deal`;
      console.log("Calling AI function:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ deal_id: dealId }),
      });

      console.log("AI function response status:", res.status);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("AI function error:", data);
        throw new Error(data.error || `AI screening failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log("AI function success:", data);

      // Populate scores with AI results
      const nextScores: Record<string, { score: number; note: string }> = {};
      data.criteria_scores.forEach((c: any) => {
        nextScores[c.criterion_id] = {
          score: c.score,
          note: c.note,
        };
      });
      setScores(nextScores);

      // Set the overall assessment as the memo
      if (data.overall_assessment) {
        setMemo(data.overall_assessment);
      }

      alert("AI screening complete! Review and adjust scores as needed.");
    } catch (e: any) {
      console.error("AI screening error:", e);
      const errorMsg = e.message || String(e);

      if (errorMsg.includes("Failed to fetch") || errorMsg === "Failed to fetch") {
        alert("Network error: Unable to reach AI service. Check browser console for details.\n\nPossible causes:\n- Edge function not responding\n- CORS issue\n- Network timeout");
      } else {
        alert(`AI screening failed: ${errorMsg}`);
      }
    } finally {
      setAiScanning(false);
    }
  }

  async function aiRecommend() {
    setAiRecommending(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess.session?.access_token;
      if (!jwt) throw new Error("Not authenticated");

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-recommend-deal`;
      console.log("Calling AI Recommender:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ deal_id: dealId }),
      });

      console.log("AI Recommender response status:", res.status);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("AI Recommender error:", data);
        throw new Error(data.error || `AI recommendation failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log("AI Recommender success:", data);

      setRecommendation({
        score: data.score,
        recommendation: data.recommendation,
        rationale: data.rationale,
      });

      alert("AI Recommendation generated successfully!");
    } catch (e: any) {
      console.error("AI recommendation error:", e);
      alert(`AI recommendation failed: ${e.message || String(e)}`);
    } finally {
      setAiRecommending(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) throw new Error("Not logged in");

      // upsert 7 scores
      const payloadScores = criteria.map((c) => ({
        deal_id: dealId,
        manager_user_id: uid,
        criterion_id: c.id,
        score: Number(scores[c.id]?.score ?? 3),
        note: scores[c.id]?.note || null,
      }));

      const { error: sErr } = await supabase
        .from("screening_scores")
        .upsert(payloadScores, { onConflict: "deal_id,manager_user_id,criterion_id" });

      if (sErr) throw sErr;

      const overall = computeOverall();

      const { error: rErr } = await supabase
        .from("screening_reviews")
        .upsert(
          {
            deal_id: dealId,
            manager_user_id: uid,
            overall_score: overall,
            decision,
            summary_memo: memo || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "deal_id,manager_user_id" }
        );

      if (rErr) throw rErr;

      await onSaved();
      alert("Screening saved.");
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function finalizeScreening(finalDecision: "approve" | "reject") {
    setFinalizing(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess.session?.access_token;
      if (!jwt) throw new Error("Not authenticated");

      // First save current screening data
      await save();

      // Call edge function to generate report and finalize
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/finalize-screening`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          deal_id: dealId,
          decision: finalDecision,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || "Failed to finalize screening");
      }

      const data = await res.json();
      console.log("Screening finalized:", data);

      setScreeningCompleted(true);
      setFinalDecisionModal(null);
      await onSaved();

      if (finalDecision === "approve") {
        alert("✅ Screening approved! Deal sent to IC for review. Report generated.");
      } else {
        alert("❌ Screening rejected. Deal archived with report. PDF report generated.");
      }
    } catch (e: any) {
      alert(`Failed to finalize: ${e.message}`);
    } finally {
      setFinalizing(false);
    }
  }

  const overall = computeOverall();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Screening (7 criteria)</div>
            <div className="text-xs text-black/60">
              Score each criterion 1–5 and save a memo + decision.
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={aiScreen}
              disabled={aiScanning}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {aiScanning ? "AI Analyzing..." : "AI Screen Pitch Deck"}
            </Button>
            <Button
              variant="primary"
              onClick={aiRecommend}
              disabled={aiRecommending || !memo || criteria.length === 0}
              className="flex items-center gap-2"
              title="Generate AI recommendation based on all screening data"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {aiRecommending ? "Analyzing..." : "AI Recommender"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* AI Recommendation Meter */}
        {recommendation && (
          <div className="mb-6 rounded-2xl overflow-hidden border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-blue-900">AI Recommendation</div>
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-bold ${
                    recommendation.score >= 80 ? "text-green-600" :
                    recommendation.score >= 60 ? "text-orange-600" :
                    recommendation.score >= 40 ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {recommendation.score}
                  </div>
                  <div className="text-sm text-black/50">/ 100</div>
                </div>
              </div>

              {/* Visual meter */}
              <div className="relative h-3 rounded-full bg-gray-200 overflow-hidden mb-3">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                    recommendation.score >= 80 ? "bg-gradient-to-r from-green-400 to-green-600" :
                    recommendation.score >= 60 ? "bg-gradient-to-r from-orange-400 to-orange-600" :
                    recommendation.score >= 40 ? "bg-gradient-to-r from-yellow-400 to-yellow-600" :
                    "bg-gradient-to-r from-red-400 to-red-600"
                  }`}
                  style={{ width: `${recommendation.score}%` }}
                />
              </div>

              {/* Score thresholds */}
              <div className="grid grid-cols-4 gap-1 text-xs mb-3">
                <div className={`text-center p-1.5 rounded ${recommendation.score < 40 ? "bg-red-100 text-red-800 font-semibold" : "text-black/40"}`}>
                  &lt;40: Reject
                </div>
                <div className={`text-center p-1.5 rounded ${recommendation.score >= 40 && recommendation.score < 60 ? "bg-yellow-100 text-yellow-800 font-semibold" : "text-black/40"}`}>
                  40-59: More Info
                </div>
                <div className={`text-center p-1.5 rounded ${recommendation.score >= 60 && recommendation.score < 80 ? "bg-orange-100 text-orange-800 font-semibold" : "text-black/40"}`}>
                  60-79: Deep Dive
                </div>
                <div className={`text-center p-1.5 rounded ${recommendation.score >= 80 ? "bg-green-100 text-green-800 font-semibold" : "text-black/40"}`}>
                  80+: Recommend
                </div>
              </div>

              {/* Recommendation text */}
              <div className={`p-3 rounded-xl mb-3 ${
                recommendation.score >= 80 ? "bg-green-50 border border-green-200" :
                recommendation.score >= 60 ? "bg-orange-50 border border-orange-200" :
                recommendation.score >= 40 ? "bg-yellow-50 border border-yellow-200" :
                "bg-red-50 border border-red-200"
              }`}>
                <div className="text-sm font-medium mb-1">
                  {recommendation.recommendation}
                </div>
              </div>

              {/* Rationale (collapsible) */}
              <details className="text-sm">
                <summary className="cursor-pointer text-blue-700 hover:text-blue-900 font-medium mb-2">
                  View detailed rationale
                </summary>
                <div className="mt-2 p-3 bg-white/80 rounded-xl border border-black/10 text-black/70 whitespace-pre-wrap leading-relaxed">
                  {recommendation.rationale}
                </div>
              </details>
            </div>
          </div>
        )}

        {criteria.length === 0 ? (
          <div className="text-sm text-black/60">
            No criteria found. Seed the <code>screening_criteria</code> table with 7 rows.
          </div>
        ) : (
          <div className="space-y-3">
            {criteria.map((c) => {
              const v = scores[c.id]?.score ?? 3;
              return (
                <div key={c.id} className="rounded-2xl border border-black/10 bg-white/50 p-3 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{c.name}</div>
                      {c.description ? (
                        <div className="mt-1 text-xs text-black/60">{c.description}</div>
                      ) : null}
                    </div>
                    <div className="text-xs text-black/50">Weight: {c.weight ?? 1}</div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={v}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [c.id]: { score: Number(e.target.value), note: prev[c.id]?.note ?? "" },
                        }))
                      }
                      className="w-full"
                    />
                    <div className="w-10 text-right text-sm font-medium">{v}</div>
                  </div>

                  <Textarea
                    className="mt-2"
                    rows={5}
                    placeholder="AI will write detailed analysis notes here"
                    value={scores[c.id]?.note ?? ""}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [c.id]: { score: prev[c.id]?.score ?? 3, note: e.target.value },
                      }))
                    }
                  />
                </div>
              );
            })}

            <div className="rounded-2xl border border-black/10 bg-white/50 p-3 backdrop-blur">
              <div className="text-xs text-black/60">Overall score (weighted)</div>
              <div className="text-lg font-semibold">{overall ?? "—"}</div>

              <div className="mt-3 space-y-2">
                <select
                  className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm backdrop-blur"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as any)}
                >
                  <option value="approve">Approve</option>
                  <option value="needs_info">Needs info</option>
                  <option value="reject">Reject</option>
                </select>

                <Textarea
                  rows={4}
                  placeholder="Screening memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />

                <Button onClick={save} disabled={saving || screeningCompleted}>
                  {saving ? "Saving…" : "Save screening"}
                </Button>

                {/* Final Decision Buttons */}
                {!screeningCompleted && (
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-black/10 pt-4">
                    <div className="col-span-2 text-xs text-black/60 mb-2">
                      ⚠️ Final decision will close screening and generate report
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setFinalDecisionModal("reject")}
                      disabled={finalizing}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    >
                      ❌ Reject Deal
                    </Button>
                    <Button
                      onClick={() => setFinalDecisionModal("approve")}
                      disabled={finalizing}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      ✅ Approve to IC
                    </Button>
                  </div>
                )}

                {screeningCompleted && (
                  <div className="mt-4 rounded-lg bg-black/5 p-3 text-center">
                    <div className="text-sm font-medium">
                      ✓ Screening completed and report generated
                    </div>
                    <div className="text-xs text-black/60 mt-1">
                      Screening is closed. Report available for IC review.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {finalDecisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <div className="text-lg font-semibold">
                  {finalDecisionModal === "approve" ? "✅ Approve to IC?" : "❌ Reject Deal?"}
                </div>
                <div className="mt-2 text-sm text-black/60">
                  {finalDecisionModal === "approve" ? (
                    <>
                      This will:
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        <li>Close screening (no more edits)</li>
                        <li>Generate IC report with all analysis</li>
                        <li>Send deal to IC queue for review</li>
                        <li>Make report accessible to IC members</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      This will:
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        <li>Close screening (no more edits)</li>
                        <li>Generate PDF report</li>
                        <li>Archive deal as rejected</li>
                        <li>Report accessible to dealflow/IC/admin only</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setFinalDecisionModal(null)}
                  disabled={finalizing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => finalizeScreening(finalDecisionModal)}
                  disabled={finalizing}
                  className="flex-1"
                >
                  {finalizing ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

