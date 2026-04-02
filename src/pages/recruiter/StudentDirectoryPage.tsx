import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Search,
  Users,
  Loader2,
  ExternalLink,
  Linkedin,
  Github,
  Globe,
  BookOpen,
  BadgeCheck,
} from "lucide-react";
import { getAllStudentProfiles, getStudentSubjectStats, type StudentProfileData, type SubjectStat } from "@/services/studentProfileService";

export default function StudentDirectoryPage() {
  const [students, setStudents] = useState<(StudentProfileData & { stats?: SubjectStat[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const profiles = await getAllStudentProfiles();
        // Load basic stats for each student (batched)
        const withStats = await Promise.all(
          profiles.map(async (p) => {
            try {
              const stats = await getStudentSubjectStats(p.id);
              return { ...p, stats };
            } catch {
              return { ...p, stats: [] };
            }
          })
        );
        setStudents(withStats);
      } catch (err) {
        console.error("Failed to load students:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = students.filter((s) =>
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    (s.bio ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#071952]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-0 pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#071952]">Student Profiles</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse student profiles, view their exam performance and activity history.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students by name or bio..."
          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-[#071952] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#071952] focus:border-transparent"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-100">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {search ? "No students matching your search." : "No student profiles visible to you."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((student, i) => {
            const totalExams = (student.stats ?? []).reduce((sum, s) => sum + s.totalExams, 0);
            const avgPercent = (student.stats ?? []).length > 0
              ? Math.round((student.stats ?? []).reduce((sum, s) => sum + s.avgPercent, 0) / (student.stats ?? []).length)
              : 0;
            const verifiedUniversityLabel =
              student.university_name ?? student.university_short_name ?? null;
            const hasVerifiedUniversity = Boolean(student.is_university_verified && verifiedUniversityLabel);

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={`/profile/${student.id}`}
                  className="block bg-white rounded-xl border-2 border-gray-100 p-4 hover:border-[#071952]/20 hover:shadow-lg hover:shadow-[#071952]/5 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#071952] flex items-center justify-center text-white text-lg font-bold shrink-0">
                      {student.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#071952] truncate group-hover:text-[#071952]">
                          {student.username}
                        </h3>
                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-[#071952] transition-colors shrink-0" />
                      </div>
                      {hasVerifiedUniversity && (
                        <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                          <span className="truncate">{verifiedUniversityLabel}</span>
                          <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                        </div>
                      )}
                      {student.bio && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{student.bio}</p>
                      )}
                      {/* Social icons */}
                      <div className="flex items-center gap-2 mt-2">
                        {student.linkedin_url && (
                          <span className="text-gray-300"><Linkedin className="w-3.5 h-3.5" /></span>
                        )}
                        {student.github_url && (
                          <span className="text-gray-300"><Github className="w-3.5 h-3.5" /></span>
                        )}
                        {student.portfolio_url && (
                          <span className="text-gray-300"><Globe className="w-3.5 h-3.5" /></span>
                        )}
                      </div>
                    </div>
                    {/* Stats badge */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <BookOpen className="w-3 h-3" />
                        <span>{totalExams} exams</span>
                      </div>
                      {avgPercent > 0 && (
                        <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                          avgPercent >= 70 ? "bg-green-50 text-green-600" :
                          avgPercent >= 40 ? "bg-amber-50 text-amber-600" :
                          "bg-gray-50 text-gray-400"
                        }`}>
                          {avgPercent}% avg
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
