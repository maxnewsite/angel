"use client";
import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in and set initial mode from query params
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/onboarding");
      }
    }

    // Set mode from query parameter
    const modeParam = searchParams.get("mode");
    if (modeParam === "signup") {
      setMode("signup");
    }

    checkAuth();
  }, [router, searchParams]);

  async function submit() {
    setMsg(null);
    setLoading(true);

    try {
      if (!email || !password) {
        setMsg("Email and password required.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`
          }
        });

        if (error) {
          setMsg(error.message);
          return;
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
          setMsg("Check your email for confirmation link.");
          return;
        }

        // If session exists, create profile
        if (data.session && data.user) {
          // Ensure profile exists
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            role: null,
            created_at: new Date().toISOString()
          }, { onConflict: "id" });

          setMsg("Account created! Redirecting...");
          setTimeout(() => router.push("/onboarding"), 1000);
          return;
        }

        setMsg("Account created. Please sign in.");
        setMode("signin");
        return;
      }

      // Sign in mode
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg(error.message);
        return;
      }

      if (data.session) {
        setMsg("Signed in! Redirecting...");
        // Small delay to ensure session is properly set
        setTimeout(() => router.push("/onboarding"), 500);
      }
    } catch (e: any) {
      setMsg(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <Card>
        <CardHeader>
          <div className="text-lg font-semibold">Welcome</div>
          <div className="text-sm text-black/60">Sign in to continue or create an account.</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            {msg ? <div className="text-xs text-black/60">{msg}</div> : null}

            <div className="flex gap-2">
              <Button onClick={submit} disabled={loading}>
                {loading ? "Loading..." : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                disabled={loading}
              >
                {mode === "signin" ? "Create account" : "Have an account"}
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}
