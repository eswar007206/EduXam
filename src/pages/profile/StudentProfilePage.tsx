import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Github,
  Linkedin,
  Globe,
  Calendar,
  BookOpen,
  Trophy,
  TrendingUp,
  Loader2,
  ExternalLink,
  MapPin,
  Phone,
  Pencil,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Flame,
  BarChart3,
  History,
  BadgeCheck,
  Tags,
  Heart,
  Languages,
  Info,
  School,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getStudentProfile,
  getStudentSubjectStats,
  getStudentExamHistory,
  type StudentProfileData,
  type SubjectStat,
} from "@/services/studentProfileService";
import { getActivityHeatmap, type HeatmapDay } from "@/services/heatmapService";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import Navbar from "@/components/Navbar";
import ProfileCompletionBar from "@/components/ProfileCompletionBar";
import { getAppHomePath } from "@/lib/appHome";
import { calculateProfileCompletion } from "@/utils/profileCompletion";
import type { EducationEntry, ExperienceEntry, CertificationEntry, ProjectEntry } from "@/lib/database.types";

/* ------------------------------------------------------------------ */
/*  Section Header                                                     */
/* ------------------------------------------------------------------ */
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[#071952]">{icon}</span>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </h2>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: format month/year from date string                         */
/* ------------------------------------------------------------------ */
function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Helper: format date of birth                                       */
/* ------------------------------------------------------------------ */
function formatDateOfBirth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Helper: capitalize first letter                                    */
/* ------------------------------------------------------------------ */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { profile: currentUser } = useAuth();
  const appHomePath = getAppHomePath(currentUser);
  const [student, setStudent] = useState<StudentProfileData | null>(null);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [examHistory, setExamHistory] = useState<
    { id: string; subjectName: string; marksObtained: number; totalMarks: number; percent: number; date: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isOwnProfile = currentUser?.id === studentId;

  useEffect(() => {
    if (!studentId) return;

    (async () => {
      try {
        const [profileData, stats, heatmap, history] = await Promise.all([
          getStudentProfile(studentId),
          getStudentSubjectStats(studentId),
          getActivityHeatmap(studentId),
          getStudentExamHistory(studentId),
        ]);

        if (!profileData) {
          setError("Student profile not found.");
          return;
        }

        setStudent(profileData);
        setSubjectStats(stats);
        setHeatmapData(heatmap);
        setExamHistory(history);
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  /* ---------- Loading State ---------- */
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#071952]" />
        </div>
      </>
    );
  }

  /* ---------- Error / Not Found State ---------- */
  if (error || !student) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 pt-20">
          <p className="text-gray-500">{error || "Profile not found."}</p>
          <Link
            to={appHomePath}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#071952] transition hover:border-[#071952]/20"
          >
            Open Dashboard
          </Link>
        </div>
      </>
    );
  }

  /* ---------- Derived Data ---------- */
  const joinedDate = new Date(student.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const verifiedUniversityLabel =
    student.university_name ?? student.university_short_name ?? null;
  const hasVerifiedUniversity = Boolean(student.is_university_verified && verifiedUniversityLabel);

  const hasSocials = student.linkedin_url || student.github_url || student.portfolio_url;

  const hasAbout = student.bio || student.about_me;

  // Personal details
  const personalDetails: { label: string; value: string }[] = [];
  if (student.date_of_birth) personalDetails.push({ label: "Date of Birth", value: formatDateOfBirth(student.date_of_birth) });
  if (student.gender) personalDetails.push({ label: "Gender", value: capitalize(student.gender) });
  if (student.hometown) personalDetails.push({ label: "Hometown", value: student.hometown });
  if (student.current_city) personalDetails.push({ label: "Current City", value: student.current_city });
  if (student.pincode) personalDetails.push({ label: "Pincode", value: student.pincode });
  if (student.nationality) personalDetails.push({ label: "Nationality", value: student.nationality });

  // Academic information
  const hasAcademic = student.college_name || student.college_year || student.degree_pursuing || student.branch || student.cgpa != null || student.tenth_percentage != null || student.twelfth_percentage != null;

  // Languages & Interests
  const hasLanguagesOrInterests = student.languages.length > 0 || student.interests.length > 0;

  // Profile completion (only for own profile)
  const profileCompletion = isOwnProfile
    ? calculateProfileCompletion({
        ...student,
        role: 'student' as const,
        university_id: student.university_id,
        university_member_role: student.university_member_role,
        university_name: student.university_name,
        university_short_name: student.university_short_name,
        university_slug: student.university_slug,
        is_university_verified: student.is_university_verified,
        organization_type: student.organization_type,
        organization_features: student.organization_features,
        roll_number: null,
        semester_label: null,
        department_label: null,
        parent_email: null,
        parent_email_verified: false,
        company_name: null,
      })
    : null;

  let animationIndex = 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* ============================================================ */}
          {/*  1. PROFILE HEADER CARD                                       */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
            className="bg-white rounded-2xl border-2 border-gray-100 p-6 sm:p-8 mb-6"
          >
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              {student.avatar_url ? (
                <img
                  src={student.avatar_url}
                  alt={student.username}
                  className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg shrink-0"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-[#071952] flex items-center justify-center text-white text-4xl font-bold shrink-0 border-4 border-white shadow-lg">
                  {student.username.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-[#071952]">
                  {student.username}
                </h1>

                {/* Headline */}
                {student.headline && (
                  <p className="text-gray-500 text-base mt-1">{student.headline}</p>
                )}

                {hasVerifiedUniversity && (
                  <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900">
                    <span className="truncate">{verifiedUniversityLabel}</span>
                    <BadgeCheck className="w-4 h-4 text-sky-600 shrink-0" />
                  </div>
                )}

                {/* Metadata row: Location, Phone, Joined */}
                <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-gray-400">
                  {(student.location || student.current_city) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {student.current_city || student.location}
                    </span>
                  )}
                  {student.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {student.phone}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {joinedDate}
                  </span>
                </div>

                {hasVerifiedUniversity && (
                  <p className="text-sm text-sky-700 mt-3">
                    Verified organization-backed student profile with an official email domain.
                  </p>
                )}

                {/* Social Links Row */}
                {hasSocials && (
                  <div className="flex items-center gap-2 mt-4">
                    {student.linkedin_url && (
                      <a
                        href={student.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 text-gray-500 hover:bg-[#0077b5] hover:text-white transition-all duration-200"
                        title="LinkedIn"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {student.github_url && (
                      <a
                        href={student.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-900 hover:text-white transition-all duration-200"
                        title="GitHub"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {student.portfolio_url && (
                      <a
                        href={student.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 text-gray-500 hover:bg-[#071952] hover:text-white transition-all duration-200"
                        title="Portfolio"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* Edit Profile Button */}
                {isOwnProfile && (
                  <Link
                    to="/edit-profile"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-[#071952] bg-[#071952]/5 hover:bg-[#071952]/10 rounded-xl transition-colors duration-200"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Profile
                  </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/*  2. PROFILE COMPLETION BAR (own profile only)                 */}
          {/* ============================================================ */}
          {isOwnProfile && profileCompletion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="mb-6"
            >
              <ProfileCompletionBar
                percentage={profileCompletion.percentage}
                sections={profileCompletion.sections}
              />
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  3. ABOUT SECTION                                             */}
          {/* ============================================================ */}
          {hasAbout && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
            >
              <SectionHeader icon={<User className="w-4 h-4" />} label="About" />
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {student.about_me || student.bio}
              </p>
              {student.about_me && student.bio && student.about_me !== student.bio && (
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line mt-3">
                  {student.bio}
                </p>
              )}
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  4. PERSONAL DETAILS                                          */}
          {/* ============================================================ */}
          {personalDetails.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
            >
              <SectionHeader icon={<Info className="w-4 h-4" />} label="Personal Details" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {personalDetails.map((detail) => (
                  <div key={detail.label}>
                    <p className="text-xs text-gray-400 uppercase">{detail.label}</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{detail.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  5. ACADEMIC INFORMATION                                      */}
          {/* ============================================================ */}
          {hasAcademic && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
            >
              <SectionHeader icon={<School className="w-4 h-4" />} label="Academic Information" />
              <div className="grid grid-cols-2 gap-4 mb-4">
                {student.college_name && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase">College</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{student.college_name}</p>
                  </div>
                )}
                {student.college_year && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Year</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{student.college_year} Year</p>
                  </div>
                )}
                {student.degree_pursuing && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Degree</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{student.degree_pursuing}</p>
                  </div>
                )}
                {student.branch && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Branch</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{student.branch}</p>
                  </div>
                )}
              </div>

              {/* CGPA, 10th%, 12th% with mini progress bars */}
              <div className="space-y-3">
                {student.cgpa != null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400 uppercase">CGPA</p>
                      <p className="text-sm font-medium text-gray-700">{student.cgpa} / 10</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div
                        style={{ width: (student.cgpa * 10) + '%' }}
                        className="h-full bg-[#071952] rounded-full"
                      />
                    </div>
                  </div>
                )}
                {student.tenth_percentage != null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400 uppercase">10th Percentage</p>
                      <p className="text-sm font-medium text-gray-700">{student.tenth_percentage}%</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div
                        style={{ width: student.tenth_percentage + '%' }}
                        className="h-full bg-[#071952] rounded-full"
                      />
                    </div>
                  </div>
                )}
                {student.twelfth_percentage != null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400 uppercase">12th Percentage</p>
                      <p className="text-sm font-medium text-gray-700">{student.twelfth_percentage}%</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div
                        style={{ width: student.twelfth_percentage + '%' }}
                        className="h-full bg-[#071952] rounded-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  6. SKILLS SECTION                                            */}
          {/* ============================================================ */}
          {student.skills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
            >
              <SectionHeader icon={<Tags className="w-4 h-4" />} label="Skills" />
              <div className="flex flex-wrap gap-2">
                {student.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="bg-[#071952]/10 text-[#071952] px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  7. EXPERIENCE SECTION (Timeline)                             */}
          {/* ============================================================ */}
          {student.experience.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
            >
              <SectionHeader icon={<Briefcase className="w-4 h-4" />} label="Experience" />
              <div className="relative ml-3">
                {/* Timeline vertical line */}
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#071952]/10 rounded-full" />

                <div className="space-y-6">
                  {student.experience.map((exp: ExperienceEntry, i: number) => (
                    <div key={i} className="relative pl-7">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-0 top-1 w-2.5 h-2.5 rounded-full border-2 -translate-x-1 ${
                          exp.current
                            ? "bg-[#071952] border-[#071952] shadow-md shadow-[#071952]/30"
                            : "bg-white border-[#071952]/30"
                        }`}
                      />

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-[#071952]">{exp.title}</h3>
                          {exp.current && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 rounded-full">
                              <BadgeCheck className="w-3 h-3" />
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {exp.company}
                          {exp.location && (
                            <span className="text-gray-400"> &middot; {exp.location}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatMonthYear(exp.start_date)} &ndash;{" "}
                          {exp.current ? "Present" : exp.end_date ? formatMonthYear(exp.end_date) : "N/A"}
                        </p>
                        {exp.description && (
                          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                        {(exp.skills_used ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(exp.skills_used ?? []).map((skill, si) => (
                              <span key={si} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  7b. PROJECTS SECTION                                         */}
          {/* ============================================================ */}
          {(profileData => {
            const projects = (profileData.projects ?? []) as ProjectEntry[];
            return projects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
              >
                <h3 className="text-sm font-bold text-[#071952] mb-4 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Projects
                </h3>
                <div className="space-y-4">
                  {projects.map((proj, idx) => (
                    <div key={idx} className="border-l-2 border-[#071952]/20 pl-4">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-800">{proj.title}</h4>
                        {proj.url && (
                          <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#071952] hover:underline shrink-0">
                            View Project
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {proj.start_date}{proj.end_date ? ` – ${proj.end_date}` : ' – Present'}
                      </p>
                      {proj.description && (
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{proj.description}</p>
                      )}
                      {(proj.skills_used ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {proj.skills_used.map((skill, si) => (
                            <span key={si} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })(student)}

          {/* ============================================================ */}
          {/*  8. EDUCATION SECTION                                         */}
          {/* ============================================================ */}
          {student.education.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
            >
              <SectionHeader icon={<GraduationCap className="w-4 h-4" />} label="Education" />
              <div className="space-y-5">
                {student.education.map((edu: EducationEntry, i: number) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#071952]/5 flex items-center justify-center shrink-0 mt-0.5">
                      <GraduationCap className="w-5 h-5 text-[#071952]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#071952]">
                        {edu.degree}
                        {edu.field && <span className="font-normal text-gray-600"> in {edu.field}</span>}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">{edu.institution}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {edu.start_year} &ndash; {edu.end_year ?? "Present"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  9. CERTIFICATIONS SECTION                                    */}
          {/* ============================================================ */}
          {student.certifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
            >
              <SectionHeader icon={<Award className="w-4 h-4" />} label="Certifications" />
              <div className="space-y-4">
                {student.certifications.map((cert: CertificationEntry, i: number) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Award className="w-5 h-5 text-amber-600" />
                    </div>

                    {/* Cert thumbnail image */}
                    {cert.image_url && (
                      <div className="shrink-0">
                        <img
                          src={cert.image_url}
                          alt={cert.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <a
                          href={cert.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-600 hover:underline mt-1 inline-block"
                        >
                          View
                        </a>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[#071952]">{cert.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{cert.issuer}</p>
                      {cert.date && (
                        <p className="text-xs text-gray-400 mt-1">
                          Issued {formatMonthYear(cert.date)}
                        </p>
                      )}
                      {cert.url && (
                        <a
                          href={cert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#071952] hover:underline mt-1"
                        >
                          View Certificate
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {(cert.skills_learned ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(cert.skills_learned ?? []).map((skill, si) => (
                            <span key={si} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  10. LANGUAGES & INTERESTS                                    */}
          {/* ============================================================ */}
          {hasLanguagesOrInterests && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
            >
              {student.languages.length > 0 && (
                <div className={student.interests.length > 0 ? "mb-5" : ""}>
                  <SectionHeader icon={<Languages className="w-4 h-4" />} label="Languages" />
                  <div className="flex flex-wrap gap-2">
                    {student.languages.map((lang, i) => (
                      <span
                        key={i}
                        className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {student.interests.length > 0 && (
                <div>
                  <SectionHeader icon={<Heart className="w-4 h-4" />} label="Interests" />
                  <div className="flex flex-wrap gap-2">
                    {student.interests.map((interest, i) => (
                      <span
                        key={i}
                        className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  11. ACTIVITY HEATMAP                                         */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
            className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
          >
            <SectionHeader icon={<Flame className="w-4 h-4" />} label="Activity" />
            <ActivityHeatmap data={heatmapData} />
          </motion.div>

          {/* ============================================================ */}
          {/*  12. SUBJECT PROGRESS                                         */}
          {/* ============================================================ */}
          {subjectStats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="mb-6"
            >
              <SectionHeader icon={<BarChart3 className="w-4 h-4" />} label="Subject Progress" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subjectStats.map((stat) => (
                  <div
                    key={stat.subjectId}
                    className="bg-white rounded-2xl border-2 border-gray-100 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#071952]/10 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-[#071952]" />
                        </div>
                        <h3 className="text-sm font-semibold text-[#071952]">
                          {stat.subjectName}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-[#071952] bg-[#071952]/10 px-2 py-0.5 rounded-full">
                        {stat.avgPercent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {stat.totalExams} exams
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        Best: {stat.bestScore}/{stat.totalMarks}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-[#071952] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, stat.avgPercent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  13. RECENT EXAM HISTORY                                      */}
          {/* ============================================================ */}
          {examHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (animationIndex++) * 0.1 }}
              className="mb-6"
            >
              <SectionHeader icon={<History className="w-4 h-4" />} label="Recent Exam History" />
              <div className="bg-white rounded-2xl border-2 border-gray-100 divide-y divide-gray-50">
                {examHistory.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#071952]/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-[#071952]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {exam.subjectName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(exam.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#071952]">
                        {exam.marksObtained}/{exam.totalMarks}
                      </p>
                      <p className="text-xs text-gray-400">{exam.percent}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
