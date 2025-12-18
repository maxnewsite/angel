import { corsHeaders, maybeHandleCors } from "../_shared/cors.ts";
import { adminClient, requireRole } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = maybeHandleCors(req);
  if (cors) return cors;

  try {
    const { user } = await requireRole(req, ["admin", "dealflow_manager"]);

    const { deal_id, decision } = await req.json();
    const dealId = String(deal_id ?? "");
    const finalDecision = decision as "approve" | "reject";

    if (!dealId || !finalDecision) {
      return new Response(JSON.stringify({ error: "deal_id and decision required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["approve", "reject"].includes(finalDecision)) {
      return new Response(JSON.stringify({ error: "decision must be 'approve' or 'reject'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Finalizing screening for deal ${dealId} with decision: ${finalDecision}`);

    // Fetch complete deal data
    const { data: deal, error: dealErr } = await adminClient
      .from("deals")
      .select(`
        id,
        status,
        startup:startup_id(name,sector,description,hq_location,team_summary,traction_summary),
        round_type,
        target_amount,
        valuation,
        instrument,
        highlights,
        risks,
        use_of_funds,
        created_at
      `)
      .eq("id", dealId)
      .single();

    if (dealErr || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch screening scores
    const { data: scores } = await adminClient
      .from("screening_scores")
      .select(`
        score,
        note,
        criterion:criterion_id(name,description,weight)
      `)
      .eq("deal_id", dealId)
      .eq("manager_user_id", user.id);

    // Fetch screening review
    const { data: review } = await adminClient
      .from("screening_reviews")
      .select("overall_score,decision,summary_memo")
      .eq("deal_id", dealId)
      .eq("manager_user_id", user.id)
      .maybeSingle();

    // Fetch flags
    const { data: flags } = await adminClient
      .from("deal_flags")
      .select("green_flags,red_flags")
      .eq("deal_id", dealId)
      .eq("manager_user_id", user.id)
      .maybeSingle();

    // Build report data
    const reportData = {
      deal: {
        id: deal.id,
        startup_name: deal.startup?.name,
        sector: deal.startup?.sector,
        description: deal.startup?.description,
        hq_location: deal.startup?.hq_location,
        team_summary: deal.startup?.team_summary,
        traction_summary: deal.startup?.traction_summary,
        round_type: deal.round_type,
        target_amount: deal.target_amount,
        valuation: deal.valuation,
        instrument: deal.instrument,
        highlights: deal.highlights,
        risks: deal.risks,
        use_of_funds: deal.use_of_funds,
      },
      screening: {
        scores: scores || [],
        overall_score: review?.overall_score,
        decision: review?.decision,
        summary_memo: review?.summary_memo,
      },
      flags: {
        green_flags: flags?.green_flags || [],
        red_flags: flags?.red_flags || [],
      },
      metadata: {
        manager_user_id: user.id,
        decided_at: new Date().toISOString(),
        final_decision: finalDecision,
      },
    };

    console.log("Report data compiled");

    // Store screening report
    const { error: reportErr } = await adminClient
      .from("screening_reports")
      .insert({
        deal_id: dealId,
        manager_user_id: user.id,
        report_type: finalDecision === "approve" ? "approved" : "rejected",
        report_data: reportData,
        decision_rationale: review?.summary_memo || null,
        decided_at: new Date().toISOString(),
      });

    if (reportErr) {
      console.error("Failed to create report:", reportErr);
      throw new Error("Failed to create screening report");
    }

    console.log("Screening report created");

    // Update deal status and mark screening as completed
    let newStatus = deal.status;
    if (finalDecision === "approve") {
      newStatus = "ic_in_review";
    } else {
      newStatus = "screening_rejected";
    }

    const { error: updateErr } = await adminClient
      .from("deals")
      .update({
        status: newStatus,
        screening_completed_at: new Date().toISOString(),
        screening_decision: finalDecision === "approve" ? "approved" : "rejected",
      })
      .eq("id", dealId);

    if (updateErr) {
      console.error("Failed to update deal:", updateErr);
      throw new Error("Failed to update deal status");
    }

    console.log(`Deal status updated to: ${newStatus}`);

    // For rejected deals, generate PDF report
    let pdfPath = null;
    if (finalDecision === "reject") {
      // TODO: Generate PDF using a PDF library or external service
      // For now, we'll just create a markdown-style report
      const markdown = generateReportMarkdown(reportData);
      console.log("Report markdown generated (PDF generation pending)");
      // In a real implementation, you would:
      // 1. Convert markdown to PDF
      // 2. Upload to storage
      // 3. Update screening_reports with pdf_storage_path
    }

    return new Response(JSON.stringify({
      ok: true,
      decision: finalDecision,
      new_status: newStatus,
      report_generated: true,
      pdf_path: pdfPath,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Finalize screening error:", e);
    const errorMessage = e?.message || String(e);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateReportMarkdown(reportData: any): string {
  const d = reportData.deal;
  const s = reportData.screening;
  const f = reportData.flags;

  return `# Screening Report: ${d.startup_name}

## Deal Overview
- **Startup**: ${d.startup_name}
- **Sector**: ${d.sector || "N/A"}
- **Location**: ${d.hq_location || "N/A"}
- **Round**: ${d.round_type || "N/A"}
- **Target**: $${d.target_amount || "N/A"}
- **Valuation**: $${d.valuation || "N/A"}
- **Instrument**: ${d.instrument || "N/A"}

## Company Description
${d.description || "N/A"}

## Team Summary
${d.team_summary || "N/A"}

## Traction Summary
${d.traction_summary || "N/A"}

## Screening Analysis

### Overall Score: ${s.overall_score || "N/A"} / 5.0

### Criteria Scores
${s.scores.map((score: any) => `
**${score.criterion?.name}** (Weight: ${score.criterion?.weight})
- Score: ${score.score}/5
- Analysis: ${score.note || "No notes"}
`).join("\n")}

### Summary Memo
${s.summary_memo || "No memo provided"}

## Red/Green Flags

### 🟢 Green Flags (${f.green_flags.length})
${f.green_flags.map((flag: any) => `
- **${flag.flag}**
  ${flag.note}
`).join("\n")}

### 🔴 Red Flags (${f.red_flags.length})
${f.red_flags.map((flag: any) => `
- **${flag.flag}**
  ${flag.note}
`).join("\n")}

## Deal Details

### Highlights
${d.highlights || "N/A"}

### Risks
${d.risks || "N/A"}

### Use of Funds
${d.use_of_funds || "N/A"}

---
**Final Decision**: ${reportData.metadata.final_decision.toUpperCase()}
**Decided At**: ${new Date(reportData.metadata.decided_at).toLocaleString()}
`;
}
