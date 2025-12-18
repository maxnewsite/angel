"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type OnboardingStep = "email_verification" | "role_selection" | "basic_info" | "investor_profile" | "founder_profile" | "preferences" | "complete";

export default function OnboardingNew() {
  const router = useRouter();

  // Step management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("email_verification");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User state
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  // Profile data
  const [role, setRole] = useState<string>("");
  const [formData, setFormData] = useState({
    // Basic information
    full_name: "",
    phone: "",
    linkedin_url: "",
    location: "",
    company: "",
    title: "",
    bio: "",

    // Investor-specific
    investor_type: "",
    accredited_investor: false,
    investment_experience_years: "",
    portfolio_size: "",
    typical_ticket_size: "",
    preferred_sectors: [] as string[],
    preferred_stages: [] as string[],
    preferred_geographies: [] as string[],

    // Founder-specific
    founder_experience: "",
    previous_exits: "",
    specializations: [] as string[],
    education: [] as string[],

    // Compliance
    terms_accepted: false,
    privacy_policy_accepted: false,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      const email = session.session?.user?.email;

      if (!uid) {
        router.push("/auth");
        return;
      }

      setUserId(uid);
      setUserEmail(email || null);

      // Check email verification from Supabase Auth
      const emailConfirmed = session.session?.user?.email_confirmed_at;
      setEmailVerified(!!emailConfirmed);

      // Load existing profile data
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist, create it
        await supabase.from("profiles").insert({
          id: uid,
          email: email,
          created_at: new Date().toISOString()
        });
      } else if (profile) {
        // Check if already onboarded
        if (profile.onboarding_completed) {
          router.push("/app/deals");
          return;
        }

        // Pre-fill form with existing data
        setRole(profile.role || "");
        setFormData(prev => ({
          ...prev,
          full_name: profile.full_name || "",
          phone: profile.phone || "",
          linkedin_url: profile.linkedin_url || "",
          location: profile.location || "",
          company: profile.company || "",
          title: profile.title || "",
          bio: profile.bio || "",
          investor_type: profile.investor_type || "",
          accredited_investor: profile.accredited_investor || false,
          investment_experience_years: profile.investment_experience_years?.toString() || "",
          portfolio_size: profile.portfolio_size || "",
          typical_ticket_size: profile.typical_ticket_size?.toString() || "",
          preferred_sectors: profile.preferred_sectors || [],
          preferred_stages: profile.preferred_stages || [],
          preferred_geographies: profile.preferred_geographies || [],
          founder_experience: profile.founder_experience || "",
          previous_exits: profile.previous_exits?.toString() || "",
          specializations: profile.specializations || [],
          education: profile.education || [],
        }));

        // Determine which step to show
        if (!emailConfirmed) {
          setCurrentStep("email_verification");
        } else if (!profile.role) {
          setCurrentStep("role_selection");
        } else if (!profile.full_name) {
          setCurrentStep("basic_info");
        } else if (profile.role === "investor" && !profile.investor_type) {
          setCurrentStep("investor_profile");
        } else if (profile.role === "founder" && !profile.founder_experience) {
          setCurrentStep("founder_profile");
        } else {
          setCurrentStep("preferences");
        }
      }

      setLoading(false);
    } catch (e) {
      console.error("Load user data error:", e);
      setLoading(false);
    }
  }

  async function resendVerificationEmail() {
    try {
      setSaving(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail!,
      });

      if (error) {
        alert("Failed to resend email: " + error.message);
      } else {
        alert("Verification email sent! Please check your inbox.");
      }
    } catch (e: any) {
      alert("Error: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveRoleSelection() {
    if (!role) {
      alert("Please select a role");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", userId!);

      if (error) throw error;

      setCurrentStep("basic_info");
    } catch (e: any) {
      alert("Error saving role: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveBasicInfo() {
    if (!formData.full_name || !formData.location) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          linkedin_url: formData.linkedin_url,
          location: formData.location,
          company: formData.company,
          title: formData.title,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId!);

      if (error) throw error;

      if (role === "investor") {
        setCurrentStep("investor_profile");
      } else if (role === "founder") {
        setCurrentStep("founder_profile");
      } else {
        setCurrentStep("preferences");
      }
    } catch (e: any) {
      alert("Error saving profile: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveInvestorProfile() {
    if (!formData.investor_type || formData.preferred_sectors.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          investor_type: formData.investor_type,
          accredited_investor: formData.accredited_investor,
          investment_experience_years: formData.investment_experience_years ? parseInt(formData.investment_experience_years) : null,
          portfolio_size: formData.portfolio_size,
          typical_ticket_size: formData.typical_ticket_size ? parseFloat(formData.typical_ticket_size) : null,
          preferred_sectors: formData.preferred_sectors,
          preferred_stages: formData.preferred_stages,
          preferred_geographies: formData.preferred_geographies,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId!);

      if (error) throw error;

      setCurrentStep("preferences");
    } catch (e: any) {
      alert("Error saving investor profile: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveFounderProfile() {
    if (!formData.founder_experience) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          founder_experience: formData.founder_experience,
          previous_exits: formData.previous_exits ? parseInt(formData.previous_exits) : 0,
          specializations: formData.specializations,
          education: formData.education,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId!);

      if (error) throw error;

      setCurrentStep("preferences");
    } catch (e: any) {
      alert("Error saving founder profile: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function completeOnboarding() {
    if (!formData.terms_accepted || !formData.privacy_policy_accepted) {
      alert("Please accept the terms and privacy policy");
      return;
    }

    setSaving(true);
    try {
      // Update profile with compliance data
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          terms_accepted: formData.terms_accepted,
          terms_accepted_at: new Date().toISOString(),
          privacy_policy_accepted: formData.privacy_policy_accepted,
          privacy_policy_accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", userId!);

      if (profileError) throw profileError;

      // Mark onboarding as complete
      const { error: completionError } = await supabase.rpc("complete_onboarding", {
        user_id: userId!
      });

      if (completionError) throw completionError;

      setCurrentStep("complete");
      setTimeout(() => router.push("/app/deals"), 2000);
    } catch (e: any) {
      alert("Error completing onboarding: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleArrayItem = (field: keyof typeof formData, item: string) => {
    setFormData((prev) => {
      const current = prev[field];
      const currentArray = Array.isArray(current) ? current : [];

      const nextArray = currentArray.includes(item)
        ? currentArray.filter((i) => i !== item)
        : [...currentArray, item];

      return {
        ...prev,
        [field]: nextArray,
      };
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-14">
        <div className="text-center text-sm text-black/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="text-xs text-black/60 mb-2">Registration Progress</div>
        <div className="h-2 bg-black/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
            style={{
              width: `${
                currentStep === "email_verification" ? 10 :
                currentStep === "role_selection" ? 25 :
                currentStep === "basic_info" ? 50 :
                currentStep === "investor_profile" || currentStep === "founder_profile" ? 75 :
                currentStep === "preferences" ? 90 :
                100
              }%`
            }}
          />
        </div>
      </div>

      {/* Step: Email Verification */}
      {currentStep === "email_verification" && (
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold">📧 Verify Your Email</div>
            <div className="text-sm text-black/60">
              Please check your inbox and verify your email address to continue.
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-4">
                <div className="text-sm font-medium text-yellow-900">Email verification required</div>
                <div className="text-xs text-yellow-700 mt-1">
                  We sent a verification email to <strong>{userEmail}</strong>
                </div>
              </div>

              <div className="text-sm text-black/70">
                <strong>Steps:</strong>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Check your inbox for the verification email</li>
                  <li>Click the verification link in the email</li>
                  <li>Return here and click "I've Verified My Email"</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => loadUserData()}>
                  I've Verified My Email
                </Button>
                <Button
                  variant="secondary"
                  onClick={resendVerificationEmail}
                  disabled={saving}
                >
                  {saving ? "Sending..." : "Resend Email"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Role Selection */}
      {currentStep === "role_selection" && (
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold">Choose Your Role</div>
            <div className="text-sm text-black/60">
              Select the role that best describes you. Internal roles are assigned by admins.
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              {[
                {
                  key: "investor",
                  title: "Investor",
                  desc: "Browse published deals, express interest, and invest in startups.",
                  icon: "💰"
                },
                {
                  key: "founder",
                  title: "Founder",
                  desc: "Create startup profiles and submit deals for screening and funding.",
                  icon: "🚀"
                },
              ].map((x) => (
                <div
                  key={x.key}
                  className={`cursor-pointer rounded-2xl border-2 p-6 transition hover:scale-[1.02] ${
                    role === x.key ? "border-blue-500 bg-blue-50/50" : "border-black/10 hover:border-black/20"
                  }`}
                  onClick={() => setRole(x.key)}
                >
                  <div className="text-3xl mb-3">{x.icon}</div>
                  <div className="text-sm font-semibold mb-1">{x.title}</div>
                  <div className="text-xs text-black/60">{x.desc}</div>
                </div>
              ))}
            </div>

            <Button onClick={saveRoleSelection} disabled={!role || saving}>
              {saving ? "Saving..." : "Continue"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Basic Information */}
      {currentStep === "basic_info" && (
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold">Basic Information</div>
            <div className="text-sm text-black/60">
              Tell us about yourself. This information helps us personalize your experience.
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-black/70">Full Name *</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => updateFormData("full_name", e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-black/70">Email</label>
                <Input
                  value={userEmail || ""}
                  disabled
                  className="bg-black/5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black/70">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-black/70">Location *</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => updateFormData("location", e.target.value)}
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black/70">Company</label>
                  <Input
                    value={formData.company}
                    onChange={(e) => updateFormData("company", e.target.value)}
                    placeholder="Acme Ventures"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-black/70">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => updateFormData("title", e.target.value)}
                    placeholder="Managing Partner"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70">LinkedIn Profile</label>
                <Input
                  value={formData.linkedin_url}
                  onChange={(e) => updateFormData("linkedin_url", e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-black/70">Bio</label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => updateFormData("bio", e.target.value)}
                  placeholder="Brief professional background..."
                  rows={4}
                />
              </div>

              <Button onClick={saveBasicInfo} disabled={saving}>
                {saving ? "Saving..." : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Investor Profile */}
      {currentStep === "investor_profile" && (
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold">Investor Profile</div>
            <div className="text-sm text-black/60">
              Help us understand your investment preferences and experience.
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-black/70">Investor Type *</label>
                <select
                  className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                  value={formData.investor_type}
                  onChange={(e) => updateFormData("investor_type", e.target.value)}
                >
                  <option value="">Select type...</option>
                  <option value="angel">Angel Investor</option>
                  <option value="vc">Venture Capital</option>
                  <option value="family_office">Family Office</option>
                  <option value="institutional">Institutional</option>
                  <option value="corporate">Corporate Venture</option>
                  <option value="syndicate">Syndicate</option>
                  <option value="individual">Individual</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black/70">Investment Experience (years)</label>
                  <Input
                    type="number"
                    value={formData.investment_experience_years}
                    onChange={(e) => updateFormData("investment_experience_years", e.target.value)}
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-black/70">Portfolio Size</label>
                  <select
                    className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                    value={formData.portfolio_size}
                    onChange={(e) => updateFormData("portfolio_size", e.target.value)}
                  >
                    <option value="">Select size...</option>
                    <option value="0-5">0-5 companies</option>
                    <option value="5-10">5-10 companies</option>
                    <option value="10-25">10-25 companies</option>
                    <option value="25-50">25-50 companies</option>
                    <option value="50+">50+ companies</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70">Typical Ticket Size ($)</label>
                <Input
                  type="number"
                  value={formData.typical_ticket_size}
                  onChange={(e) => updateFormData("typical_ticket_size", e.target.value)}
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.accredited_investor}
                    onChange={(e) => updateFormData("accredited_investor", e.target.checked)}
                  />
                  I am an accredited investor
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 block mb-2">Preferred Sectors *</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Fintech", "AI", "Healthcare", "SaaS", "E-commerce", "Biotech", "CleanTech", "Cybersecurity"].map(sector => (
                    <label key={sector} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferred_sectors.includes(sector)}
                        onChange={() => toggleArrayItem("preferred_sectors", sector)}
                      />
                      {sector}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 block mb-2">Preferred Stages</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Pre-Seed", "Seed", "Series A", "Series B", "Series C+", "Growth"].map(stage => (
                    <label key={stage} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferred_stages.includes(stage)}
                        onChange={() => toggleArrayItem("preferred_stages", stage)}
                      />
                      {stage}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 block mb-2">Preferred Geographies</label>
                <div className="grid grid-cols-2 gap-2">
                  {["North America", "Europe", "Asia", "Latin America", "Middle East", "Africa"].map(geo => (
                    <label key={geo} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferred_geographies.includes(geo)}
                        onChange={() => toggleArrayItem("preferred_geographies", geo)}
                      />
                      {geo}
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={saveInvestorProfile} disabled={saving}>
                {saving ? "Saving..." : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Founder Profile */}
      {currentStep === "founder_profile" && (
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold">Founder Profile</div>
            <div className="text-sm text-black/60">
              Tell us about your entrepreneurial background.
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-black/70">Founder Experience *</label>
                <select
                  className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                  value={formData.founder_experience}
                  onChange={(e) => updateFormData("founder_experience", e.target.value)}
                >
                  <option value="">Select experience...</option>
                  <option value="first_time">First-time Founder</option>
                  <option value="serial">Serial Entrepreneur</option>
                  <option value="previously_exited">Previously Exited</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70">Previous Exits</label>
                <Input
                  type="number"
                  value={formData.previous_exits}
                  onChange={(e) => updateFormData("previous_exits", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 block mb-2">Specializations</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Product", "Engineering", "Sales", "Marketing", "Operations", "Finance", "Design", "Data"].map(spec => (
                    <label key={spec} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.specializations.includes(spec)}
                        onChange={() => toggleArrayItem("specializations", spec)}
                      />
                      {spec}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 block mb-2">Education</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Bachelor's", "Master's", "MBA", "PhD", "Bootcamp", "Self-taught"].map(edu => (
                    <label key={edu} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.education.includes(edu)}
                        onChange={() => toggleArrayItem("education", edu)}
                      />
                      {edu}
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={saveFounderProfile} disabled={saving}>
                {saving ? "Saving..." : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preferences & Compliance */}
      {currentStep === "preferences" && (
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold">Terms & Completion</div>
            <div className="text-sm text-black/60">
              Review and accept our terms to complete your registration.
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
                <div className="text-sm font-medium text-green-900 mb-2">
                  ✓ Profile Almost Complete
                </div>
                <div className="text-xs text-green-700">
                  Just accept the terms and you're ready to go!
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 text-sm p-3 rounded-lg border border-black/10 hover:bg-black/5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={formData.terms_accepted}
                    onChange={(e) => updateFormData("terms_accepted", e.target.checked)}
                  />
                  <div>
                    <div className="font-medium">Terms of Service *</div>
                    <div className="text-xs text-black/60 mt-0.5">
                      I accept the <a href="/terms" target="_blank" className="text-blue-600 hover:underline">Terms of Service</a>
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 text-sm p-3 rounded-lg border border-black/10 hover:bg-black/5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={formData.privacy_policy_accepted}
                    onChange={(e) => updateFormData("privacy_policy_accepted", e.target.checked)}
                  />
                  <div>
                    <div className="font-medium">Privacy Policy *</div>
                    <div className="text-xs text-black/60 mt-0.5">
                      I accept the <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</a>
                    </div>
                  </div>
                </label>
              </div>

              <Button
                onClick={completeOnboarding}
                disabled={!formData.terms_accepted || !formData.privacy_policy_accepted || saving}
              >
                {saving ? "Completing..." : "Complete Registration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete */}
      {currentStep === "complete" && (
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <div className="text-xl font-semibold mb-2">Welcome Aboard!</div>
              <div className="text-sm text-black/60 mb-4">
                Your registration is complete. Redirecting to the platform...
              </div>
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
