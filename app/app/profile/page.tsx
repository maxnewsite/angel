"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";

type ProfileData = any;

export default function ProfileSettings() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    linkedin_url: "",
    location: "",
    company: "",
    title: "",
    bio: "",
    investor_type: "",
    accredited_investor: false,
    investment_experience_years: "",
    portfolio_size: "",
    typical_ticket_size: "",
    preferred_sectors: [] as string[],
    preferred_stages: [] as string[],
    preferred_geographies: [] as string[],
    founder_experience: "",
    previous_exits: "",
    specializations: [] as string[],
    education: [] as string[],
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;

      if (!uid) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        linkedin_url: data.linkedin_url || "",
        location: data.location || "",
        company: data.company || "",
        title: data.title || "",
        bio: data.bio || "",
        investor_type: data.investor_type || "",
        accredited_investor: data.accredited_investor || false,
        investment_experience_years: data.investment_experience_years?.toString() || "",
        portfolio_size: data.portfolio_size || "",
        typical_ticket_size: data.typical_ticket_size?.toString() || "",
        preferred_sectors: data.preferred_sectors || [],
        preferred_stages: data.preferred_stages || [],
        preferred_geographies: data.preferred_geographies || [],
        founder_experience: data.founder_experience || "",
        previous_exits: data.previous_exits?.toString() || "",
        specializations: data.specializations || [],
        education: data.education || [],
      });
    } catch (e) {
      console.error("Load profile error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (JPG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be less than 2MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      // Upload to Supabase Storage with user folder structure
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${uid}/${fileName}`; // Store in user-specific folder

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", uid);

      if (updateError) throw updateError;

      // Reload profile
      await loadProfile();
      alert("Profile picture updated successfully!");
    } catch (e: any) {
      console.error("Avatar upload error:", e);
      alert("Failed to upload avatar: " + (e.message || "Unknown error"));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const updateData: any = {
        full_name: formData.full_name,
        phone: formData.phone,
        linkedin_url: formData.linkedin_url,
        location: formData.location,
        company: formData.company,
        title: formData.title,
        bio: formData.bio,
        updated_at: new Date().toISOString(),
      };

      // Add role-specific fields
      if (profile?.role === "investor") {
        updateData.investor_type = formData.investor_type;
        updateData.accredited_investor = formData.accredited_investor;
        updateData.investment_experience_years = formData.investment_experience_years
          ? parseInt(formData.investment_experience_years)
          : null;
        updateData.portfolio_size = formData.portfolio_size;
        updateData.typical_ticket_size = formData.typical_ticket_size
          ? parseFloat(formData.typical_ticket_size)
          : null;
        updateData.preferred_sectors = formData.preferred_sectors;
        updateData.preferred_stages = formData.preferred_stages;
        updateData.preferred_geographies = formData.preferred_geographies;
      } else if (profile?.role === "founder") {
        updateData.founder_experience = formData.founder_experience;
        updateData.previous_exits = formData.previous_exits ? parseInt(formData.previous_exits) : 0;
        updateData.specializations = formData.specializations;
        updateData.education = formData.education;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", uid);

      if (error) throw error;

      await loadProfile();
      alert("Profile updated successfully!");
    } catch (e: any) {
      console.error("Save profile error:", e);
      alert("Failed to save profile: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).includes(item)
        ? (prev[field as keyof typeof prev] as string[]).filter((i) => i !== item)
        : [...(prev[field as keyof typeof prev] as string[]), item],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-2xl font-semibold">Profile Settings</div>
        <div className="text-sm text-black/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">Profile Settings</div>
          <div className="text-sm text-black/60">
            Manage your profile information and preferences
          </div>
        </div>
        {profile?.profile_completeness !== undefined && (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            {profile.profile_completeness}% Complete
          </Badge>
        )}
      </div>

      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <div className="text-sm font-semibold">Profile Picture</div>
          <div className="text-xs text-black/60">Upload a photo to personalize your account</div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Avatar Display */}
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Profile"}
                  className="h-24 w-24 rounded-full object-cover border-2 border-black/10"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-2 border-black/10">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
                disabled={uploadingAvatar}
              />
              <label
                htmlFor="avatar-upload"
                className="inline-block cursor-pointer rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50"
              >
                {uploadingAvatar ? "Uploading..." : "Change Picture"}
              </label>
              <div className="text-xs text-black/60 mt-2">
                JPG, PNG, WebP or GIF. Max 2MB.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <div className="text-sm font-semibold">Basic Information</div>
          <div className="text-xs text-black/60">Your personal and professional details</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Input value={profile?.email || ""} disabled className="bg-black/5" />
              </div>
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
                <label className="text-xs font-medium text-black/70">Location</label>
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
          </div>
        </CardContent>
      </Card>

      {/* Investor-Specific Fields */}
      {profile?.role === "investor" && (
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Investor Profile</div>
            <div className="text-xs text-black/60">Your investment preferences and experience</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black/70">Investor Type</label>
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
                  <label className="text-xs font-medium text-black/70">Typical Ticket Size ($)</label>
                  <Input
                    type="number"
                    value={formData.typical_ticket_size}
                    onChange={(e) => updateFormData("typical_ticket_size", e.target.value)}
                    placeholder="50000"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.accredited_investor}
                    onChange={(e) => updateFormData("accredited_investor", e.target.checked)}
                  />
                  Accredited Investor
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 block mb-2">Preferred Sectors</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Fintech", "AI", "Healthcare", "SaaS", "E-commerce", "Biotech", "CleanTech", "Cybersecurity"].map(
                    (sector) => (
                      <label
                        key={sector}
                        className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.preferred_sectors.includes(sector)}
                          onChange={() => toggleArrayItem("preferred_sectors", sector)}
                        />
                        {sector}
                      </label>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 block mb-2">Preferred Stages</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Pre-Seed", "Seed", "Series A", "Series B", "Series C+", "Growth"].map((stage) => (
                    <label
                      key={stage}
                      className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer"
                    >
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
                  {["North America", "Europe", "Asia", "Latin America", "Middle East", "Africa"].map((geo) => (
                    <label
                      key={geo}
                      className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer"
                    >
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Founder-Specific Fields */}
      {profile?.role === "founder" && (
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Founder Profile</div>
            <div className="text-xs text-black/60">Your entrepreneurial background</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black/70">Founder Experience</label>
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
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 block mb-2">Specializations</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Product", "Engineering", "Sales", "Marketing", "Operations", "Finance", "Design", "Data"].map(
                    (spec) => (
                      <label
                        key={spec}
                        className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.specializations.includes(spec)}
                          onChange={() => toggleArrayItem("specializations", spec)}
                        />
                        {spec}
                      </label>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-black/70 block mb-2">Education</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Bachelor's", "Master's", "MBA", "PhD", "Bootcamp", "Self-taught"].map((edu) => (
                    <label
                      key={edu}
                      className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-black/5 cursor-pointer"
                    >
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={loadProfile} disabled={saving}>
          Reset
        </Button>
        <Button onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
