import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, BookOpen, Loader2, X, FolderOpen, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getTeacherSubjects,
  getDepartments,
  createDepartment,
  createSubject,
  deleteSubject,
} from "@/services/adminService";
import { supabase } from "@/lib/supabase";
import type { DepartmentRow, SubjectRow } from "@/lib/database.types";
import { AdminSubjectGridSkeleton } from "@/components/SkeletonLoaders";

type SortOption = "name-asc" | "name-desc" | "questions-desc" | "questions-asc";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function SubjectsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<(SubjectRow & { department_name?: string; question_count?: number })[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [subjectName, setSubjectName] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [filterDept, setFilterDept] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!profile) return;
    try {
      const [subs, depts] = await Promise.all([
        getTeacherSubjects(profile.id),
        getDepartments(),
      ]);
      setSubjects(subs);
      setDepartments(depts);
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
      .channel("subjects-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions" },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, loadData]);

  // Filtered and sorted subjects
  const filteredSubjects = useMemo(() => {
    let result = [...subjects];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.department_name && s.department_name.toLowerCase().includes(q))
      );
    }

    // Department filter
    if (filterDept) {
      result = result.filter((s) => s.department_id === filterDept);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "questions-desc":
          return (b.question_count ?? 0) - (a.question_count ?? 0);
        case "questions-asc":
          return (a.question_count ?? 0) - (b.question_count ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [subjects, searchQuery, sortBy, filterDept]);

  const handleCreate = async () => {
    if (!profile || !subjectName.trim()) return;
    setCreating(true);
    try {
      let deptId = selectedDeptId;

      if (selectedDeptId === "__new__" && newDeptName.trim()) {
        const dept = await createDepartment(newDeptName.trim(), slugify(newDeptName), profile.id);
        deptId = dept.id;
      }

      if (!deptId || deptId === "__new__") return;

      await createSubject(subjectName.trim(), slugify(subjectName), deptId, profile.id);

      setShowCreate(false);
      setSubjectName("");
      setSelectedDeptId("");
      setNewDeptName("");
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubject(id);
      setDeleteId(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const inputClasses =
    "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm transition-all";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900"
        >
          My Subjects
        </motion.h1>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e3a8a] text-white rounded-xl hover:bg-[#162d6e] transition-colors text-sm font-semibold shadow-md shadow-[#1e3a8a]/25"
        >
          <Plus className="w-4 h-4" />
          Create Subject
        </motion.button>
      </div>

      {/* Search, Filter, Sort Bar */}
      {!loading && subjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="questions-desc">Most Questions</option>
            <option value="questions-asc">Fewest Questions</option>
          </select>
        </motion.div>
      )}

      {/* Create Subject Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Create Subject</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className={inputClasses}
                  >
                    <option value="">Select a department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                    <option value="__new__">+ Create New Department</option>
                  </select>
                </div>

                {selectedDeptId === "__new__" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Department Name</label>
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className={inputClasses}
                      placeholder="e.g. Department of Science"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Name</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className={inputClasses}
                    placeholder="e.g. Linear Algebra"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !subjectName.trim() || (!selectedDeptId || (selectedDeptId === "__new__" && !newDeptName.trim()))}
                    className="flex-1 px-4 py-2.5 bg-[#1e3a8a] text-white rounded-xl hover:bg-[#162d6e] transition text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-[#1e3a8a]/25"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Subject?</h2>
              <p className="text-sm text-gray-500 mb-5">
                This will also delete all questions in this subject. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-semibold shadow-md shadow-red-600/25"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <AdminSubjectGridSkeleton count={6} />
      ) : subjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#1e3a8a]/10 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-[#1e3a8a]" />
          </div>
          <p className="text-gray-500 font-medium">No subjects yet.</p>
          <p className="text-gray-400 text-sm mt-1">Create your first subject to get started.</p>
        </motion.div>
      ) : filteredSubjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No subjects match your search.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-[#1e3a8a]/20 transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/admin/subjects/${sub.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-[#1e3a8a] transition-colors truncate">
                    {sub.name}
                  </h3>
                  {sub.department_name && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{sub.department_name}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-3">
                    <div className="w-6 h-6 rounded-md bg-[#1e3a8a]/10 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5 text-[#1e3a8a]" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {sub.question_count ?? 0} questions
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(sub.id);
                  }}
                  className="text-gray-300 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
