import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  Mail,
  Loader2,
  CheckCircle2,
  UserPlus,
  ArrowLeft,
  SearchX,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import {
  getTeachers,
  getStudentEnrollments,
  enroll,
  unenroll,
  getTeacherSubjectCount,
} from "@/services/enrollmentService";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/database.types";
import { TeacherCardSkeletonGrid } from "@/components/SkeletonLoaders";

interface TeacherWithInfo extends ProfileRow {
  subjectCount: number;
}

export default function TeachersPage() {
  const { profile } = useAuth();
  const [teachers, setTeachers] = useState<TeacherWithInfo[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [buttonLoadingId, setButtonLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    try {
      const [allTeachers, enrollments] = await Promise.all([
        getTeachers(),
        getStudentEnrollments(profile.id),
      ]);

      const enrolledSet = new Set(enrollments.map((e) => e.teacher_id));
      setEnrolledIds(enrolledSet);

      const teachersWithCounts = await Promise.all(
        allTeachers.map(async (t) => {
          const subjectCount = await getTeacherSubjectCount(t.id);
          return { ...t, subjectCount };
        })
      );
      setTeachers(teachersWithCounts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadData();

    if (!profile) return;

    const channel = supabase
      .channel("teachers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollments" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, loadData]);

  const handleEnroll = async (teacherId: string) => {
    if (!profile) return;
    setButtonLoadingId(teacherId);
    try {
      await enroll(profile.id, teacherId);
      setEnrolledIds((prev) => new Set(prev).add(teacherId));
    } catch (e) {
      console.error(e);
    } finally {
      setButtonLoadingId(null);
    }
  };

  const handleUnenroll = async (teacherId: string) => {
    if (!profile) return;
    setButtonLoadingId(teacherId);
    try {
      await unenroll(profile.id, teacherId);
      setEnrolledIds((prev) => {
        const next = new Set(prev);
        next.delete(teacherId);
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setButtonLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link
            to="/exam-practice"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Practice
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#1e3a8a]" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Find Teachers</h1>
          </div>
        </motion.div>

        {loading ? (
          <TeacherCardSkeletonGrid count={6} />
        ) : teachers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <SearchX className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No teachers found.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map((teacher, i) => {
              const isCurrentlyEnrolled = enrolledIds.has(teacher.id);
              const isButtonLoading = buttonLoadingId === teacher.id;

              return (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="bg-card border border-border rounded-2xl p-5 transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {teacher.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{teacher.username}</h3>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="text-xs truncate">{teacher.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-4">
                    <BookOpen className="w-3.5 h-3.5 text-[#1e3a8a]" />
                    <span className="text-xs text-muted-foreground">
                      {teacher.subjectCount} {teacher.subjectCount === 1 ? "subject" : "subjects"}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      isCurrentlyEnrolled
                        ? handleUnenroll(teacher.id)
                        : handleEnroll(teacher.id)
                    }
                    disabled={isButtonLoading}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                      isCurrentlyEnrolled
                        ? "border border-green-500/30 text-green-600 hover:bg-red-50 hover:text-red-600 hover:border-red-500/30 dark:hover:bg-red-900/10"
                        : "bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90"
                    } disabled:opacity-50`}
                  >
                    {isButtonLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentlyEnrolled ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Enrolled
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Enroll
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
