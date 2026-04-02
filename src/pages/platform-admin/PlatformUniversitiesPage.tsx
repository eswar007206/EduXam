import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  ClipboardCheck,
  Code2,
  FileText,
  Globe,
  GraduationCap,
  LineChart,
  Loader2,
  Mail,
  MapPin,
  Paintbrush,
  Phone,
  Plus,
  Save,
  UserCircle,
  UserSearch,
} from "lucide-react";
import {
  createUniversity,
  createUniversityDepartment,
  createUniversityDomain,
  deleteUniversityDomain,
  getDeveloperUniversityShells,
  getUniversityById,
  getUniversityDepartments,
  updateUniversity,
  type DeveloperUniversityShell,
  type UniversityWithMeta,
} from "@/services/adminPortalService";
import { useAuth } from "@/context/AuthContext";
import type {
  DepartmentRow,
  OrganizationFeatureSettings,
  OrganizationType,
} from "@/lib/database.types";
import {
  DEFAULT_ORGANIZATION_FEATURES,
  getOrganizationTypeLabel,
  normalizeOrganizationFeatures,
} from "@/lib/organizationFeatures";
import { EXAM_PORTAL_LABEL } from "@/lib/portalLabels";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type DeveloperOrganizationFormState = {
  name: string;
  short_name: string;
  organization_type: OrganizationType;
  organization_features: OrganizationFeatureSettings;
};

const ORGANIZATION_TYPE_OPTIONS: Array<{ value: OrganizationType; label: string }> = [
  { value: "university", label: "University" },
  { value: "tech_company", label: "Tech Company" },
  { value: "coaching_center", label: "Coaching Center" },
  { value: "enterprise", label: "Enterprise" },
  { value: "other", label: "Other" },
];

const NAVBAR_FEATURE_OPTIONS: Array<{
  key: keyof OrganizationFeatureSettings["navbar"];
  label: string;
  description: string;
  icon: typeof UserSearch;
}> = [
  {
    key: "find_teachers",
    label: "Find Teachers",
    description: "Show or hide the student Find Teachers navigation entry.",
    icon: UserSearch,
  },
  {
    key: "my_results",
    label: "My Results",
    description: "Show or hide the student results workspace.",
    icon: ClipboardCheck,
  },
  {
    key: "practice",
    label: "Practice",
    description: "Control the prep exam tab and related practice CTA copy.",
    icon: GraduationCap,
  },
  {
    key: "jobs",
    label: "Jobs",
    description: "Show or hide the student jobs board entry.",
    icon: Briefcase,
  },
  {
    key: "my_profile",
    label: "My Profile",
    description: "Show or hide the student profile entry in the avatar dropdown.",
    icon: UserCircle,
  },
];

const EXAM_TOOL_OPTIONS: Array<{
  key: keyof OrganizationFeatureSettings["exam_portal"];
  label: string;
  description: string;
  icon: typeof Paintbrush;
}> = [
  {
    key: "drawing_canvas",
    label: "Drawing Canvas",
    description: "Allow students to open the drawing canvas while answering questions.",
    icon: Paintbrush,
  },
  {
    key: "code_compiler",
    label: "Code Compiler",
    description: "Allow students to attach inline code editor/compiler answers.",
    icon: Code2,
  },
  {
    key: "graph_calculator",
    label: "Graph Calculator",
    description: "Allow students to open the graphing calculator tool in the exam editor.",
    icon: LineChart,
  },
];

export default function PlatformUniversitiesPage() {
  const { profile } = useAuth();
  const isDeveloper = profile?.role === "developer";
  const [universities, setUniversities] = useState<DeveloperUniversityShell[]>([]);
  const [currentUniversity, setCurrentUniversity] = useState<UniversityWithMeta | null>(null);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [organizationForms, setOrganizationForms] = useState<Record<string, DeveloperOrganizationFormState>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingOrganizationId, setSavingOrganizationId] = useState<string | null>(null);
  const [domainSubmitting, setDomainSubmitting] = useState(false);
  const [departmentSubmitting, setDepartmentSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [developerForm, setDeveloperForm] = useState({
    name: "",
    short_name: "",
    organization_type: "university" as OrganizationType,
  });
  const [adminForm, setAdminForm] = useState({
    name: "",
    short_name: "",
    website: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    notes: "",
  });
  const [domainDrafts, setDomainDrafts] = useState<Record<string, string>>({});
  const [departmentDraft, setDepartmentDraft] = useState("");

  const load = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      setErrorMessage("");

      if (isDeveloper) {
        const organizationRows = await getDeveloperUniversityShells();
        setUniversities(organizationRows);
        setCurrentUniversity(null);
        setDepartments([]);
        setOrganizationForms(
          organizationRows.reduce<Record<string, DeveloperOrganizationFormState>>((accumulator, organization) => {
            accumulator[organization.id] = {
              name: organization.name,
              short_name: organization.short_name ?? "",
              organization_type: organization.organization_type,
              organization_features: normalizeOrganizationFeatures(organization.organization_features),
            };
            return accumulator;
          }, {})
        );
        return;
      }

      if (!profile.university_id) {
        setErrorMessage("This admin account is not linked to an organization yet.");
        setCurrentUniversity(null);
        setDepartments([]);
        return;
      }

      const [university, universityDepartments] = await Promise.all([
        getUniversityById(profile.university_id),
        getUniversityDepartments(profile.university_id),
      ]);

      setCurrentUniversity(university);
      setDepartments(universityDepartments);
      if (university) {
        setAdminForm({
          name: university.name ?? "",
          short_name: university.short_name ?? "",
          website: university.website ?? "",
          contact_email: university.contact_email ?? "",
          contact_phone: university.contact_phone ?? "",
          address: university.address ?? "",
          notes: university.notes ?? "",
        });
      }
    } catch (error) {
      console.error("Failed to load organization portal data:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load the organization view right now."
      );
    } finally {
      setLoading(false);
    }
  }, [isDeveloper, profile]);

  useEffect(() => {
    load();
  }, [load]);

  const canCreateUniversity = useMemo(
    () => developerForm.name.trim().length > 1,
    [developerForm.name]
  );

  const handleCreateUniversity = async () => {
    if (!profile || !canCreateUniversity) return;

    setSubmitting(true);
    try {
      await createUniversity({
        name: developerForm.name.trim(),
        slug: slugify(developerForm.name),
        short_name: developerForm.short_name.trim() || null,
        organization_type: developerForm.organization_type,
        organization_features: DEFAULT_ORGANIZATION_FEATURES,
        created_by: profile.id,
      });
      setDeveloperForm({
        name: "",
        short_name: "",
        organization_type: "university",
      });
      await load();
    } catch (error) {
      console.error("Failed to create organization:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create the organization right now."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUniversity = async () => {
    if (!currentUniversity) return;

    setSubmitting(true);
    try {
      await updateUniversity(currentUniversity.id, {
        name: adminForm.name.trim(),
        slug: slugify(adminForm.name),
        short_name: adminForm.short_name.trim() || null,
        website: adminForm.website.trim() || null,
        contact_email: adminForm.contact_email.trim() || null,
        contact_phone: adminForm.contact_phone.trim() || null,
        address: adminForm.address.trim() || null,
        notes: adminForm.notes.trim() || null,
        updated_by: profile?.id ?? null,
      });
      await load();
    } catch (error) {
      console.error("Failed to update organization:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save the organization details right now."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeveloperFieldChange = <K extends keyof DeveloperOrganizationFormState>(
    organizationId: string,
    key: K,
    value: DeveloperOrganizationFormState[K]
  ) => {
    setOrganizationForms((prev) => ({
      ...prev,
      [organizationId]: {
        ...(prev[organizationId] ?? {
          name: "",
          short_name: "",
          organization_type: "university",
          organization_features: DEFAULT_ORGANIZATION_FEATURES,
        }),
        [key]: value,
      },
    }));
  };

  const handleFeatureToggle = (
    organizationId: string,
    section: keyof OrganizationFeatureSettings,
    key: keyof OrganizationFeatureSettings["navbar"] | keyof OrganizationFeatureSettings["exam_portal"]
  ) => {
    setOrganizationForms((prev) => {
      const current = prev[organizationId];
      if (!current) return prev;

      const nextFeatures = normalizeOrganizationFeatures(current.organization_features);
      if (section === "navbar") {
        nextFeatures.navbar = {
          ...nextFeatures.navbar,
          [key]: !nextFeatures.navbar[key as keyof OrganizationFeatureSettings["navbar"]],
        };
      } else {
        nextFeatures.exam_portal = {
          ...nextFeatures.exam_portal,
          [key]: !nextFeatures.exam_portal[key as keyof OrganizationFeatureSettings["exam_portal"]],
        };
      }

      return {
        ...prev,
        [organizationId]: {
          ...current,
          organization_features: nextFeatures,
        },
      };
    });
  };

  const handleSaveOrganization = async (organizationId: string) => {
    const draft = organizationForms[organizationId];
    if (!profile || !draft || !draft.name.trim()) return;

    setSavingOrganizationId(organizationId);
    try {
      await updateUniversity(organizationId, {
        name: draft.name.trim(),
        slug: slugify(draft.name),
        short_name: draft.short_name.trim() || null,
        organization_type: draft.organization_type,
        organization_features: draft.organization_features,
        updated_by: profile.id,
      });
      await load();
    } catch (error) {
      console.error("Failed to save organization config:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save the organization settings right now."
      );
    } finally {
      setSavingOrganizationId(null);
    }
  };

  const handleAddDeveloperDomain = async (universityId: string) => {
    const draft = domainDrafts[universityId]?.trim() || "";
    if (!draft) return;

    setDomainSubmitting(true);
    try {
      await createUniversityDomain({
        university_id: universityId,
        domain: draft,
      });
      setDomainDrafts((prev) => ({
        ...prev,
        [universityId]: "",
      }));
      await load();
    } catch (error) {
      console.error("Failed to add organization domain:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to add the email domain right now."
      );
    } finally {
      setDomainSubmitting(false);
    }
  };

  const handleDeleteDeveloperDomain = async (domainId: string) => {
    setDomainSubmitting(true);
    try {
      await deleteUniversityDomain(domainId);
      await load();
    } catch (error) {
      console.error("Failed to remove organization domain:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to remove the email domain right now."
      );
    } finally {
      setDomainSubmitting(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!profile || !currentUniversity || !departmentDraft.trim()) return;

    setDepartmentSubmitting(true);
    try {
      await createUniversityDepartment({
        university_id: currentUniversity.id,
        name: departmentDraft.trim(),
        slug: slugify(departmentDraft),
        created_by: profile.id,
      });
      setDepartmentDraft("");
      await load();
    } catch (error) {
      console.error("Failed to create department:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create the department right now."
      );
    } finally {
      setDepartmentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading portal settings...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#071952]">
          {isDeveloper ? "Organizations" : "Organization Setup"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isDeveloper
            ? "Create organizations, assign official email domains, and control which student-facing features are visible for each one."
            : "Maintain your organization profile and departments from one place."}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isDeveloper ? (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#071952]">Create Organization</h2>
                <p className="text-sm text-gray-500">Add the organization shell here first, then configure domains, feature visibility, and the first admin login.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <input
                value={developerForm.name}
                onChange={(event) => setDeveloperForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Organization name"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />
              <input
                value={developerForm.short_name}
                onChange={(event) => setDeveloperForm((prev) => ({ ...prev, short_name: event.target.value }))}
                placeholder="Short name"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />
              <select
                value={developerForm.organization_type}
                onChange={(event) =>
                  setDeveloperForm((prev) => ({
                    ...prev,
                    organization_type: event.target.value as OrganizationType,
                  }))
                }
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              >
                {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCreateUniversity}
              disabled={!canCreateUniversity || submitting}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071952] text-white font-semibold disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Organization
            </button>
          </section>

          <section className="space-y-4">
            {universities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                No organizations have been created yet.
              </div>
            ) : (
              universities.map((university) => {
                const organizationForm = organizationForms[university.id] ?? {
                  name: university.name,
                  short_name: university.short_name ?? "",
                  organization_type: university.organization_type,
                  organization_features: normalizeOrganizationFeatures(university.organization_features),
                };

                return (
                  <div key={university.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-xl font-semibold text-[#071952]">{university.name}</h2>
                          <span className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                            {getOrganizationTypeLabel(organizationForm.organization_type)}
                          </span>
                          {university.short_name && (
                            <span className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              {university.short_name}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm text-gray-500">
                          Created {new Date(university.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 min-w-[250px]">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Admin handoff</p>
                        <p className="text-lg font-bold text-[#071952] mt-2">
                          {university.adminAccountCount > 0 ? "Ready" : "Pending"}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {university.adminAccountCount > 0
                            ? "Organization admin access has been issued."
                            : "Create the first organization admin login from Admin Access."}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <input
                        value={organizationForm.name}
                        onChange={(event) =>
                          handleDeveloperFieldChange(university.id, "name", event.target.value)
                        }
                        placeholder="Organization name"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                      />
                      <input
                        value={organizationForm.short_name}
                        onChange={(event) =>
                          handleDeveloperFieldChange(university.id, "short_name", event.target.value)
                        }
                        placeholder="Short name"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                      />
                      <select
                        value={organizationForm.organization_type}
                        onChange={(event) =>
                          handleDeveloperFieldChange(
                            university.id,
                            "organization_type",
                            event.target.value as OrganizationType
                          )
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                      >
                        {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-[#071952]">Official Email Domains</h3>
                            <p className="text-sm text-gray-500">Matching signups are attached to this organization as soon as a domain is added.</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <input
                            value={domainDrafts[university.id] ?? ""}
                            onChange={(event) =>
                              setDomainDrafts((prev) => ({
                                ...prev,
                                [university.id]: event.target.value,
                              }))
                            }
                            placeholder="gcu.edu.in"
                            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                          />
                          <button
                            onClick={() => handleAddDeveloperDomain(university.id)}
                            disabled={domainSubmitting || !(domainDrafts[university.id] ?? "").trim()}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071952] text-white font-semibold disabled:opacity-50"
                          >
                            {domainSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {university.domains.length === 0 ? (
                            <p className="text-sm text-gray-500">No domains assigned yet.</p>
                          ) : (
                            university.domains.map((domain) => (
                              <span
                                key={domain.id}
                                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-[#071952]"
                              >
                                @{domain.domain}
                                <button
                                  onClick={() => handleDeleteDeveloperDomain(domain.id)}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-white p-5">
                        <h3 className="text-base font-semibold text-[#071952]">Student Navbar</h3>
                        <p className="text-sm text-gray-500 mt-1">Choose which student navigation entries are available for this organization.</p>
                        <div className="mt-4 space-y-3">
                          {NAVBAR_FEATURE_OPTIONS.map((feature) => {
                            const Icon = feature.icon;
                            const enabled = organizationForm.organization_features.navbar[feature.key];
                            return (
                              <button
                                key={feature.key}
                                onClick={() => handleFeatureToggle(university.id, "navbar", feature.key)}
                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${enabled ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 rounded-xl border p-2 ${enabled ? "border-emerald-200 bg-white text-emerald-700" : "border-gray-200 bg-white text-gray-500"}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="font-semibold text-[#071952]">{feature.label}</p>
                                      <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                                        {enabled ? "Visible" : "Hidden"}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-white p-5">
                        <h3 className="text-base font-semibold text-[#071952]">{EXAM_PORTAL_LABEL} Tools</h3>
                        <p className="text-sm text-gray-500 mt-1">Turn specific writing tools on or off for this organization.</p>
                        <div className="mt-4 space-y-3">
                          {EXAM_TOOL_OPTIONS.map((feature) => {
                            const Icon = feature.icon;
                            const enabled = organizationForm.organization_features.exam_portal[feature.key];
                            return (
                              <button
                                key={feature.key}
                                onClick={() => handleFeatureToggle(university.id, "exam_portal", feature.key)}
                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${enabled ? "border-sky-200 bg-sky-50" : "border-gray-200 bg-gray-50"}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 rounded-xl border p-2 ${enabled ? "border-sky-200 bg-white text-sky-700" : "border-gray-200 bg-white text-gray-500"}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="font-semibold text-[#071952]">{feature.label}</p>
                                      <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full ${enabled ? "bg-sky-100 text-sky-700" : "bg-gray-200 text-gray-600"}`}>
                                        {enabled ? "Enabled" : "Disabled"}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-[#071952]">Organization Shape</h3>
                            <p className="text-sm text-gray-500">Keep universities, companies, coaching centers, and custom contracts on the same platform model.</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          Current type: <span className="font-semibold text-[#071952]">{getOrganizationTypeLabel(organizationForm.organization_type)}</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-3">Use the toggles here to tailor the student experience without changing the underlying routes or database ownership model.</p>
                        <button
                          onClick={() => handleSaveOrganization(university.id)}
                          disabled={savingOrganizationId === university.id || !organizationForm.name.trim()}
                          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071952] text-white font-semibold disabled:opacity-50"
                        >
                          {savingOrganizationId === university.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save Organization Settings
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </>
      ) : currentUniversity ? (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#071952]">Organization Information</h2>
                <p className="text-sm text-gray-500">These details belong only to your admin workspace.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={adminForm.name}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Organization name"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />
              <input
                value={adminForm.short_name}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, short_name: event.target.value }))}
                placeholder="Short name"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />
              <input
                value={adminForm.website}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, website: event.target.value }))}
                placeholder="Official website"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />
              <input
                value={adminForm.contact_email}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, contact_email: event.target.value }))}
                placeholder="Contact email"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />
              <input
                value={adminForm.contact_phone}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
                placeholder="Contact phone"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />
              <input
                value={adminForm.address}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Office or campus address"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />
              <textarea
                value={adminForm.notes}
                onChange={(event) => setAdminForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Internal notes"
                rows={3}
                className="md:col-span-2 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952] resize-none"
              />
            </div>

            <button
              onClick={handleSaveUniversity}
              disabled={submitting || !adminForm.name.trim()}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071952] text-white font-semibold disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Organization Details
            </button>
          </section>

          <section className="grid gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#071952]">Departments</h2>
                  <p className="text-sm text-gray-500">Teachers and admins can manage departments for their organization. Email domains are handled by the developer team.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  value={departmentDraft}
                  onChange={(event) => setDepartmentDraft(event.target.value)}
                  placeholder="Department of Engineering"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                />
                <button
                  onClick={handleCreateDepartment}
                  disabled={departmentSubmitting || !departmentDraft.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071952] text-white font-semibold disabled:opacity-50"
                >
                  {departmentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {departments.length === 0 ? (
                  <p className="text-sm text-gray-500">No departments added yet.</p>
                ) : (
                  departments.map((department) => (
                    <span
                      key={department.id}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-[#071952]"
                    >
                      {department.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              {currentUniversity.website && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4" />
                  {currentUniversity.website}
                </p>
              )}
              {currentUniversity.contact_email && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {currentUniversity.contact_email}
                </p>
              )}
              {currentUniversity.contact_phone && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {currentUniversity.contact_phone}
                </p>
              )}
              {currentUniversity.address && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {currentUniversity.address}
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          No organization is linked to this admin account yet.
        </div>
      )}
    </div>
  );
}
