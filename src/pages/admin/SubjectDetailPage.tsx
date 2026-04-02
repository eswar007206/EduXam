import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Pencil, HelpCircle, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  getSubjectById,
  getSubjectCategoryCounts,
  getSubjectQuestionsByCategory,
  deleteQuestion,
  QUESTION_CATEGORIES,
  type CategoryCounts,
  type QuestionCategory,
} from "@/services/adminService";
import type { QuestionRow, SubjectRow } from "@/lib/database.types";
import { QuestionListSkeleton } from "@/components/SkeletonLoaders";
import ExamTypeBadge from "@/components/ExamTypeBadge";

const PAGE_SIZE = 50;

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-gray-200 text-inherit rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function SubjectDetailPage() {
  const { id: subjectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<(SubjectRow & { department_name?: string }) | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({});
  const [activeCategory, setActiveCategory] = useState<QuestionCategory>(QUESTION_CATEGORIES[0]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [totalInCategory, setTotalInCategory] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadCounts = useCallback(async () => {
    if (!subjectId) return;
    const counts = await getSubjectCategoryCounts(subjectId);
    setCategoryCounts(counts);
  }, [subjectId]);

  const loadQuestions = useCallback(async (cat: QuestionCategory, p: number, search?: string) => {
    if (!subjectId) return;
    setQuestionsLoading(true);
    try {
      const result = await getSubjectQuestionsByCategory(subjectId, cat.type, cat.marks, p, PAGE_SIZE, search);
      setQuestions(result.data);
      setTotalInCategory(result.total);
    } catch (e) {
      console.error(e);
    } finally {
      setQuestionsLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    if (!subjectId) return;
    (async () => {
      try {
        const [sub] = await Promise.all([
          getSubjectById(subjectId),
          loadCounts(),
        ]);
        setSubject(sub);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [subjectId, loadCounts]);

  useEffect(() => {
    loadQuestions(activeCategory, page, searchQuery);
  }, [activeCategory, page, searchQuery, loadQuestions]);

  // Realtime subscription
  useEffect(() => {
    if (!subjectId) return;

    const channel = supabase
      .channel(`questions:${subjectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `subject_id=eq.${subjectId}` },
        () => {
          loadCounts();
          loadQuestions(activeCategory, page, searchQuery);
        }
      )
      .subscribe();

    return () => {
      const ch = channel;
      setTimeout(() => supabase.removeChannel(ch), 0);
    };
  }, [subjectId, activeCategory, page, searchQuery, loadCounts, loadQuestions]);

  const handleDelete = async (id: string) => {
    try {
      await deleteQuestion(id);
      setDeleteId(null);
      // Realtime will trigger refresh, but also do it immediately
      loadCounts();
      loadQuestions(activeCategory, page, searchQuery);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCategoryChange = (cat: QuestionCategory) => {
    setActiveCategory(cat);
    setPage(0);
    setSearchQuery("");
  };

  const totalPages = Math.ceil(totalInCategory / PAGE_SIZE);
  const totalQuestions = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="animate-pulse rounded bg-muted/60 w-5 h-5" />
          <div className="flex-1">
            <div className="animate-pulse rounded bg-muted/60 h-7 w-48 mb-2" />
            <div className="animate-pulse rounded bg-muted/60 h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-muted/60 h-10 w-28" />
          ))}
        </div>
        <QuestionListSkeleton count={5} />
      </div>
    );
  }

  if (!subject) {
    return <p className="text-muted-foreground text-center py-20">Subject not found.</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/teacher/subjects")}
          className="text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-foreground"
            >
              {subject.name}
            </motion.h1>
            <ExamTypeBadge examType={subject.exam_type ?? "main"} />
          </div>
          <p className="text-sm text-muted-foreground">
            {subject.department_name && `${subject.department_name} · `}{totalQuestions} questions total
          </p>
        </div>
        <button
          onClick={() => navigate(`/teacher/subjects/${subjectId}/questions/new?category=${activeCategory.key}`)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#071952] text-white rounded-xl hover:bg-[#071952]/80 transition-colors text-sm font-semibold shadow-md shadow-[#1e3a8a]/25"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {QUESTION_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition whitespace-nowrap ${
              activeCategory.key === cat.key
                ? "border-black bg-black/10 text-black"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            <span>{cat.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeCategory.key === cat.key
                ? "bg-[#071952] text-white"
                : cat.bgColor + " " + cat.color
            }`}>
              {categoryCounts[cat.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          placeholder={`Search ${activeCategory.label.toLowerCase()} questions...`}
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-[#071952] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setPage(0);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h2 className="text-lg font-bold text-foreground mb-2">Delete Question?</h2>
              <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-[#071952] hover:text-white transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 px-4 py-2 bg-[#071952] text-white rounded-lg hover:bg-[#071952]/80 transition text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions List */}
      {questionsLoading ? (
        <QuestionListSkeleton count={5} />
      ) : questions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {searchQuery
              ? `No ${activeCategory.label.toLowerCase()} questions matching "${searchQuery}".`
              : `No ${activeCategory.label.toLowerCase()} questions yet.`}
          </p>
        </motion.div>
      ) : (
        <>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-card border border-border rounded-xl p-4 flex items-start gap-4"
              >
                <span className="text-xs text-muted-foreground font-mono mt-1 shrink-0 w-8 text-right">
                  {page * PAGE_SIZE + i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm line-clamp-2">
                    <HighlightText text={q.text} query={searchQuery} />
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activeCategory.bgColor} ${activeCategory.color}`}>
                      {activeCategory.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{q.marks} marks</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => navigate(`/teacher/subjects/${subjectId}/questions/${q.id}`)}
                    className="p-2 text-muted-foreground hover:text-black transition rounded-lg hover:bg-black/10"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(q.id)}
                    className="p-2 text-muted-foreground hover:text-white transition rounded-lg hover:bg-[#071952]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalInCategory)} of {totalInCategory}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-border text-foreground hover:bg-[#071952] hover:text-white transition disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-foreground px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-border text-foreground hover:bg-[#071952] hover:text-white transition disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
