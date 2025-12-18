"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { INTERNAL_ROLES, type AppRole } from "@/lib/roles";

type Expert = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  location: string;
  title: string;
  company: string;
  bio: string;
  years_of_experience: number;
  seniority: string;
  primary_domain: any;
  expertise_domain_ids: string[];
  industries: string[];
  technical_skills: string[];
  availability_status: string;
  hourly_rate: number;
  preferred_engagement_types: string[];
  deals_consulted: number;
  rating_average: number;
  total_ratings: number;
};

type ExpertiseDomain = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export default function ExpertsPage() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [domains, setDomains] = useState<ExpertiseDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedSeniority, setSelectedSeniority] = useState<string>("all");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Get current user role
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).single();
        setRole((p?.role as AppRole) ?? null);
      }

      // Load expertise domains
      const { data: domainsData } = await supabase
        .from("expertise_domains")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      setDomains(domainsData || []);

      // Load experts with their primary domain
      const { data: expertsData } = await supabase
        .from("experts")
        .select(`
          *,
          primary_domain:primary_domain_id(id,name,description,category)
        `)
        .eq("is_active", true)
        .order("rating_average", { ascending: false, nullsFirst: false });

      setExperts(expertsData || []);
    } catch (error) {
      console.error("Error loading experts:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredExperts = experts.filter((expert) => {
    // Domain filter
    if (selectedDomain !== "all" && expert.primary_domain?.id !== selectedDomain) {
      return false;
    }

    // Seniority filter
    if (selectedSeniority !== "all" && expert.seniority !== selectedSeniority) {
      return false;
    }

    // Availability filter
    if (selectedAvailability !== "all" && expert.availability_status !== selectedAvailability) {
      return false;
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        expert.full_name.toLowerCase().includes(query) ||
        expert.title?.toLowerCase().includes(query) ||
        expert.company?.toLowerCase().includes(query) ||
        expert.bio?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const isAdmin = role === "admin";

  if (loading) {
    return <div className="text-sm text-black/60">Loading experts...</div>;
  }

  if (!role || !INTERNAL_ROLES.includes(role)) {
    return <div className="text-sm text-black/60">Access denied. Internal roles only.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">Expert Network</h1>
          <p className="text-sm text-black/60 mt-1">
            Subject Matter Experts available for deal evaluation and advisory
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expert
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-black/60">Total Experts</div>
            <div className="text-2xl font-semibold text-blue-900 mt-1">{experts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-black/60">Available Now</div>
            <div className="text-2xl font-semibold text-green-600 mt-1">
              {experts.filter((e) => e.availability_status === "available").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-black/60">Expertise Domains</div>
            <div className="text-2xl font-semibold text-blue-900 mt-1">{domains.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-black/60">Total Consultations</div>
            <div className="text-2xl font-semibold text-blue-900 mt-1">
              {experts.reduce((sum, e) => sum + (e.deals_consulted || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-xs text-black/60 mb-1 block">Search</label>
              <Input
                placeholder="Name, title, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-black/60 mb-1 block">Expertise Domain</label>
              <select
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
              >
                <option value="all">All Domains</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-black/60 mb-1 block">Seniority</label>
              <select
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedSeniority}
                onChange={(e) => setSelectedSeniority(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="principal">Principal</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-black/60 mb-1 block">Availability</label>
              <select
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedAvailability}
                onChange={(e) => setSelectedAvailability(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="limited">Limited Availability</option>
                <option value="busy">Busy</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-black/60">
        Showing {filteredExperts.length} of {experts.length} experts
      </div>

      {/* Expert Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredExperts.map((expert) => (
          <ExpertCard key={expert.id} expert={expert} onUpdate={loadData} isAdmin={isAdmin} />
        ))}
      </div>

      {filteredExperts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-sm text-black/60">
              No experts found matching your filters.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Expert Modal */}
      {showAddModal && isAdmin && (
        <AddExpertModal
          domains={domains}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function ExpertCard({ expert, onUpdate, isAdmin }: { expert: Expert; onUpdate: () => void; isAdmin: boolean }) {
  const [showDetails, setShowDetails] = useState(false);

  const availabilityColors = {
    available: "bg-green-50 text-green-700 border-green-200",
    limited: "bg-yellow-50 text-yellow-700 border-yellow-200",
    busy: "bg-orange-50 text-orange-700 border-orange-200",
    unavailable: "bg-red-50 text-red-700 border-red-200",
  };

  const seniorityLabels = {
    junior: "Junior",
    mid: "Mid-Level",
    senior: "Senior",
    principal: "Principal",
    executive: "Executive",
  };

  return (
    <Card className="hover:shadow-xl transition-all">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="font-semibold text-blue-900">{expert.full_name}</div>
            <div className="text-xs text-black/60 mt-1">{expert.title}</div>
            {expert.company && (
              <div className="text-xs text-black/50 mt-0.5">@ {expert.company}</div>
            )}
          </div>
          <Badge className={availabilityColors[expert.availability_status as keyof typeof availabilityColors] || "bg-gray-50 text-gray-700 border-gray-200"}>
            {expert.availability_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Primary Domain */}
          {expert.primary_domain && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">{expert.primary_domain.name}</span>
            </div>
          )}

          {/* Seniority */}
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm text-black/70">{seniorityLabels[expert.seniority as keyof typeof seniorityLabels]}</span>
            {expert.years_of_experience && (
              <span className="text-xs text-black/50">• {expert.years_of_experience} yrs exp</span>
            )}
          </div>

          {/* Rating */}
          {expert.rating_average && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`h-4 w-4 ${i < Math.round(expert.rating_average) ? "text-yellow-500" : "text-gray-300"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-black/60">
                {expert.rating_average.toFixed(1)} ({expert.total_ratings} reviews)
              </span>
            </div>
          )}

          {/* Consultations */}
          <div className="flex items-center gap-2 text-xs text-black/60">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {expert.deals_consulted} deal{expert.deals_consulted !== 1 ? "s" : ""} consulted
          </div>

          {/* Bio preview */}
          {expert.bio && (
            <div className="text-sm text-black/70 line-clamp-2 pt-2 border-t border-black/10">
              {expert.bio}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1 text-xs"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Hide Details" : "View Details"}
            </Button>
            {expert.email && (
              <Button
                variant="ghost"
                className="text-xs"
                onClick={() => window.location.href = `mailto:${expert.email}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </Button>
            )}
            {expert.linkedin_url && (
              <Button
                variant="ghost"
                className="text-xs"
                onClick={() => window.open(expert.linkedin_url, "_blank")}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </Button>
            )}
          </div>

          {/* Expanded Details */}
          {showDetails && (
            <div className="pt-3 border-t border-black/10 space-y-3 text-sm">
              {expert.location && (
                <div>
                  <div className="text-xs font-semibold text-black/60">Location</div>
                  <div className="text-black/70">{expert.location}</div>
                </div>
              )}

              {expert.industries && expert.industries.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-black/60 mb-1">Industries</div>
                  <div className="flex flex-wrap gap-1">
                    {expert.industries.map((industry, i) => (
                      <Badge key={i} className="text-xs">{industry}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {expert.technical_skills && expert.technical_skills.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-black/60 mb-1">Technical Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {expert.technical_skills.slice(0, 5).map((skill, i) => (
                      <Badge key={i} className="text-xs bg-blue-50 text-blue-700 border-blue-200">{skill}</Badge>
                    ))}
                    {expert.technical_skills.length > 5 && (
                      <Badge className="text-xs">+{expert.technical_skills.length - 5} more</Badge>
                    )}
                  </div>
                </div>
              )}

              {expert.preferred_engagement_types && expert.preferred_engagement_types.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-black/60 mb-1">Engagement Types</div>
                  <div className="text-xs text-black/70">
                    {expert.preferred_engagement_types.join(", ")}
                  </div>
                </div>
              )}

              {expert.hourly_rate && (
                <div>
                  <div className="text-xs font-semibold text-black/60">Hourly Rate</div>
                  <div className="text-black/70">${expert.hourly_rate}/hour</div>
                </div>
              )}

              {expert.phone && (
                <div>
                  <div className="text-xs font-semibold text-black/60">Phone</div>
                  <div className="text-black/70">{expert.phone}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AddExpertModal({
  domains,
  onClose,
  onSuccess,
}: {
  domains: ExpertiseDomain[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    location: "",
    title: "",
    company: "",
    bio: "",
    years_of_experience: "",
    seniority: "senior",
    primary_domain_id: "",
    industries: "",
    technical_skills: "",
    availability_status: "available",
    hourly_rate: "",
    preferred_engagement_types: "",
  });

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;

      const payload = {
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        linkedin_url: formData.linkedin_url || null,
        location: formData.location || null,
        title: formData.title || null,
        company: formData.company || null,
        bio: formData.bio || null,
        years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null,
        seniority: formData.seniority,
        primary_domain_id: formData.primary_domain_id || null,
        industries: formData.industries ? formData.industries.split(",").map((s) => s.trim()) : [],
        technical_skills: formData.technical_skills ? formData.technical_skills.split(",").map((s) => s.trim()) : [],
        availability_status: formData.availability_status,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        preferred_engagement_types: formData.preferred_engagement_types
          ? formData.preferred_engagement_types.split(",").map((s) => s.trim())
          : [],
        added_by_user_id: uid,
        is_active: true,
      };

      const { error } = await supabase.from("experts").insert(payload);

      if (error) throw error;

      alert("Expert added successfully!");
      onSuccess();
    } catch (error: any) {
      alert("Error adding expert: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-blue-900">Add New Expert</h2>
            <button type="button" onClick={onClose} className="text-black/40 hover:text-black">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Full Name *</label>
              <Input
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Former CTO at Google"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Company</label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-black/70 block mb-1">Bio</label>
            <Textarea
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Professional background and expertise..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Years of Experience</label>
              <Input
                type="number"
                value={formData.years_of_experience}
                onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Seniority *</label>
              <select
                required
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm outline-none"
                value={formData.seniority}
                onChange={(e) => setFormData({ ...formData, seniority: e.target.value })}
              >
                <option value="junior">Junior</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="principal">Principal</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Availability</label>
              <select
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm outline-none"
                value={formData.availability_status}
                onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
              >
                <option value="available">Available</option>
                <option value="limited">Limited</option>
                <option value="busy">Busy</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-black/70 block mb-1">Primary Expertise Domain</label>
            <select
              className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm outline-none"
              value={formData.primary_domain_id}
              onChange={(e) => setFormData({ ...formData, primary_domain_id: e.target.value })}
            >
              <option value="">Select domain...</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., San Francisco, CA"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">LinkedIn URL</label>
              <Input
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-black/70 block mb-1">Hourly Rate ($)</label>
              <Input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-black/70 block mb-1">Industries (comma-separated)</label>
            <Input
              value={formData.industries}
              onChange={(e) => setFormData({ ...formData, industries: e.target.value })}
              placeholder="e.g., Fintech, B2B SaaS, Healthcare"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-black/70 block mb-1">Technical Skills (comma-separated)</label>
            <Input
              value={formData.technical_skills}
              onChange={(e) => setFormData({ ...formData, technical_skills: e.target.value })}
              placeholder="e.g., Python, TensorFlow, AWS, Product Strategy"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-black/70 block mb-1">
              Preferred Engagement Types (comma-separated)
            </label>
            <Input
              value={formData.preferred_engagement_types}
              onChange={(e) => setFormData({ ...formData, preferred_engagement_types: e.target.value })}
              placeholder="e.g., advisory, technical_review, due_diligence"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Adding..." : "Add Expert"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
