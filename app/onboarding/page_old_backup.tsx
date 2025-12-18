"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function Onboarding() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id;

        if (!uid) {
          router.push("/auth");
          return;
        }

        // Ensure profile exists
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();

        if (profileError && profileError.code === "PGRST116") {
          // Profile doesn't exist, create it
          await supabase.from("profiles").insert({
            id: uid,
            email: data.session?.user?.email,
            role: null,
            created_at: new Date().toISOString()
          });
        }

        if (!mounted) return;

        setCurrent(profile?.role ?? null);

        // If already internal role, go directly to app
        if (profile?.role && ["admin", "dealflow_manager", "ic_member", "ic_chair"].includes(profile.role)) {
          router.push("/app/deals");
          return;
        }

        // If already has investor/founder role, pre-select it
        if (profile?.role && ["investor", "founder"].includes(profile.role)) {
          setRole(profile.role);
        }

        setLoading(false);
      } catch (e) {
        console.error("Onboarding load error:", e);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function save() {
    if (!role) return;
    setSaving(true);

    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) {
        router.push("/auth");
        return;
      }

      const { error } = await supabase.from("profiles").update({ role }).eq("id", uid);
      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }

      // Small delay to ensure state propagates
      setTimeout(() => router.push("/app/deals"), 300);
    } catch (e: any) {
      console.error("Save role error:", e);
      alert("Failed to save role: " + (e.message || "Unknown error"));
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-14">
        <div className="text-center text-sm text-black/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="mb-6">
        <div className="text-2xl font-semibold">Choose your role</div>
        <div className="text-sm text-black/60">Internal roles are assigned by the admin.</div>
        {current ? <div className="mt-2 text-xs text-black/50">Current role: {current}</div> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { key: "investor", title: "Investor", desc: "Browse published deals and express interest." },
          { key: "founder", title: "Founder", desc: "Create a startup profile and submit deals for screening." },
        ].map((x) => (
          <Card
            key={x.key}
            className={"cursor-pointer transition hover:translate-y-[-1px] " + (role === x.key ? "ring-2 ring-[rgb(var(--ring))]" : "")}
            onClick={() => setRole(x.key)}
          >
            <CardHeader>
              <div className="text-sm font-semibold">{x.title}</div>
              <div className="mt-1 text-xs text-black/60">{x.desc}</div>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={save} disabled={!role || saving}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
