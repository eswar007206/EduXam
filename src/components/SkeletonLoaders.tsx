import { motion } from "framer-motion";

// ─── Shared shimmer block ──────────────────────────────────────────────────────
function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-gray-200 dark:bg-muted/60 ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent" />
    </div>
  );
}

// ─── 1. Subject Card (ExamPracticePage) ───────────────────────────────────────
// Real card: icon box (w-12 h-12 rounded-xl) · subject name · dept badge ·
//            question count chip · "Start" button
export function SubjectCardSkeleton() {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5">
      {/* icon box */}
      <Pulse className="w-12 h-12 rounded-xl mb-4" />
      {/* subject name */}
      <Pulse className="h-5 w-3/4 mb-2" />
      {/* department badge */}
      <Pulse className="h-4 w-1/2 mb-3" />
      {/* bottom row: question count chip */}
      <Pulse className="h-6 w-28 rounded-full" />
    </div>
  );
}

// ─── 2. Teacher Card (TeachersPage) ───────────────────────────────────────────
// Real card: avatar circle · username · mail-icon + email ·
//            book-icon + X subjects · Enroll button
export function TeacherCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      {/* avatar + name / email */}
      <div className="flex items-center gap-3 mb-3">
        <Pulse className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Pulse className="h-4 w-28" />
          <div className="flex items-center gap-1">
            <Pulse className="w-3 h-3 rounded-sm shrink-0" />
            <Pulse className="h-3 w-36" />
          </div>
        </div>
      </div>
      {/* subject count row */}
      <div className="flex items-center gap-1.5 mb-4">
        <Pulse className="w-3.5 h-3.5 rounded-sm shrink-0" />
        <Pulse className="h-3 w-20" />
      </div>
      {/* enroll button */}
      <Pulse className="h-9 w-full rounded-lg" />
    </div>
  );
}

// ─── 3. Stat Card (DashboardPage) ─────────────────────────────────────────────
// Real card: left = label (sm) + big number · right = icon box (w-11 h-11 rounded-xl)
export function StatCardSkeleton() {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* label */}
          <Pulse className="h-3 w-28 mb-3" />
          {/* big number */}
          <Pulse className="h-10 w-16" />
        </div>
        {/* icon box */}
        <Pulse className="w-11 h-11 rounded-xl shrink-0" />
      </div>
    </div>
  );
}

// ─── 4. Question Row (SubjectDetailPage) ──────────────────────────────────────
// Real card: left narrow number · centre = 2 text lines + badge + marks chip ·
//            right = edit + delete icon buttons
export function QuestionRowSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
      {/* number */}
      <Pulse className="w-8 h-4 mt-1 shrink-0 rounded-sm" />
      {/* text + tags */}
      <div className="flex-1 min-w-0">
        <Pulse className="h-4 w-full mb-2" />
        <Pulse className="h-4 w-3/4 mb-3" />
        <div className="flex items-center gap-2">
          <Pulse className="h-5 w-16 rounded-full" />
          <Pulse className="h-4 w-12" />
        </div>
      </div>
      {/* action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <Pulse className="w-8 h-8 rounded-lg" />
        <Pulse className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  );
}

// ─── 5. Admin Subject Card (SubjectsPage) ─────────────────────────────────────
// Real card: top row = [subject name + dept text + book-icon + count] | [trash icon] ·
export function AdminSubjectCardSkeleton() {
  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* subject name */}
          <Pulse className="h-5 w-40 mb-2" />
          {/* department */}
          <Pulse className="h-3 w-28 mb-3" />
          {/* book icon + question count */}
          <div className="flex items-center gap-1.5">
            <Pulse className="w-6 h-6 rounded-md shrink-0" />
            <Pulse className="h-3 w-24" />
          </div>
        </div>
        {/* delete icon */}
        <Pulse className="w-7 h-7 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

// ─── Grid / list wrappers ──────────────────────────────────────────────────────

export function SubjectCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <SubjectCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

export function TeacherCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <TeacherCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

export function QuestionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <QuestionRowSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

export function AdminSubjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <AdminSubjectCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

export function StatCardSkeletonRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <StatCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}
