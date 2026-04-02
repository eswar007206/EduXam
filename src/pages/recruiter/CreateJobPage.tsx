import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  X,
  MapPin,
  Briefcase,
  Building2,
  DollarSign,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Gift,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createJobPosting } from "@/services/jobService";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Segmented Button Component                                        */
/* ------------------------------------------------------------------ */
function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
            value === opt.value
              ? "bg-[#071952] text-white shadow-sm"
              : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#071952]/30"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Header Component                                          */
/* ------------------------------------------------------------------ */
function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-[#071952]/10 flex items-center justify-center text-[#071952]">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-[#071952]">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */
export default function CreateJobPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  /* ---- form state ---- */
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("full-time");
  const [workplaceType, setWorkplaceType] = useState("onsite");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("INR");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [benefits, setBenefits] = useState("");

  /* ---- skills state ---- */
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  /* ---- bootstrap ---- */
  useEffect(() => {
    if (profile?.company_name) {
      setCompanyName(profile.company_name);
    }
    // Load subjects for autocomplete
    supabase
      .from("subjects")
      .select("name")
      .then(({ data }) => {
        if (data) {
          const names = [...new Set(data.map((s: { name: string }) => s.name))];
          setAllSubjects(names);
        }
      });
  }, [profile]);

  /* ---- skill helpers ---- */
  const handleSkillInput = (value: string) => {
    setSkillInput(value);
    if (value.length >= 1) {
      const filtered = allSubjects.filter(
        (s) => s.toLowerCase().includes(value.toLowerCase()) && !skills.includes(s)
      );
      setSubjectSuggestions(filtered.slice(0, 5));
    } else {
      setSubjectSuggestions([]);
    }
  };

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput("");
    setSubjectSuggestions([]);
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (skillInput.trim()) {
        addSkill(skillInput);
      }
    }
  };

  /* ---- submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error("Profile not loaded. Please refresh the page.");
      return;
    }
    // Auto-add any text left in the skill input
    const finalSkills = [...skills];
    if (skillInput.trim() && !finalSkills.includes(skillInput.trim())) {
      finalSkills.push(skillInput.trim());
      setSkills(finalSkills);
      setSkillInput("");
    }
    if (finalSkills.length === 0) {
      toast.error("Add at least one required skill.");
      return;
    }
    setSaving(true);
    try {
      await createJobPosting({
        recruiter_id: profile.id,
        title: title.trim(),
        description: description.trim(),
        company_name: companyName.trim(),
        required_skills: finalSkills,
        location: location.trim() || null,
        job_type: jobType,
        workplace_type: workplaceType,
        experience_level: experienceLevel,
        salary_min: salaryMin ? Number(salaryMin) : null,
        salary_max: salaryMax ? Number(salaryMax) : null,
        salary_currency: salaryCurrency,
        application_deadline: applicationDeadline || null,
        responsibilities: responsibilities.trim() || null,
        qualifications: qualifications.trim() || null,
        benefits: benefits.trim() || null,
      });
      toast.success("Job posted successfully!");
      navigate("/recruiter/jobs");
    } catch (err) {
      console.error("Job creation error:", err);
      toast.error("Failed to create job posting.");
    } finally {
      setSaving(false);
    }
  };

  /* ---- shared classes ---- */
  const inputCls =
    "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[#071952] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#071952] focus:border-transparent";

  const sectionCls =
    "bg-white rounded-2xl border-2 border-gray-100 p-5 sm:p-6 space-y-4";

  /* ---- render ---- */
  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-0 pb-12">
      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-[#071952] mb-1">Post a New Job</h1>
        <p className="text-sm text-gray-500">
          Fill in the details below. Our matching algorithm will find the best
          students based on their exam performance.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ============================================================ */}
        {/*  SECTION 1 -- Basic Info                                     */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={sectionCls}
        >
          <SectionHeader
            icon={<Briefcase className="w-4 h-4" />}
            title="Basic Information"
            subtitle="Core details about the position"
          />

          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Job Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="e.g. MERN Stack Developer"
              required
            />
          </div>

          {/* Company + Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#071952] mb-1.5">
                Company Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={`${inputCls} pl-10`}
                  placeholder="Your company"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#071952] mb-1.5">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={`${inputCls} pl-10`}
                  placeholder="e.g. Remote, Bangalore"
                />
              </div>
            </div>
          </div>

          {/* Job Type */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Job Type
            </label>
            <SegmentedControl
              options={[
                { value: "full-time", label: "Full-time" },
                { value: "part-time", label: "Part-time" },
                { value: "internship", label: "Internship" },
                { value: "contract", label: "Contract" },
              ]}
              value={jobType}
              onChange={setJobType}
            />
          </div>

          {/* Workplace Type */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Workplace Type
            </label>
            <SegmentedControl
              options={[
                { value: "remote", label: "Remote" },
                { value: "hybrid", label: "Hybrid" },
                { value: "onsite", label: "On-site" },
              ]}
              value={workplaceType}
              onChange={setWorkplaceType}
            />
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Experience Level
            </label>
            <SegmentedControl
              options={[
                { value: "entry", label: "Entry" },
                { value: "mid", label: "Mid" },
                { value: "senior", label: "Senior" },
                { value: "lead", label: "Lead" },
              ]}
              value={experienceLevel}
              onChange={setExperienceLevel}
            />
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/*  SECTION 2 -- Compensation                                   */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={sectionCls}
        >
          <SectionHeader
            icon={<DollarSign className="w-4 h-4" />}
            title="Compensation"
            subtitle="Salary range and application timeline"
          />

          {/* Salary Range */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Salary Range
            </label>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
              <input
                type="number"
                min="0"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className={inputCls}
                placeholder="Min"
              />
              <input
                type="number"
                min="0"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className={inputCls}
                placeholder="Max"
              />
              <select
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value)}
                className="px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[#071952] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#071952] focus:border-transparent cursor-pointer"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Application Deadline */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Application Deadline
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/*  SECTION 3 -- Job Details                                    */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={sectionCls}
        >
          <SectionHeader
            icon={<ClipboardList className="w-4 h-4" />}
            title="Job Details"
            subtitle="Describe the role and its responsibilities"
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="Provide a summary of the role, what the team does, and what impact this position will have..."
              rows={5}
              required
            />
          </div>

          {/* Responsibilities */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Responsibilities
            </label>
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="List responsibilities, one per line"
              rows={4}
            />
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/*  SECTION 4 -- Requirements                                   */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={sectionCls}
        >
          <SectionHeader
            icon={<GraduationCap className="w-4 h-4" />}
            title="Requirements"
            subtitle="Qualifications and benefits for candidates"
          />

          {/* Qualifications */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Qualifications
            </label>
            <textarea
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="List qualifications, one per line"
              rows={4}
            />
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                Benefits &amp; Perks
              </span>
            </label>
            <textarea
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="List benefits & perks, one per line"
              rows={3}
            />
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/*  SECTION 5 -- Skills                                         */}
        {/* ============================================================ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={sectionCls}
        >
          <SectionHeader
            icon={<Sparkles className="w-4 h-4" />}
            title="Skills"
            subtitle="Skills used for matching candidates from exam performance"
          />

          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Required Skills{" "}
              <span className="text-red-400">*</span>
              <span className="font-normal text-gray-400 ml-1">
                (type and press Enter)
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => handleSkillInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputCls}
                placeholder="e.g. MERN Stack, Python, React"
              />
              {subjectSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {subjectSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#071952]/10 text-[#071952]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* ============================================================ */}
        {/*  Submit                                                      */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-[#071952] hover:bg-[#071952]/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Briefcase className="w-4 h-4" />
                Post Job
              </>
            )}
          </button>
        </motion.div>
      </form>
    </div>
  );
}
