import { useState, useEffect, useRef, useMemo, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Linkedin,
  Github,
  Globe,
  Save,
  Eye,
  ShieldCheck,
  Users,
  GraduationCap,
  Briefcase,
  Lock,
  Plus,
  X,
  Trash2,
  Award,
  Link as LinkIcon,
  Tag,
  Camera,
  User,
  Languages,
  ImagePlus,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { updateStudentProfile } from "@/services/studentProfileService";
import {
  uploadAvatar,
  deleteAvatar,
  uploadCertificateImage,
} from "@/services/profileStorageService";
import type {
  EducationEntry,
  ExperienceEntry,
  CertificationEntry,
  ProjectEntry,
} from "@/lib/database.types";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import SkillAutocomplete from "@/components/SkillAutocomplete";
import ProfileCompletionBar from "@/components/ProfileCompletionBar";
import { calculateFormCompletion } from "@/utils/profileCompletion";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Visibility = "teachers_only" | "recruiters_only" | "both" | "applied_only";
type Gender = "male" | "female" | "other" | "prefer_not_to_say" | null;
type CollegeYear = "1st" | "2nd" | "3rd" | "4th" | "5th" | "alumni" | null;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INPUT_CLS =
  "w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#071952] focus:ring-0 outline-none text-sm transition-colors";

const visibilityOptions: {
  value: Visibility;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    value: "applied_only",
    label: "Applied Jobs Only",
    description: "Only recruiters you've applied to can view",
    icon: Lock,
  },
  {
    value: "both",
    label: "Everyone",
    description: "Teachers and recruiters can view",
    icon: Users,
  },
  {
    value: "teachers_only",
    label: "Teachers Only",
    description: "Only teachers can view your profile",
    icon: GraduationCap,
  },
  {
    value: "recruiters_only",
    label: "Recruiters Only",
    description: "Only recruiters can view your profile",
    icon: Briefcase,
  },
];

const genderOptions: { value: NonNullable<Gender>; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const collegeYearOptions: { value: NonNullable<CollegeYear>; label: string }[] = [
  { value: "1st", label: "1st Year" },
  { value: "2nd", label: "2nd Year" },
  { value: "3rd", label: "3rd Year" },
  { value: "4th", label: "4th Year" },
  { value: "5th", label: "5th Year" },
  { value: "alumni", label: "Alumni" },
];

const emptyExperience: ExperienceEntry = {
  title: "",
  company: "",
  location: "",
  start_date: "",
  end_date: null,
  description: "",
  current: false,
  skills_used: [],
};

const emptyEducation: EducationEntry = {
  institution: "",
  degree: "",
  field: "",
  start_year: new Date().getFullYear(),
  end_year: null,
};

const emptyCertification: CertificationEntry = {
  name: "",
  issuer: "",
  date: "",
  url: null,
  image_url: null,
  skills_learned: [],
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function EditProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  /* ---- Avatar ---- */
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  /* ---- Section 1: Basic Info ---- */
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [phone, setPhone] = useState("");

  /* ---- Section 2: Personal Details ---- */
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender>(null);
  const [hometown, setHometown] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [nationality, setNationality] = useState("");

  /* ---- Section 3: Academic Information ---- */
  const [collegeName, setCollegeName] = useState("");
  const [collegeYear, setCollegeYear] = useState<CollegeYear>(null);
  const [degreePursuing, setDegreePursuing] = useState("");
  const [branch, setBranch] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [tenthPercentage, setTenthPercentage] = useState("");
  const [twelfthPercentage, setTwelfthPercentage] = useState("");

  /* ---- Section 4: Links ---- */
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  /* ---- Section 5: Skills ---- */
  const [skills, setSkills] = useState<string[]>([]);

  /* ---- Section 6: Experience ---- */
  const [experience, setExperience] = useState<ExperienceEntry[]>(
    ((profile?.experience ?? []) as ExperienceEntry[]).map(e => ({ ...e, skills_used: e.skills_used ?? [] }))
  );

  /* ---- Section 7: Projects ---- */
  const [projects, setProjects] = useState<ProjectEntry[]>((profile?.projects ?? []) as ProjectEntry[]);

  /* ---- Section 8: Education ---- */
  const [education, setEducation] = useState<EducationEntry[]>([]);

  /* ---- Section 9: Certifications ---- */
  const [certifications, setCertifications] = useState<CertificationEntry[]>(
    ((profile?.certifications ?? []) as CertificationEntry[]).map(c => ({ ...c, skills_learned: c.skills_learned ?? [] }))
  );

  /* ---- Section 9: Languages & Interests ---- */
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");

  /* ---- Section 10: Visibility ---- */
  const [visibility, setVisibility] = useState<Visibility>("applied_only");

  /* ---- UI State ---- */
  const [saving, setSaving] = useState(false);
  const [uploadingCertIdx, setUploadingCertIdx] = useState<number | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Populate state from profile                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url ?? null);
      setHeadline(profile.headline ?? "");
      setBio(profile.bio ?? "");
      setAboutMe(profile.about_me ?? "");
      setPhone(profile.phone ?? "");
      setDateOfBirth(profile.date_of_birth ?? "");
      setGender(profile.gender ?? null);
      setHometown(profile.hometown ?? "");
      setCurrentCity(profile.current_city ?? "");
      setPincode(profile.pincode ?? "");
      setNationality(profile.nationality ?? "");
      setCollegeName(profile.college_name ?? "");
      setCollegeYear(profile.college_year ?? null);
      setDegreePursuing(profile.degree_pursuing ?? "");
      setBranch(profile.branch ?? "");
      setCgpa(profile.cgpa != null ? String(profile.cgpa) : "");
      setTenthPercentage(profile.tenth_percentage != null ? String(profile.tenth_percentage) : "");
      setTwelfthPercentage(profile.twelfth_percentage != null ? String(profile.twelfth_percentage) : "");
      setLinkedinUrl(profile.linkedin_url ?? "");
      setGithubUrl(profile.github_url ?? "");
      setPortfolioUrl(profile.portfolio_url ?? "");
      setSkills(profile.skills ?? []);
      setExperience(
        (profile.experience?.length ? profile.experience : []).map(e => ({ ...e, skills_used: e.skills_used ?? [] }))
      );
      setEducation(profile.education?.length ? profile.education : []);
      setCertifications(
        profile.certifications?.length
          ? profile.certifications.map((c) => ({ ...c, image_url: c.image_url ?? null, skills_learned: c.skills_learned ?? [] }))
          : []
      );
      setProjects((profile.projects ?? []) as ProjectEntry[]);
      setLanguages(profile.languages ?? []);
      setInterests(profile.interests ?? []);
      setVisibility(profile.profile_visibility ?? "applied_only");
    }
  }, [profile]);

  /* ---------------------------------------------------------------- */
  /*  Live progress bar calculation                                    */
  /* ---------------------------------------------------------------- */

  const { percentage: completionPercentage, sections: completionSections } = useMemo(() => {
    return calculateFormCompletion({
      avatar_url: avatarPreview || avatarUrl,
      headline,
      bio,
      about_me: aboutMe,
      phone,
      location: hometown,
      current_city: currentCity,
      date_of_birth: dateOfBirth,
      gender: gender ?? "",
      college_name: collegeName,
      college_year: collegeYear ?? "",
      degree_pursuing: degreePursuing,
      branch,
      cgpa,
      tenth_percentage: tenthPercentage,
      twelfth_percentage: twelfthPercentage,
      skills,
      experience,
      education,
      certifications,
      projects,
      linkedin_url: linkedinUrl,
      github_url: githubUrl,
      portfolio_url: portfolioUrl,
      interests,
      languages,
    });
  }, [
    avatarUrl, avatarPreview, headline, bio, aboutMe, phone, hometown, currentCity,
    dateOfBirth, gender, collegeName, collegeYear, degreePursuing, branch,
    cgpa, tenthPercentage, twelfthPercentage, skills, experience, education,
    certifications, projects, linkedinUrl, githubUrl, portfolioUrl, interests, languages,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Avatar handlers                                                  */
  /* ---------------------------------------------------------------- */

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleAvatarRemove = async () => {
    if (!profile) return;
    if (avatarFile) {
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      return;
    }
    if (!avatarUrl) return;
    try {
      await deleteAvatar(profile.id, avatarUrl);
      setAvatarUrl(null);
      await updateStudentProfile(profile.id, { avatar_url: null });
      await refreshProfile();
      toast.success("Photo removed!");
    } catch (err) {
      toast.error((err as Error).message || "Remove failed");
    }
  };

  const displayAvatar = avatarPreview || avatarUrl;
  const verifiedUniversityLabel =
    profile?.university_name ?? profile?.university_short_name ?? null;
  const hasVerifiedUniversity = Boolean(profile?.is_university_verified && verifiedUniversityLabel);

  /* ---------------------------------------------------------------- */
  /*  Tag input handlers (languages & interests)                       */
  /* ---------------------------------------------------------------- */

  const handleLanguageKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = languageInput.trim();
      if (val && !languages.includes(val)) {
        setLanguages((prev) => [...prev, val]);
      }
      setLanguageInput("");
    }
  };

  const removeLanguage = (idx: number) => {
    setLanguages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleInterestKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = interestInput.trim();
      if (val && !interests.includes(val)) {
        setInterests((prev) => [...prev, val]);
      }
      setInterestInput("");
    }
  };

  const removeInterest = (idx: number) => {
    setInterests((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ---------------------------------------------------------------- */
  /*  Experience helpers                                               */
  /* ---------------------------------------------------------------- */

  const addExperience = () =>
    setExperience((prev) => [...prev, { ...emptyExperience }]);
  const removeExperience = (idx: number) =>
    setExperience((prev) => prev.filter((_, i) => i !== idx));
  const updateExperience = (
    idx: number,
    field: keyof ExperienceEntry,
    value: string | boolean | string[] | null
  ) => {
    setExperience((prev) =>
      prev.map((entry, i) => {
        if (i !== idx) return entry;
        const updated = { ...entry, [field]: value };
        if (field === "current" && value === true) {
          updated.end_date = null;
        }
        return updated;
      })
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Education helpers                                                */
  /* ---------------------------------------------------------------- */

  const addEducation = () =>
    setEducation((prev) => [...prev, { ...emptyEducation }]);
  const removeEducation = (idx: number) =>
    setEducation((prev) => prev.filter((_, i) => i !== idx));
  const updateEducation = (
    idx: number,
    field: keyof EducationEntry,
    value: string | number | null
  ) => {
    setEducation((prev) =>
      prev.map((entry, i) =>
        i === idx ? { ...entry, [field]: value } : entry
      )
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Certification helpers                                            */
  /* ---------------------------------------------------------------- */

  const addCertification = () =>
    setCertifications((prev) => [...prev, { ...emptyCertification }]);
  const removeCertification = (idx: number) =>
    setCertifications((prev) => prev.filter((_, i) => i !== idx));
  const updateCertification = (
    idx: number,
    field: keyof CertificationEntry,
    value: string | string[] | null
  ) => {
    setCertifications((prev) =>
      prev.map((entry, i) =>
        i === idx ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleCertImageUpload = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingCertIdx(idx);
    try {
      const url = await uploadCertificateImage(profile.id, file);
      updateCertification(idx, "image_url", url);
      toast.success("Certificate image uploaded!");
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploadingCertIdx(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Project helpers                                                  */
  /* ---------------------------------------------------------------- */

  const emptyProject: ProjectEntry = { title: '', description: '', url: null, start_date: '', end_date: null, skills_used: [] };
  const addProject = () => setProjects([...projects, { ...emptyProject }]);
  const removeProject = (idx: number) => setProjects(projects.filter((_, i) => i !== idx));
  const updateProject = (idx: number, field: keyof ProjectEntry, value: unknown) => {
    setProjects(projects.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  /* ---------------------------------------------------------------- */
  /*  Save handler                                                     */
  /* ---------------------------------------------------------------- */

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar(profile.id, avatarFile);
        setAvatarUrl(finalAvatarUrl);
        setAvatarFile(null);
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(null);
        }
      }

      await updateStudentProfile(profile.id, {
        avatar_url: finalAvatarUrl,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        about_me: aboutMe.trim() || null,
        phone: phone.trim() || null,
        location: currentCity.trim() || null,
        hometown: hometown.trim() || null,
        current_city: currentCity.trim() || null,
        pincode: pincode.trim() || null,
        date_of_birth: dateOfBirth.trim() || null,
        gender,
        nationality: nationality.trim() || null,
        college_name: collegeName.trim() || null,
        college_year: collegeYear,
        degree_pursuing: degreePursuing.trim() || null,
        branch: branch.trim() || null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        tenth_percentage: tenthPercentage ? parseFloat(tenthPercentage) : null,
        twelfth_percentage: twelfthPercentage ? parseFloat(twelfthPercentage) : null,
        linkedin_url: linkedinUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        skills,
        experience,
        education,
        certifications,
        projects,
        languages,
        interests,
        profile_visibility: visibility,
      });

      await refreshProfile();
      toast.success("Profile updated successfully!");
      navigate(`/profile/${profile.id}`);
    } catch (err) {
      toast.error((err as Error).message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Section heading helper                                           */
  /* ---------------------------------------------------------------- */

  const sectionHeading = (icon: React.ReactNode, title: string) => (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-9 h-9 rounded-lg bg-[#071952] text-white flex items-center justify-center shrink-0">
        {icon}
      </div>
      <h2 className="text-sm font-bold text-[#071952] uppercase tracking-wide">
        {title}
      </h2>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20">
        <div className="container mx-auto px-4 pb-32 max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-2xl font-bold text-[#071952] mb-1"
          >
            Edit Profile
          </motion.h1>
          <p className="text-sm text-gray-500 mb-8">
            Build a recruiter-ready profile with your skills, projects, certifications,
            and exam-backed progress. Teachers and recruiters see it based on your visibility setting.
          </p>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.01 }}
              className="bg-gradient-to-r from-sky-50 via-white to-sky-50 rounded-2xl border border-sky-100 p-5"
            >
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${hasVerifiedUniversity ? "bg-sky-100 border-sky-200 text-sky-700" : "bg-gray-100 border-gray-200 text-gray-500"}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#071952]">
                      {hasVerifiedUniversity ? verifiedUniversityLabel : "Organization verification pending"}
                    </p>
                    {hasVerifiedUniversity && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {hasVerifiedUniversity
                      ? "Your profile is linked to an official organization email domain, so recruiters and teachers can trust that this is an organization-backed student profile."
                      : "Sign in with an approved organization email domain to get a verified organization badge on your profile."}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 1: Profile Photo + Basic Info                         */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.02 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<Camera className="w-4 h-4" />, "Profile Photo & Basic Info")}

              {/* Avatar */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-100 flex items-center justify-center">
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#071952] flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">
                          {profile?.username?.charAt(0)?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Camera overlay on hover */}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-sm font-medium text-[#071952] hover:underline"
                  >
                    {displayAvatar ? "Change Photo" : "Upload Photo"}
                  </button>
                  {displayAvatar && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="text-sm font-medium text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Basic Info Fields */}
              <div className="space-y-4">
                {/* Headline */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. CS Student | Full Stack Developer"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 500))}
                    className={`${INPUT_CLS} resize-none`}
                    placeholder="Short bio about yourself..."
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {bio.length}/500
                  </p>
                </div>

                {/* About Me */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    About Me
                  </label>
                  <textarea
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value.slice(0, 1000))}
                    className={`${INPUT_CLS} resize-none`}
                    placeholder="Tell us more about yourself, your goals, and what drives you..."
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {aboutMe.length}/1000
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 2: Personal Details                                   */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.04 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<User className="w-4 h-4" />, "Personal Details")}

              <div className="space-y-4">
                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={INPUT_CLS}
                  />
                </div>

                {/* Gender - Radio Buttons */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-2">
                    Gender
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {genderOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-colors text-sm ${
                          gender === opt.value
                            ? "border-[#071952] bg-[#071952]/5 text-[#071952] font-medium"
                            : "border-gray-100 text-gray-600 hover:border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value={opt.value}
                          checked={gender === opt.value}
                          onChange={() => setGender(opt.value)}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Hometown */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Hometown
                  </label>
                  <input
                    type="text"
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. Chennai, TN"
                  />
                </div>

                {/* Current City */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Current City
                  </label>
                  <input
                    type="text"
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. Bangalore, KA"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. 600001"
                  />
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. Indian"
                  />
                </div>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 3: Academic Information                               */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<GraduationCap className="w-4 h-4" />, "Academic Information")}

              <div className="space-y-4">
                {/* College Name */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    College Name
                  </label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. Garden City University"
                  />
                </div>

                {/* College Year */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    College Year
                  </label>
                  <select
                    value={collegeYear ?? ""}
                    onChange={(e) =>
                      setCollegeYear(
                        e.target.value === "" ? null : (e.target.value as NonNullable<CollegeYear>)
                      )
                    }
                    className={INPUT_CLS}
                  >
                    <option value="">Select year...</option>
                    {collegeYearOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Degree Pursuing */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Degree Pursuing
                  </label>
                  <input
                    type="text"
                    value={degreePursuing}
                    onChange={(e) => setDegreePursuing(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. B.Tech, BCA, MCA..."
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className={INPUT_CLS}
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>

                {/* CGPA, 10th, 12th in a grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#071952] mb-1.5">
                      CGPA
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={cgpa}
                      onChange={(e) => setCgpa(e.target.value)}
                      className={INPUT_CLS}
                      placeholder="e.g. 8.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#071952] mb-1.5">
                      10th %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={tenthPercentage}
                      onChange={(e) => setTenthPercentage(e.target.value)}
                      className={INPUT_CLS}
                      placeholder="e.g. 92.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#071952] mb-1.5">
                      12th %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={twelfthPercentage}
                      onChange={(e) => setTwelfthPercentage(e.target.value)}
                      className={INPUT_CLS}
                      placeholder="e.g. 88.0"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 4: Links                                             */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<LinkIcon className="w-4 h-4" />, "Links")}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    LinkedIn URL
                  </label>
                  <div className="relative">
                    <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" />
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className={`${INPUT_CLS} pl-11`}
                      placeholder="https://linkedin.com/in/yourname"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    GitHub URL
                  </label>
                  <div className="relative">
                    <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" />
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className={`${INPUT_CLS} pl-11`}
                      placeholder="https://github.com/yourusername"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Portfolio URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 pointer-events-none" />
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      className={`${INPUT_CLS} pl-11`}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 5: Skills                                            */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<Tag className="w-4 h-4" />, "Skills")}

              <SkillAutocomplete skills={skills} onSkillsChange={setSkills} />
            </motion.div>

            {/* ============================================================ */}
            {/* Section 6: Experience                                         */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<Briefcase className="w-4 h-4" />, "Experience")}

              <div className="space-y-4">
                {experience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="relative border-2 border-gray-100 rounded-xl p-4 space-y-3"
                  >
                    <button
                      type="button"
                      onClick={() => removeExperience(idx)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Title, Company, Location in a row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={exp.title}
                          onChange={(e) => updateExperience(idx, "title", e.target.value)}
                          className={INPUT_CLS}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Company
                        </label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(idx, "company", e.target.value)}
                          className={INPUT_CLS}
                          placeholder="Acme Corp"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={exp.location}
                          onChange={(e) => updateExperience(idx, "location", e.target.value)}
                          className={INPUT_CLS}
                          placeholder="Remote"
                        />
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Start Date
                        </label>
                        <input
                          type="month"
                          value={exp.start_date}
                          onChange={(e) => updateExperience(idx, "start_date", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          End Date
                        </label>
                        <input
                          type="month"
                          value={exp.end_date ?? ""}
                          onChange={(e) =>
                            updateExperience(idx, "end_date", e.target.value || null)
                          }
                          className={INPUT_CLS}
                          disabled={exp.current}
                        />
                      </div>
                    </div>

                    {/* Currently working checkbox */}
                    <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) => updateExperience(idx, "current", e.target.checked)}
                        className="rounded border-gray-300 text-[#071952] focus:ring-[#071952]"
                      />
                      I currently work here
                    </label>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Description
                      </label>
                      <textarea
                        value={exp.description}
                        onChange={(e) => updateExperience(idx, "description", e.target.value)}
                        className={`${INPUT_CLS} resize-none`}
                        rows={3}
                        placeholder="Describe your role and responsibilities..."
                      />
                    </div>

                    {/* Skills Used */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Skills Used
                      </label>
                      <SkillAutocomplete
                        skills={exp.skills_used ?? []}
                        onSkillsChange={(newSkills) => updateExperience(idx, "skills_used", newSkills)}
                        placeholder="Skills used in this role..."
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExperience}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-[#071952] hover:text-[#071952] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Experience
                </button>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 6.5: Projects                                        */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.13 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<FolderOpen className="w-4 h-4" />, "Projects")}

              <div className="space-y-4">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="relative border-2 border-gray-100 rounded-xl p-4 space-y-3"
                  >
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Project Title
                        </label>
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => updateProject(idx, "title", e.target.value)}
                          className={INPUT_CLS}
                          placeholder="My Awesome Project"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          URL (optional)
                        </label>
                        <input
                          type="url"
                          value={proj.url ?? ""}
                          onChange={(e) => updateProject(idx, "url", e.target.value || null)}
                          className={INPUT_CLS}
                          placeholder="https://github.com/..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Start Date
                        </label>
                        <input
                          type="month"
                          value={proj.start_date}
                          onChange={(e) => updateProject(idx, "start_date", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          End Date
                        </label>
                        <input
                          type="month"
                          value={proj.end_date ?? ""}
                          onChange={(e) => updateProject(idx, "end_date", e.target.value || null)}
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Description
                      </label>
                      <textarea
                        value={proj.description}
                        onChange={(e) => updateProject(idx, "description", e.target.value)}
                        className={`${INPUT_CLS} resize-none`}
                        rows={3}
                        placeholder="Describe the project, your role, and the impact..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Skills Used
                      </label>
                      <SkillAutocomplete
                        skills={proj.skills_used ?? []}
                        onSkillsChange={(newSkills) => updateProject(idx, "skills_used", newSkills)}
                        placeholder="Skills used in this project..."
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addProject}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-[#071952] hover:text-[#071952] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Project
                </button>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 7: Education                                          */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.14 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<BookOpen className="w-4 h-4" />, "Education")}

              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="relative border-2 border-gray-100 rounded-xl p-4 space-y-3"
                  >
                    <button
                      type="button"
                      onClick={() => removeEducation(idx)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Institution
                      </label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => updateEducation(idx, "institution", e.target.value)}
                        className={INPUT_CLS}
                        placeholder="University / School name"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Degree
                        </label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                          className={INPUT_CLS}
                          placeholder="e.g. Bachelor of Technology"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Field
                        </label>
                        <input
                          type="text"
                          value={edu.field}
                          onChange={(e) => updateEducation(idx, "field", e.target.value)}
                          className={INPUT_CLS}
                          placeholder="e.g. Computer Science"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Start Year
                        </label>
                        <input
                          type="number"
                          value={edu.start_year}
                          onChange={(e) =>
                            updateEducation(idx, "start_year", parseInt(e.target.value) || 0)
                          }
                          className={INPUT_CLS}
                          placeholder="2020"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          End Year (optional)
                        </label>
                        <input
                          type="number"
                          value={edu.end_year ?? ""}
                          onChange={(e) =>
                            updateEducation(
                              idx,
                              "end_year",
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          className={INPUT_CLS}
                          placeholder="2024"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addEducation}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-[#071952] hover:text-[#071952] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Education
                </button>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 8: Certifications                                     */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<Award className="w-4 h-4" />, "Certifications")}

              <div className="space-y-4">
                {certifications.map((cert, idx) => (
                  <div
                    key={idx}
                    className="relative border-2 border-gray-100 rounded-xl p-4 space-y-3"
                  >
                    <button
                      type="button"
                      onClick={() => removeCertification(idx)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Certificate Name
                      </label>
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => updateCertification(idx, "name", e.target.value)}
                        className={INPUT_CLS}
                        placeholder="e.g. AWS Solutions Architect"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Issuer
                        </label>
                        <input
                          type="text"
                          value={cert.issuer}
                          onChange={(e) => updateCertification(idx, "issuer", e.target.value)}
                          className={INPUT_CLS}
                          placeholder="e.g. Amazon Web Services"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Date
                        </label>
                        <input
                          type="month"
                          value={cert.date}
                          onChange={(e) => updateCertification(idx, "date", e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        URL (optional)
                      </label>
                      <input
                        type="url"
                        value={cert.url ?? ""}
                        onChange={(e) =>
                          updateCertification(idx, "url", e.target.value || null)
                        }
                        className={INPUT_CLS}
                        placeholder="https://credential.example.com/..."
                      />
                    </div>

                    {/* Certificate Image Upload */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Certificate Image
                      </label>
                      {cert.image_url ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={cert.image_url}
                            alt="Certificate"
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => updateCertification(idx, "image_url", null)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove image
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-[#071952] transition-colors">
                            {uploadingCertIdx === idx ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ImagePlus className="w-4 h-4" />
                            )}
                            {uploadingCertIdx === idx ? "Uploading..." : "Upload certificate image"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              onChange={(e) => handleCertImageUpload(idx, e)}
                              className="hidden"
                              disabled={uploadingCertIdx === idx}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Skills Learned */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Skills Learned
                      </label>
                      <SkillAutocomplete
                        skills={cert.skills_learned ?? []}
                        onSkillsChange={(newSkills) => updateCertification(idx, "skills_learned", newSkills)}
                        placeholder="Skills learned from this certification..."
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCertification}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-[#071952] hover:text-[#071952] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Certification
                </button>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 9: Languages & Interests                             */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<Languages className="w-4 h-4" />, "Languages & Interests")}

              <div className="space-y-5">
                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Languages
                  </label>
                  <input
                    type="text"
                    value={languageInput}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    onKeyDown={handleLanguageKeyDown}
                    className={INPUT_CLS}
                    placeholder="e.g. English, Hindi, Tamil..."
                  />
                  {languages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {languages.map((lang, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#071952]/10 text-[#071952] text-sm font-medium rounded-full"
                        >
                          {lang}
                          <button
                            type="button"
                            onClick={() => removeLanguage(idx)}
                            className="ml-0.5 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">
                    Interests
                  </label>
                  <input
                    type="text"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={handleInterestKeyDown}
                    className={INPUT_CLS}
                    placeholder="e.g. Coding, Music, Sports..."
                  />
                  {interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {interests.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#071952]/10 text-[#071952] text-sm font-medium rounded-full"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => removeInterest(idx)}
                            className="ml-0.5 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 10: Profile Visibility                               */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              {sectionHeading(<ShieldCheck className="w-4 h-4" />, "Profile Visibility")}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibilityOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = visibility === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                        isSelected
                          ? "border-[#071952] bg-[#071952]/5"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => setVisibility(opt.value)}
                        className="sr-only"
                      />
                      <Icon
                        className={`w-5 h-5 mt-0.5 shrink-0 ${
                          isSelected ? "text-[#071952]" : "text-gray-400"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            isSelected ? "text-[#071952]" : "text-gray-700"
                          }`}
                        >
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Section 11: Live Progress Bar + Save                         */}
            {/* ============================================================ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.22 }}
            >
              <ProfileCompletionBar
                percentage={completionPercentage}
                sections={completionSections}
              />
            </motion.div>

            {/* Sticky Save + Preview Buttons */}
            <div className="sticky bottom-4 z-30">
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-lg flex items-center justify-end gap-3">
                <Link
                  to={profile ? `/profile/${profile.id}` : "/"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-[#071952] hover:text-[#071952] transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </Link>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#071952] text-white text-sm font-semibold hover:bg-[#071952]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
