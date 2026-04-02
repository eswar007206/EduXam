import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, BookOpen, Loader2, X, FolderOpen, Search, ShieldCheck, RotateCcw, PencilLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getTeacherSubjects,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createSubject,
  deleteSubject,
} from "@/services/adminService";
import { supabase } from "@/lib/supabase";
import type { DepartmentRow, SubjectRow } from "@/lib/database.types";
import { AdminSubjectGridSkeleton } from "@/components/SkeletonLoaders";
import DropdownMenu from "@/shared/ui/dropdown-menu";
import { requestMainExamApproval, switchSubjectToPrep } from "@/services/examGovernanceService";

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
  const [examType, setExamType] = useState<SubjectRow["exam_type"]>("main");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mainExamTitle, setMainExamTitle] = useState("");
  const [mainExamDescription, setMainExamDescription] = useState("");
  const [mainExamInstructions, setMainExamInstructions] = useState("");
  const [mainExamDuration, setMainExamDuration] = useState("90");
  const [mainExamSemester, setMainExamSemester] = useState("");
  const [mainExamTargetDepartment, setMainExamTargetDepartment] = useState("");
  const [mainExamExpectedStudents, setMainExamExpectedStudents] = useState("");
  const [requestingMainSubjectId, setRequestingMainSubjectId] = useState<string | null>(null);
  const [requestMainSubject, setRequestMainSubject] = useState<(SubjectRow & { department_name?: string; question_count?: number }) | null>(null);
  const [switchPrepSubjectId, setSwitchPrepSubjectId] = useState<string | null>(null);
  const [mainExamRequestError, setMainExamRequestError] = useState("");

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [filterDept, setFilterDept] = useState<string>("");
  const [departmentDraft, setDepartmentDraft] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [departmentSubmitting, setDepartmentSubmitting] = useState(false);
  const [departmentError, setDepartmentError] = useState("");

  const loadData = useCallback(async () => {
    if (!profile) return;
    try {
      const [subs, depts] = await Promise.all([
        getTeacherSubjects(profile.id),
        getDepartments(profile.university_id),
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
      const ch = channel;
      setTimeout(() => supabase.removeChannel(ch), 0);
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
      if (!selectedDeptId) return;

      const created = await createSubject(
        subjectName.trim(),
        slugify(subjectName),
        selectedDeptId,
        profile.id,
        profile.university_id,
        examType === "main" ? "prep" : examType
      );

      if (examType === "main") {
        await requestMainExamApproval({
          subjectId: created.id,
          teacherId: profile.id,
          universityId: profile.university_id,
          title: mainExamTitle.trim() || created.name,
          description: mainExamDescription.trim() || null,
          instructions: mainExamInstructions.trim(),
          durationMinutes: Number(mainExamDuration) || 90,
          targetSemester: mainExamSemester.trim() || null,
          targetDepartment: mainExamTargetDepartment.trim() || null,
          expectedStudents: mainExamExpectedStudents ? Number(mainExamExpectedStudents) : null,
        });
      } else {
        const { notifyPrepExamCreated } = await import("@/services/notificationService");
        await notifyPrepExamCreated(profile.id, created.id, created.name).catch(() => {});
      }

      setShowCreate(false);
      setSubjectName("");
      setExamType("main");
      setSelectedDeptId("");
      resetMainExamRequestFields();
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

  const resetDepartmentEditor = () => {
    setDepartmentDraft("");
    setEditingDepartmentId(null);
    setDepartmentError("");
  };

  const handleSaveDepartment = async () => {
    if (!profile?.university_id || !departmentDraft.trim()) return;

    setDepartmentSubmitting(true);
    setDepartmentError("");

    try {
      const normalizedName = departmentDraft.trim();
      const normalizedSlug = slugify(normalizedName);

      if (editingDepartmentId) {
        await updateDepartment(editingDepartmentId, {
          name: normalizedName,
          slug: normalizedSlug,
        });
      } else {
        await createDepartment(normalizedName, normalizedSlug, profile.university_id, profile.id);
      }

      resetDepartmentEditor();
      await loadData();
    } catch (error) {
      console.error(error);
      setDepartmentError(
        error instanceof Error
          ? error.message
          : "Unable to save the department right now."
      );
    } finally {
      setDepartmentSubmitting(false);
    }
  };

  const handleEditDepartment = (department: DepartmentRow) => {
    setDepartmentDraft(department.name);
    setEditingDepartmentId(department.id);
    setDepartmentError("");
  };

  const handleDeleteDepartment = async (department: DepartmentRow) => {
    const shouldDelete = window.confirm(`Delete "${department.name}"? Subjects in this department may need to be moved first.`);
    if (!shouldDelete) return;

    setDepartmentSubmitting(true);
    setDepartmentError("");

    try {
      await deleteDepartment(department.id);
      if (editingDepartmentId === department.id) {
        resetDepartmentEditor();
      }
      await loadData();
    } catch (error) {
      console.error(error);
      setDepartmentError(
        error instanceof Error
          ? error.message
          : "Unable to delete the department right now."
      );
    } finally {
      setDepartmentSubmitting(false);
    }
  };

  const handleRequestMainExam = async () => {
    if (!profile || !requestMainSubject || !mainExamTitle.trim() || !mainExamInstructions.trim()) return;
    setMainExamRequestError("");
    setRequestingMainSubjectId(requestMainSubject.id);
    try {
      await requestMainExamApproval({
        subjectId: requestMainSubject.id,
        teacherId: profile.id,
        universityId: profile.university_id,
        title: mainExamTitle.trim(),
        description: mainExamDescription.trim() || null,
        instructions: mainExamInstructions.trim(),
        durationMinutes: Number(mainExamDuration) || 90,
        targetSemester: mainExamSemester.trim() || null,
        targetDepartment: mainExamTargetDepartment.trim() || requestMainSubject.department_name || null,
        expectedStudents: mainExamExpectedStudents ? Number(mainExamExpectedStudents) : null,
      });
      setRequestMainSubject(null);
      resetMainExamRequestFields();
      await loadData();
    } catch (error) {
      console.error(error);
      setMainExamRequestError(
        error instanceof Error
          ? error.message
          : "Unable to save the exam portal request right now."
      );
    } finally {
      setRequestingMainSubjectId(null);
    }
  };

  const handleSwitchToPrep = async () => {
    if (!profile || !switchPrepSubjectId) return;
    try {
      await switchSubjectToPrep(switchPrepSubjectId, profile.id);
      setSwitchPrepSubjectId(null);
      await loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const inputClasses =
    "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[#071952] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm transition-all";

  const resetMainExamRequestFields = () => {
    setMainExamRequestError("");
    setMainExamTitle("");
    setMainExamDescription("");
    setMainExamInstructions("");
    setMainExamDuration("90");
    setMainExamSemester("");
    setMainExamTargetDepartment("");
    setMainExamExpectedStudents("");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-[#071952]"
          >
            My Subjects
          </motion.h1>
          <p className="text-sm text-gray-500 mt-1">
            Create subjects, manage your organization departments, and keep your exam workspace organized.
          </p>
        </div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#071952] text-white rounded-xl hover:bg-[#071952]/80 transition-colors text-sm font-semibold shadow-md shadow-[#1e3a8a]/25"
        >
          <Plus className="w-4 h-4" />
          Create Subject
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#071952]">Department Workspace</h2>
            <p className="text-sm text-gray-500">
              Add, rename, and remove the departments you use for subject creation.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={departmentDraft}
            onChange={(event) => setDepartmentDraft(event.target.value)}
            placeholder="Department of Engineering"
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
          />
          <button
            onClick={handleSaveDepartment}
            disabled={departmentSubmitting || !departmentDraft.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#071952] text-white font-semibold disabled:opacity-50"
          >
            {departmentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingDepartmentId ? <PencilLine className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingDepartmentId ? "Save Department" : "Add Department"}
          </button>
          {editingDepartmentId && (
            <button
              onClick={resetDepartmentEditor}
              disabled={departmentSubmitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[#071952] font-semibold disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>

        {departmentError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {departmentError}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {departments.length === 0 ? (
            <p className="text-sm text-gray-500">No departments added yet.</p>
          ) : (
            departments.map((department) => (
              <div
                key={department.id}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-[#071952]"
              >
                <span>{department.name}</span>
                <button
                  onClick={() => handleEditDepartment(department)}
                  className="text-gray-400 hover:text-[#071952] transition-colors"
                  title={`Edit ${department.name}`}
                >
                  <PencilLine className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteDepartment(department)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title={`Delete ${department.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>

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
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[#071952] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
            />
          </div>
          <DropdownMenu
            value={filterDept}
            onChange={setFilterDept}
            placeholder="All Departments"
            items={[
              { label: "All Departments", value: "" },
              ...departments.map((d) => ({ label: d.name, value: d.id })),
            ]}
          />
          <DropdownMenu
            value={sortBy}
            onChange={(v) => setSortBy(v as SortOption)}
            items={[
              { label: "Name A–Z", value: "name-asc" },
              { label: "Name Z–A", value: "name-desc" },
              { label: "Most Questions", value: "questions-desc" },
              { label: "Fewest Questions", value: "questions-asc" },
            ]}
          />
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
                <h2 className="text-lg font-bold text-[#071952]">Create Subject</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-[#071952]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">Department</label>
                  <DropdownMenu
                    fullWidth
                    value={selectedDeptId}
                    onChange={setSelectedDeptId}
                    placeholder="Select a department"
                    items={[
                      ...departments.map((d) => ({ label: d.name, value: d.id })),
                    ]}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Need a new department? Add or rename it from the department workspace above.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">Subject Name</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className={inputClasses}
                    placeholder="e.g. Linear Algebra"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#071952] mb-1.5">Exam Type</label>
                  <DropdownMenu
                    fullWidth
                    value={examType}
                    onChange={(value) => setExamType(value as SubjectRow["exam_type"])}
                    items={[
                      { label: "Exam Portal", value: "main" },
                      { label: "Prep Exam", value: "prep" },
                    ]}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Exam portal subjects are strict and single-attempt. Prep exams are unlimited practice exams.
                  </p>
                </div>

                {examType === "main" && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Exam portal request</p>
                        <p className="text-xs text-amber-700 mt-1">
                          This subject will be created safely, then sent to the Admin Portal for approval and slot scheduling.
                        </p>
                      </div>
                    </div>

                    <input
                      value={mainExamTitle}
                      onChange={(event) => setMainExamTitle(event.target.value)}
                      placeholder="Exam title"
                      className={inputClasses}
                    />
                    <textarea
                      value={mainExamDescription}
                      onChange={(event) => setMainExamDescription(event.target.value)}
                      placeholder="Exam description"
                      rows={2}
                      className={`${inputClasses} resize-none`}
                    />
                    <textarea
                      value={mainExamInstructions}
                      onChange={(event) => setMainExamInstructions(event.target.value)}
                      placeholder="Required instructions for students"
                      rows={3}
                      className={`${inputClasses} resize-none`}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        value={mainExamDuration}
                        onChange={(event) => setMainExamDuration(event.target.value)}
                        placeholder="Duration in minutes"
                        className={inputClasses}
                      />
                      <input
                        value={mainExamExpectedStudents}
                        onChange={(event) => setMainExamExpectedStudents(event.target.value)}
                        placeholder="Expected students"
                        className={inputClasses}
                      />
                      <input
                        value={mainExamSemester}
                        onChange={(event) => setMainExamSemester(event.target.value)}
                        placeholder="Target semester"
                        className={inputClasses}
                      />
                      <input
                        value={mainExamTargetDepartment}
                        onChange={(event) => setMainExamTargetDepartment(event.target.value)}
                        placeholder="Target department or cohort"
                        className={inputClasses}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[#071952] hover:bg-[#071952] hover:text-white transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={
                      creating ||
                      !subjectName.trim() ||
                      !selectedDeptId ||
                      (examType === "main" && (!mainExamTitle.trim() || !mainExamInstructions.trim()))
                    }
                    className="flex-1 px-4 py-2.5 bg-[#071952] text-white rounded-xl hover:bg-[#071952]/80 transition text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-[#1e3a8a]/25"
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
              <h2 className="text-lg font-bold text-[#071952] mb-2">Delete Subject?</h2>
              <p className="text-sm text-gray-500 mb-5">
                This will also delete all questions in this subject. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[#071952] hover:bg-[#071952] hover:text-white transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 px-4 py-2.5 bg-[#071952] text-white rounded-xl hover:bg-[#071952]/80 transition text-sm font-semibold shadow-md shadow-[#1e3a8a]/25"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {requestMainSubject && (
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
              className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-[#071952]">Request Exam Portal Approval</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {requestMainSubject.name} will stay safe until an admin approves it and schedules the exam slots.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRequestMainSubject(null);
                    resetMainExamRequestFields();
                  }}
                  className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-[#071952]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  value={mainExamTitle}
                  onChange={(event) => setMainExamTitle(event.target.value)}
                  placeholder="Exam title"
                  className={inputClasses}
                />
                <textarea
                  value={mainExamDescription}
                  onChange={(event) => setMainExamDescription(event.target.value)}
                  placeholder="Exam description"
                  rows={2}
                  className={`${inputClasses} resize-none`}
                />
                <textarea
                  value={mainExamInstructions}
                  onChange={(event) => setMainExamInstructions(event.target.value)}
                  placeholder="Required instructions for students"
                  rows={4}
                  className={`${inputClasses} resize-none`}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={mainExamDuration}
                    onChange={(event) => setMainExamDuration(event.target.value)}
                    placeholder="Duration in minutes"
                    className={inputClasses}
                  />
                  <input
                    value={mainExamExpectedStudents}
                    onChange={(event) => setMainExamExpectedStudents(event.target.value)}
                    placeholder="Expected students"
                    className={inputClasses}
                  />
                  <input
                    value={mainExamSemester}
                    onChange={(event) => setMainExamSemester(event.target.value)}
                    placeholder="Target semester"
                    className={inputClasses}
                  />
                  <input
                    value={mainExamTargetDepartment}
                    onChange={(event) => setMainExamTargetDepartment(event.target.value)}
                    placeholder="Target department or cohort"
                    className={inputClasses}
                  />
                </div>

                {mainExamRequestError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-medium text-red-700">{mainExamRequestError}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => {
                    setRequestMainSubject(null);
                    resetMainExamRequestFields();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[#071952] hover:bg-[#071952] hover:text-white transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestMainExam}
                  disabled={requestingMainSubjectId === requestMainSubject.id || !mainExamTitle.trim() || !mainExamInstructions.trim()}
                  className="flex-1 px-4 py-2.5 bg-[#071952] text-white rounded-xl hover:bg-[#071952]/80 transition text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-[#1e3a8a]/25"
                >
                  {requestingMainSubjectId === requestMainSubject.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Confirm Exam Portal Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {switchPrepSubjectId && (
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
              <h2 className="text-lg font-bold text-[#071952] mb-2">Switch Back to Prep?</h2>
              <p className="text-sm text-gray-500 mb-5">
                This removes the subject from the exam portal workflow and sends students back to unlimited practice mode.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSwitchPrepSubjectId(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[#071952] hover:bg-[#071952] hover:text-white transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSwitchToPrep}
                  className="flex-1 px-4 py-2.5 bg-[#071952] text-white rounded-xl hover:bg-[#071952]/80 transition text-sm font-semibold shadow-md shadow-[#1e3a8a]/25"
                >
                  Switch to Prep
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
          <div className="w-16 h-16 rounded-2xl bg-black/10 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-black" />
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
              className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-black/20 transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/teacher/subjects/${sub.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-[#071952] group-hover:text-black transition-colors truncate">
                      {sub.name}
                    </h3>
                    <span className={`shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      sub.exam_type === "prep"
                        ? "bg-sky-100 text-sky-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {sub.exam_type}
                    </span>
                    {sub.exam_type_status === "pending_approval" && sub.pending_exam_type === "main" && (
                      <span className="shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                        pending admin approval
                      </span>
                    )}
                  </div>
                  {sub.department_name && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{sub.department_name}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {sub.exam_type_status === "pending_approval" && sub.pending_exam_type === "main"
                      ? "Waiting for admin approval before becoming an exam portal subject."
                      : sub.exam_type === "prep"
                        ? "Unlimited student practice"
                        : "Admin-governed exam portal"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <div className="w-6 h-6 rounded-md bg-black/10 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5 text-black" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {sub.question_count ?? 0} questions
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {sub.exam_type === "prep" && sub.exam_type_status !== "pending_approval" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          resetMainExamRequestFields();
                          setMainExamTitle(`Exam Portal - ${sub.name}`);
                          setMainExamTargetDepartment(sub.department_name || "");
                          setRequestMainSubject(sub);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Switch to Exam Portal
                      </button>
                    )}
                    {sub.exam_type === "main" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSwitchPrepSubjectId(sub.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Switch to Prep
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(sub.id);
                    }}
                    className="text-gray-300 hover:text-white transition p-1.5 rounded-lg hover:bg-[#071952]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
