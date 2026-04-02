import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  Circle,
  CheckCircle2,
  CircleQuestionMark,
  ClipboardList,
  Clock3,
  CodeXml,
  Diamond,
  Eraser,
  FileText,
  Globe,
  Heart,
  Hexagon,
  Microscope,
  Minus,
  Paintbrush,
  Pencil,
  Pentagon,
  Plus,
  Redo2,
  Search,
  Shapes,
  Square,
  Sparkles,
  Star,
  Target,
  Terminal,
  Trophy,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Upload,
  Users,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  getStudentExamEntryLabel,
  getStudentExamEntryPath,
  getVerifiedMemberLabel,
} from "@/lib/organizationFeatures";

gsap.registerPlugin(ScrollTrigger);

const BACKGROUND_COLOR = "#C3C7F4";
const PENCIL_ORBIT_PATH =
  "M 240 185 C 430 78, 995 74, 1148 238 C 1288 388, 1216 656, 938 726 C 656 798, 322 770, 225 596 C 150 458, 158 274, 240 185 Z";
const PENCIL_ORBIT_LOOPS = 2.6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface BlobButtonProps {
  to: string;
  children: ReactNode;
  className?: string;
}

interface FeatureCardData {
  Icon: LucideIcon;
  title: string;
  description: string;
  chips: string[];
  iconClass: string;
  surfaceClass: string;
}

interface EvaluationMode {
  tag: string;
  Icon: LucideIcon;
  title: string;
  description: string;
  badges: string[];
  iconClass: string;
  iconWrapClass: string;
  cardClass: string;
  badgeClass: string;
  grade: string;
  gradeClass: string;
}

const teacherFeatureCards: FeatureCardData[] = [
  {
    Icon: BookOpen,
    title: "Create Subjects",
    description:
      "Organize every classroom into clean subject spaces with a syllabus-first workflow.",
    chips: ["Curriculum ready", "Teacher-owned"],
    iconClass: "text-indigo-600",
    surfaceClass: "from-indigo-50 to-[#eef0ff] border-indigo-100",
  },
  {
    Icon: CircleQuestionMark,
    title: "Add Questions",
    description:
      "Build MCQ, subjective, math, and code questions from the same streamlined authoring flow.",
    chips: ["Mixed formats", "Fast authoring"],
    iconClass: "text-rose-500",
    surfaceClass: "from-rose-50 to-[#f7eef7] border-rose-100",
  },
  {
    Icon: Search,
    title: "Review Submissions",
    description:
      "Scan each submission with clarity, filter by status, and jump straight into the right answer set.",
    chips: ["Review queue", "Submission clarity"],
    iconClass: "text-amber-600",
    surfaceClass: "from-amber-50 to-[#f7f0e8] border-amber-100",
  },
  {
    Icon: Sparkles,
    title: "Evaluate & Grade",
    description:
      "Blend teacher judgment with AI assistance to publish clear, useful feedback at speed.",
    chips: ["AI assisted", "Detailed feedback"],
    iconClass: "text-sky-600",
    surfaceClass: "from-sky-50 to-[#eef3ff] border-sky-100",
  },
];

const evaluationModes: EvaluationMode[] = [
  {
    tag: "Super Teacher",
    Icon: Brain,
    title: "AI-Powered Grading",
    description:
      "Submit your exam and get instant feedback with marks per question, an overall grade, and next-step guidance.",
    badges: ["Instant results", "Marks per question", "AI feedback"],
    iconClass: "text-sky-600",
    iconWrapClass: "bg-sky-100",
    cardClass: "bg-sky-50 border-sky-200 hover:border-sky-400",
    badgeClass: "bg-sky-100 text-sky-700 border-sky-200",
    grade: "A+",
    gradeClass: "bg-sky-600 text-white",
  },
  {
    tag: "Super Teacher + Teacher",
    Icon: Sparkles,
    title: "AI + Human Combined",
    description:
      "The AI evaluates first, then your teacher reviews, adjusts marks, and adds final guidance before publishing.",
    badges: ["AI first pass", "Teacher adjustment", "Double-checked"],
    iconClass: "text-violet-600",
    iconWrapClass: "bg-violet-100",
    cardClass: "bg-violet-50 border-violet-200 hover:border-violet-400",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
    grade: "A",
    gradeClass: "bg-violet-600 text-white",
  },
  {
    tag: "Teacher Graded",
    Icon: Users,
    title: "Manual Teacher Review",
    description:
      "Your teacher manually checks each answer, assigns marks question by question, and shares personal feedback.",
    badges: ["Manual review", "Per-question marks", "Personal feedback"],
    iconClass: "text-teal-600",
    iconWrapClass: "bg-teal-100",
    cardClass: "bg-teal-50 border-teal-200 hover:border-teal-400",
    badgeClass: "bg-teal-100 text-teal-700 border-teal-200",
    grade: "B+",
    gradeClass: "bg-teal-600 text-white",
  },
];

function BlobButton({ to, children, className = "" }: BlobButtonProps) {
  return (
    <Link to={to} className={`blob-btn ${className}`.trim()}>
      {children}
      <ArrowRight size={18} className="relative z-10" />
      <span className="blob-btn__inner">
        <span className="blob-btn__blobs">
          <span className="blob-btn__blob" />
          <span className="blob-btn__blob" />
          <span className="blob-btn__blob" />
          <span className="blob-btn__blob" />
        </span>
      </span>
    </Link>
  );
}

function SectionHeader({
  badge,
  title,
  accent,
  description,
  Icon,
  dark = false,
}: {
  badge: string;
  title: string;
  accent: string;
  description: string;
  Icon: LucideIcon;
  dark?: boolean;
}) {
  const badgeClass = dark
    ? "bg-white/10 text-sky-200 border-white/15"
    : "bg-sky-50 text-sky-700 border-sky-200";
  const titleClass = dark ? "text-white" : "text-foreground";
  const accentClass = dark ? "text-sky-300" : "text-sky-600";
  const bodyClass = dark ? "text-slate-300" : "text-muted-foreground";

  return (
    <div className="gs-section-head mb-16 text-center">
      <div
        className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold ${badgeClass}`}
      >
        <Icon size={12} />
        <span>{badge}</span>
      </div>
      <h2 className={`mb-5 text-4xl font-extrabold tracking-tight md:text-5xl ${titleClass}`}>
        {title} <span className={accentClass}>{accent}</span>
      </h2>
      <p className={`mx-auto max-w-3xl text-xl leading-relaxed ${bodyClass}`}>{description}</p>
    </div>
  );
}

function TeacherHeroVisual() {
  const stats = [
    { label: "Subjects", value: "4", Icon: BookOpen, iconWrap: "bg-indigo-50", iconClass: "text-indigo-600" },
    { label: "Questions", value: "128", Icon: CircleQuestionMark, iconWrap: "bg-rose-50", iconClass: "text-rose-500" },
    { label: "Students", value: "47", Icon: Users, iconWrap: "bg-teal-50", iconClass: "text-teal-600" },
    { label: "Pending", value: "12", Icon: ClipboardList, iconWrap: "bg-amber-50", iconClass: "text-amber-600" },
  ];

  const submissions = [
    { student: "Ananya Sharma", exam: "Physics Unit Test", status: "Pending review", badge: "bg-amber-100 text-amber-700" },
    { student: "Rahul Mehta", exam: "Math Practice Set", status: "AI draft ready", badge: "bg-sky-100 text-sky-700" },
    { student: "Isha Patel", exam: "Chemistry Revision", status: "Published", badge: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-8 rounded-full bg-primary/12 blur-[80px]" />

      <div className="absolute right-14 top-20 z-10 origin-top-right -rotate-6 scale-95">
        <div className="animate-bob-1">
          <div className="animate-glow w-[22rem] overflow-hidden rounded-[2rem] border border-white/60 bg-[rgba(245,246,255,0.82)] shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
            <div className="border-b border-slate-200/80 px-4 pb-3 pt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Sparkles size={16} className="text-primary" />
                <span>Good afternoon, Ashwini</span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Here&apos;s an overview of your teaching activity.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2.5 p-3">
              {stats.map(({ label, value, Icon, iconWrap, iconClass }) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-white/80 p-3 text-center shadow-sm">
                  <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-2xl ${iconWrap}`}>
                    <Icon size={16} className={iconClass} />
                  </div>
                  <p className="text-lg font-black leading-none text-slate-900">{value}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="px-3 pb-4">
              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">Quick Actions</p>
                  <span className="text-[10px] font-semibold text-primary">This week</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "New Subject", Icon: Plus, className: "bg-indigo-50 text-indigo-600" },
                    { label: "Review", Icon: Search, className: "bg-amber-50 text-amber-600" },
                    { label: "Syllabus", Icon: FileText, className: "bg-sky-50 text-sky-600" },
                  ].map(({ label, Icon, className }) => (
                    <div key={label} className="rounded-2xl border border-white bg-white px-3 py-2.5 shadow-sm">
                      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${className}`}>
                        <Icon size={14} />
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 z-20 rotate-[5deg]">
        <div className="animate-bob-2">
          <div className="w-[24rem] overflow-hidden rounded-[2rem] border border-slate-200/70 bg-[rgba(246,247,255,0.88)] shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
            <div className="border-b border-slate-200 px-5 pb-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Student Submissions</p>
                  <p className="text-[10px] text-slate-500">Latest activity across all subjects</p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-[10px] font-semibold text-slate-500">
                  <span className="rounded-full bg-white px-2.5 py-1 text-slate-800 shadow-sm">Latest</span>
                  <span className="px-2.5 py-1">Pending</span>
                  <span className="px-2.5 py-1">Reviewed</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {submissions.map((item) => (
                <div
                  key={item.student}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{item.student}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.exam}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.badge}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LearnerHeroVisual({
  timerValue,
}: {
  timerValue: number;
}) {
  const performanceStats = [
    { label: "Accuracy", value: "84%", Icon: Target, className: "text-sky-600" },
    { label: "Improvement", value: "+12%", Icon: TrendingUp, className: "text-emerald-600" },
    { label: "Time Spent", value: "5h 40m", Icon: Clock3, className: "text-violet-600" },
  ];
  const weekBars = [58, 72, 66, 84, 78, 92, 88];
  const miniRingRadius = 18;
  const miniCircumference = 2 * Math.PI * miniRingRadius;
  const miniProgress = (60 - timerValue) / 60;
  const miniOffset = miniCircumference - miniProgress * miniCircumference;

  return (
    <div className="relative h-full w-full lg:scale-[0.9] xl:scale-100">
      <div className="absolute inset-8 rounded-full bg-primary/12 blur-[80px]" />

      <div className="absolute right-5 top-10 z-10 origin-top-right -rotate-6 xl:right-8 xl:top-16">
        <div className="animate-bob-1">
          <div className="animate-glow w-[20.5rem] overflow-hidden rounded-[2rem] border border-white/60 bg-[rgba(245,246,255,0.84)] shadow-2xl shadow-slate-900/20 backdrop-blur-xl xl:w-[24rem]">
            <div className="border-b border-slate-200 px-4 pb-3 pt-4 xl:px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">AI Quiz Generator</p>
                  <p className="text-[10px] text-slate-500">From source material to practice set</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  Active
                </div>
              </div>
            </div>

            <div className="p-4 xl:p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { label: "Uploaded PDF", Icon: Upload, className: "bg-sky-50 text-sky-700 border-sky-100" },
                  { label: "Adaptive", Icon: Sparkles, className: "bg-violet-50 text-violet-700 border-violet-100" },
                  { label: "Auto", Icon: Zap, className: "bg-amber-50 text-amber-700 border-amber-100" },
                ].map(({ label, Icon, className }) => (
                  <div
                    key={label}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold ${className}`}
                  >
                    <Icon size={12} />
                    {label}
                  </div>
                ))}
              </div>

              <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Generation Progress</span>
                  <span className="text-sm font-black text-slate-900">72%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500" />
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span className="line-through opacity-60">Extracting Topics</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span className="line-through opacity-60">Building MCQ Pool</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                    <span className="relative ml-1 mr-1 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-900 opacity-50" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-900" />
                    </span>
                    <span>Generating Questions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-2 left-2 z-20 rotate-[4deg] xl:bottom-4 xl:left-4">
        <div className="animate-bob-2">
          <div className="w-[19.75rem] overflow-hidden rounded-[2rem] border border-slate-200/70 bg-[rgba(246,247,255,0.88)] shadow-2xl shadow-slate-900/20 backdrop-blur-xl xl:w-[23rem]">
            <div className="border-b border-slate-200 px-4 pb-3 pt-4 xl:px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Performance</p>
                  <p className="text-[10px] text-slate-500">This week&apos;s momentum</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <svg className="-rotate-90" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(14,165,233,0.15)" strokeWidth="4" />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={miniCircumference}
                      strokeDashoffset={miniOffset}
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="p-4 xl:p-5">
              <div className="grid grid-cols-3 gap-2.5 xl:gap-3">
                {performanceStats.map(({ label, value, Icon, className }) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5 xl:p-3">
                    <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white ${className}`}>
                      <Icon size={15} />
                    </div>
                    <p className="text-sm font-black text-slate-900">{value}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">Weekly Activity</p>
                  <span className="text-xs font-semibold text-slate-500">00:{String(timerValue).padStart(2, "0")}</span>
                </div>
                <div className="flex items-end gap-2">
                  {weekBars.map((value, index) => (
                    <div key={index} className="flex-1">
                      <div
                        className="w-full rounded-full bg-gradient-to-t from-sky-500 to-violet-500"
                        style={{ height: `${value}px` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Brain size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">AI Insight</p>
                    <p className="mt-1 text-xs text-slate-500">Strong in Algebra. Geometry proofs need another round.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherFeatures() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
      {teacherFeatureCards.map(({ Icon, title, description, chips, iconClass, surfaceClass }, index) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08, duration: 0.5 }}
          className={`gs-feature-card rounded-[2rem] border bg-gradient-to-br ${surfaceClass} p-7 shadow-xl shadow-slate-900/6`}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ${iconClass}`}>
              <Icon size={20} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <h3 className="mb-3 text-2xl font-extrabold tracking-tight text-slate-900">{title}</h3>
          <p className="text-base leading-relaxed text-slate-600">{description}</p>
        </motion.div>
      ))}
    </div>
  );
}

function LearnerFeatures({
  timerValue,
  circleOffset,
  circumference,
}: {
  timerValue: number;
  circleOffset: number;
  circumference: number;
}) {
  const subjectTracks = [
    { name: "Engineering", Icon: Briefcase, meta: "12 practice sets", className: "bg-indigo-50 text-indigo-600" },
    { name: "Medical", Icon: Microscope, meta: "9 timed papers", className: "bg-rose-50 text-rose-500" },
    { name: "Commerce", Icon: Calculator, meta: "8 revision blocks", className: "bg-amber-50 text-amber-600" },
    { name: "Arts", Icon: Globe, meta: "6 writing drills", className: "bg-sky-50 text-sky-600" },
  ];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="gs-feature-card rounded-[2rem] border border-slate-200 bg-[rgba(244,246,255,0.86)] p-7 shadow-xl shadow-slate-900/8 lg:col-span-7"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">Diverse Subject Library</p>
            <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              Practice across every stream without changing your flow.
            </h3>
          </div>
          <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 md:flex">
            <BookOpen size={24} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {subjectTracks.map(({ name, Icon, meta, className }) => (
            <div key={name} className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 shadow-sm">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${className}`}>
                <Icon size={18} />
              </div>
              <p className="text-lg font-bold text-slate-900">{name}</p>
              <p className="mt-1 text-sm text-slate-500">{meta}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.08, duration: 0.55 }}
        className="gs-feature-card rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white shadow-xl shadow-slate-900/25 lg:col-span-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">Real Pressure</p>
            <h3 className="mt-2 text-2xl font-extrabold tracking-tight">Stay calm while the clock keeps moving.</h3>
          </div>
          <Clock3 className="text-sky-300" size={22} />
        </div>

        <div className="mt-8 flex items-center justify-center">
          <div className="relative flex h-48 w-48 items-center justify-center">
            <svg className="-rotate-90" width="192" height="192" viewBox="0 0 192 192" aria-hidden="true">
              <circle cx="96" cy="96" r="70" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="14" />
              <circle
                cx="96"
                cy="96"
                r="70"
                fill="none"
                stroke="url(#timerGradient)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circleOffset}
              />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Countdown</p>
              <p className="mt-2 text-4xl font-black tracking-tight">00:{String(timerValue).padStart(2, "0")}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {["Strict timer", "Auto-save", "Exam rhythm"].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center text-xs font-semibold text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.55 }}
        className="gs-feature-card rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-7 shadow-xl shadow-slate-900/8 lg:col-span-12"
      >
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">Math + Symbols</p>
            <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Type it. Get the symbol.</h3>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              Convert symbols and notation quickly without breaking exam flow. Build answers with the same rhythm you think in.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { title: "Type", copy: "Use plain text like alpha, theta, or sqrt." },
                { title: "Preview", copy: "Watch notation resolve instantly into a cleaner expression." },
                { title: "Insert", copy: "Drop it straight into the answer editor and keep moving." },
              ].map((step, index) => (
                <div key={step.title} className="rounded-[1.5rem] border border-white bg-white/80 p-4 shadow-sm">
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-black text-sky-600">
                    0{index + 1}
                  </span>
                  <p className="font-bold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/30">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Equation Helper</p>
                <p className="text-[10px] text-slate-400">Live math-ready preview</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
                <Type size={18} />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Input</p>
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200">
                alpha + beta = theta
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Preview</p>
              <div className="mt-3 rounded-xl border border-slate-800 bg-gradient-to-r from-sky-500/10 to-violet-500/10 px-4 py-4">
                <p className="text-2xl font-semibold tracking-tight text-white">α + β = θ</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Greek letters", "Fractions", "Roots", "Exponents"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-300"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PaintSection() {
  const palette = [
    "#000000",
    "#B91C1C",
    "#A16207",
    "#15803D",
    "#0F766E",
    "#1D4ED8",
    "#6D28D9",
    "#D946EF",
    "#9CA3AF",
    "#EF4444",
    "#FACC15",
    "#22C55E",
    "#06B6D4",
    "#2563EB",
    "#7C3AED",
    "#EC4899",
    "#F59E0B",
    "#FDE047",
    "#86EFAC",
    "#7DD3FC",
    "#C084FC",
    "#F87171",
    "#92400E",
    "#F3F4F6",
  ];

  const shapeIcons = [Square, Square, Circle, Triangle, Triangle, Diamond, Pentagon, Hexagon, Star, Star, Heart, Zap];

  return (
    <section className="gs-paint-section relative z-10 overflow-hidden bg-[rgba(195,199,244,0.42)] py-12 backdrop-blur-sm lg:py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-sky-200/35 blur-[120px]" />
        <div className="absolute right-[8%] top-[20%] h-[280px] w-[280px] rounded-full bg-white/30 blur-[100px]" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-8 max-w-4xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[11px] font-bold text-sky-700">
            <Paintbrush size={12} />
            <span>Built-in Drawing Board</span>
          </div>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Sketch diagrams <span className="text-sky-600">without leaving</span>
          </h2>
          <p className="mx-auto max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
            Draw freehand, add shapes, and insert your work back into the answer sheet in a single flow.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5">
          {[
            { label: "Freehand & Shapes", Icon: Shapes },
            { label: "Undo / Redo", Icon: Undo2 },
            { label: "One-click Insert into Answer", Icon: CheckCircle2 },
          ].map(({ label, Icon }) => (
            <div
              key={label}
              className="gs-paint-badge inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/85 px-3.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur-sm"
            >
              <Icon size={13} className="text-sky-600" />
              {label}
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-5xl overflow-hidden lg:h-[470px]">
          <div className="lg:w-[133.35%] lg:-translate-x-[12.5%] lg:origin-top lg:scale-[0.75]">
            <div className="gs-paint-mockup overflow-hidden rounded-[2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(247,248,255,0.9),rgba(234,238,255,0.84))] shadow-[0_28px_80px_rgba(77,87,164,0.18)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/85 text-slate-900 shadow-sm">
                    <Paintbrush size={16} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">Drawing Canvas</p>
                    <p className="text-xs text-slate-500">Simple sketch tools for diagrams and labels</p>
                  </div>
                </div>
                <button className="rounded-full border border-white/80 bg-white/80 p-2.5 text-slate-500 shadow-sm">
                  <X size={16} />
                </button>
              </div>

              <div className="grid lg:grid-cols-[196px_1fr]">
                <div className="border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(241,243,252,0.94),rgba(233,236,249,0.9))] px-4 py-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Tools</p>
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                      {[
                        { Icon: Pencil, active: true },
                        { Icon: Eraser, active: false },
                        { Icon: Paintbrush, active: false },
                        { Icon: Type, active: false },
                      ].map(({ Icon, active }, index) => (
                        <button
                          key={index}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                            active
                              ? "border-black bg-black text-white shadow-md shadow-slate-900/20"
                              : "border-white/90 bg-white/80 text-slate-700 shadow-sm"
                          }`}
                        >
                          <Icon size={15} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Lines</p>
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                      {[Minus, ArrowRight].map((Icon, index) => (
                        <button
                          key={index}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/90 bg-white/80 text-slate-700 shadow-sm"
                        >
                          <Icon size={15} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Shapes</p>
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                      {shapeIcons.slice(0, 8).map((Icon, index) => (
                        <button
                          key={index}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/90 bg-white/80 text-slate-700 shadow-sm"
                        >
                          <Icon size={15} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Actions</p>
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                      {[Undo2, Redo2, Trash2].map((Icon, index) => (
                        <button
                          key={index}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/90 bg-white/80 text-slate-700 shadow-sm"
                        >
                          <Icon size={15} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Color</p>
                    <div className="mt-2.5 grid grid-cols-8 gap-1.5">
                      {palette.slice(0, 16).map((color, index) => (
                        <button
                          key={`${color}-${index}`}
                          className={`h-5 w-5 rounded-[5px] border shadow-sm ${
                            index === 0 ? "border-black ring-2 ring-black/80 ring-offset-1 ring-offset-[#eef1fb]" : "border-white/80"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2.5">
                      <span className="text-xs font-medium text-slate-500">Custom:</span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/90 bg-white/80 shadow-sm">
                        <span className="h-5 w-5 rounded bg-black" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Size</p>
                      <span className="text-xs font-semibold text-slate-700">2px</span>
                    </div>
                    <div className="mt-3 h-1 rounded-full bg-slate-300/70">
                      <div className="h-full w-[18%] rounded-full bg-slate-900" />
                    </div>
                    <div className="mt-3 flex items-end justify-between px-1">
                      {[4, 8, 12, 16, 20].map((size, index) => (
                        <span
                          key={index}
                          className={`rounded-full bg-slate-900 ${index === 1 ? "ring-3 ring-white/80" : ""}`}
                          style={{ width: size, height: size }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex-1 bg-[linear-gradient(180deg,rgba(244,246,252,0.9),rgba(239,242,250,0.84))] px-4 py-4">
                    <div className="relative h-[240px] rounded-[1rem] border border-slate-200 bg-white shadow-[0_20px_40px_rgba(148,163,184,0.14)] sm:h-[260px] lg:h-[280px]">
                      <div className="absolute left-[10%] top-[15%] h-24 w-32 rounded-[1.4rem] border-[3px] border-slate-300/75 sm:h-28 sm:w-36" />
                      <div className="absolute right-[10%] top-[18%] h-24 w-24 rounded-full border-[3px] border-slate-300/75 sm:h-28 sm:w-28" />
                      <div className="absolute left-[17%] top-[49%] h-px w-[33%] rotate-[16deg] bg-slate-400/80" />
                      <div className="absolute left-[15%] top-[39%] h-[3px] w-[27%] -rotate-[18deg] rounded-full bg-sky-400/85 shadow-[0_0_10px_rgba(56,189,248,0.35)]" />
                      <div className="absolute left-[11.5%] top-[63%] h-[3px] w-[16%] rounded-full bg-slate-500/80" />
                      <div className="absolute left-[44%] top-[55%] h-[3px] w-[13%] rotate-[42deg] rounded-full bg-violet-400/75" />
                      <div className="absolute left-[56%] top-[35%] h-[82px] w-[82px] rounded-full border border-dashed border-slate-300/70 sm:h-[92px] sm:w-[92px]" />
                      <div className="absolute left-[49%] top-[20%] rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm sm:text-xs">
                        Example sketch
                      </div>
                      <div className="absolute bottom-[12%] right-[6%] max-w-[180px] rounded-xl border border-slate-200 bg-[linear-gradient(180deg,rgba(249,250,252,0.96),rgba(241,245,249,0.94))] px-3 py-2.5 shadow-[0_14px_30px_rgba(148,163,184,0.18)] sm:max-w-[200px]">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Figure Label</p>
                        <p className="mt-1.5 text-sm font-semibold tracking-tight text-slate-900 sm:text-base">Triangle ABC with tangent line</p>
                      </div>
                      <div className="absolute left-[18%] top-[36%] h-2.5 w-2.5 rounded-full border-[3px] border-white bg-sky-400 shadow-[0_0_0_5px_rgba(56,189,248,0.16)]" />
                      <div className="absolute left-[40%] top-[48%] h-2.5 w-2.5 rounded-full border-[3px] border-white bg-sky-400 shadow-[0_0_0_5px_rgba(56,189,248,0.16)]" />
                      <div className="absolute right-[17%] top-[25%] h-2.5 w-2.5 rounded-full border-[3px] border-white bg-violet-400 shadow-[0_0_0_5px_rgba(167,139,250,0.18)]" />
                      <div className="absolute bottom-[14%] left-[8%] rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-[11px] font-semibold text-slate-700 shadow-sm sm:text-xs">
                        Angle B = 47 deg
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(247,248,252,0.95),rgba(240,243,249,0.92))] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                      <span className="rounded border border-slate-200 bg-white/80 px-2 py-0.5 font-mono text-xs text-slate-500">Ctrl+S</span>
                      <span>Save &amp; Insert</span>
                      <span className="rounded border border-slate-200 bg-white/80 px-2 py-0.5 font-mono text-xs text-slate-500">Ctrl+Z</span>
                      <span>Undo</span>
                      <span className="rounded border border-slate-200 bg-white/80 px-2 py-0.5 font-mono text-xs text-slate-500">Ctrl+Y</span>
                      <span>Redo</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button className="rounded-2xl border border-white/90 bg-white/85 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm sm:text-sm">
                        Close
                      </button>
                      <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm sm:text-sm">
                        Save &amp; Insert
                      </button>
                      <button className="rounded-2xl bg-black px-5 py-2 text-xs font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] sm:text-sm">
                        Save, Insert &amp; Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="gs-paint-pills mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {[
            { Icon: Pencil, label: "Simple drawing tools" },
            { Icon: Shapes, label: "Lines and shape presets" },
            { Icon: Undo2, label: "Quick edit actions" },
            { Icon: CheckCircle2, label: "Save into answer" },
          ].map(({ Icon, label }) => (
            <div
              key={label}
              className="gs-paint-pill inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm sm:text-sm"
            >
              <Icon size={14} className="text-sky-600" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GraphingSection() {
  const graphWorkflow = [
    {
      title: "Type an equation",
      description: "Enter the function you want to check.",
      Icon: Calculator,
    },
    {
      title: "Read the curve",
      description: "Watch the shape, turning point, and crossings.",
      Icon: TrendingUp,
    },
    {
      title: "Inspect a point",
      description: "Read a value on the curve before you answer.",
      Icon: Search,
    },
  ];

  const graphNumbers = [-8, -6, -4, -2, 2, 4, 6, 8];
  const verticalNumbers = [6, 4, 2, -2, -4, -6];

  return (
    <section className="gs-graph-section relative z-10 overflow-hidden bg-[rgba(195,199,244,0.34)] py-5 backdrop-blur-sm lg:py-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[12%] h-[300px] w-[300px] rounded-full bg-white/35 blur-[110px]" />
        <div className="absolute right-[6%] top-[24%] h-[360px] w-[360px] rounded-full bg-[#c18db4]/18 blur-[120px]" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-3 max-w-4xl text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/84 px-4 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur-sm">
            <Calculator size={12} className="text-[#0E1B48]" />
            <span>Graphing Calculator</span>
          </div>
          <h2 className="mb-1.5 text-[1.8rem] font-extrabold tracking-tight text-foreground md:text-[2.2rem]">
            Plot the pattern <span className="text-[#0E1B48]">before you commit</span>
          </h2>
          <p className="mx-auto max-w-3xl text-[13px] leading-[1.65] text-muted-foreground md:text-[14px]">
            Open an equation view, see the curve on a real graph, and read the shape of the answer before you submit.
          </p>
        </div>

        <div className="mx-auto max-w-5xl overflow-hidden px-1 lg:h-[356px] xl:h-[378px]">
          <div className="lg:w-[156%] lg:-translate-x-[18%] lg:origin-top lg:scale-[0.56] xl:scale-[0.59] 2xl:scale-[0.61]">
            <div className="gs-graph-mockup overflow-hidden rounded-[2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(247,248,255,0.92),rgba(236,239,252,0.88))] shadow-[0_30px_90px_rgba(77,87,164,0.18)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/85 text-slate-900 shadow-sm">
                    <Calculator size={16} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">Graphing Calculator</p>
                    <p className="max-w-[360px] text-xs leading-snug text-slate-500">Check the curve quickly without leaving the exam flow</p>
                  </div>
                </div>
                <button className="rounded-full border border-white/80 bg-white/80 p-2.5 text-slate-500 shadow-sm">
                  <X size={16} />
                </button>
              </div>

              <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(246,247,252,0.95),rgba(239,242,249,0.92))] px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2.5 rounded-[1rem] border border-slate-200/80 bg-white/86 px-3.5 py-2.5 shadow-sm">
                  <span className="h-3.5 w-3.5 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                  <span className="text-sm font-semibold text-slate-600">y =</span>
                  <div className="min-w-[170px] flex-1 rounded-xl bg-slate-50 px-3.5 py-2 font-mono text-sm text-slate-500">
                    x^2 + sin(x)
                  </div>
                  <span className="ml-auto rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    Live preview
                  </span>
                </div>

                <button className="mt-2.5 inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/86 px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm sm:text-sm">
                  <Plus size={15} />
                  Add Equation
                </button>
              </div>

              <div className="grid lg:grid-cols-[190px_1fr]">
                <div className="border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(241,243,252,0.94),rgba(233,236,249,0.9))] px-3 py-3">
                  <div className="rounded-[1.2rem] border border-white/85 bg-white/82 p-3 shadow-[0_16px_34px_rgba(148,163,184,0.12)]">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">How It Works</p>
                    <div className="mt-2.5 space-y-2">
                      {graphWorkflow.map(({ title, description, Icon }, index) => (
                        <div key={title} className="flex items-start gap-2.5 rounded-2xl bg-slate-50/90 px-2.5 py-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-[#0E1B48] shadow-sm">
                            <Icon size={13} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-900">
                              {index + 1}. {title}
                            </p>
                            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                              {description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex-1 bg-[linear-gradient(180deg,rgba(244,246,252,0.88),rgba(240,243,250,0.86))] px-3.5 py-3">
                    <div className="mb-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Live Graph Preview</p>
                        <p className="mt-1 text-[13px] font-semibold text-slate-800">See the curve update before you answer.</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[ZoomIn, ZoomOut].map((Icon, index) => (
                          <button
                            key={index}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/90 bg-white/85 text-slate-600 shadow-sm"
                          >
                            <Icon size={14} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative h-[210px] overflow-hidden rounded-[1rem] border border-slate-200 bg-[#fffdfa] shadow-[0_22px_44px_rgba(148,163,184,0.15)] sm:h-[232px] lg:h-[258px]">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(30,41,59,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(30,41,59,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.02)_1px,transparent_1px)] bg-[size:10px_10px]" />

                  <div className="absolute right-4 top-4 max-w-[172px] rounded-2xl border border-white/85 bg-white/90 px-3 py-2.5 shadow-[0_18px_30px_rgba(148,163,184,0.16)] backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">What You Notice</p>
                    <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-900">
                      Watch where the curve rises, turns, and crosses before you submit.
                    </p>
                  </div>

                  <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-slate-500/70" />
                  <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-slate-500/70" />

                  <div className="absolute left-1/2 top-3 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[10px] border-x-transparent border-b-slate-600" />
                  <div className="absolute right-3 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[5px] border-l-[10px] border-y-transparent border-l-slate-600" />

                  {graphNumbers.map((value, index) => (
                    <span
                      key={`x-${value}`}
                      className="absolute top-[51.5%] -translate-x-1/2 text-[10px] font-medium text-slate-500 sm:text-xs"
                      style={{ left: `${14 + index * 10.5}%` }}
                    >
                      {value}
                    </span>
                  ))}

                  {verticalNumbers.map((value, index) => (
                    <span
                      key={`y-${value}`}
                      className="absolute left-[51.6%] -translate-y-1/2 text-[10px] font-medium text-slate-500 sm:text-xs"
                      style={{ top: `${10 + index * 12.8}%` }}
                    >
                      {value}
                    </span>
                  ))}

                  <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 980 640" preserveAspectRatio="none">
                    <path
                      d="M 90 544 C 205 415, 295 270, 398 154 C 445 108, 491 92, 534 103 C 578 119, 626 164, 681 251 C 763 372, 848 477, 918 544"
                      fill="none"
                      stroke="#0E1B48"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 108 360 C 165 302, 236 301, 294 356 C 352 412, 410 415, 470 361 C 527 309, 592 309, 648 366 C 704 422, 761 423, 821 362"
                      fill="none"
                      stroke="#C18DB4"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.95"
                    />
                    <circle cx="492" cy="100" r="10" fill="#C18DB4" stroke="white" strokeWidth="5" />
                    <circle cx="694" cy="274" r="10" fill="#0E1B48" stroke="white" strokeWidth="5" />
                    <circle cx="318" cy="328" r="10" fill="#87A7D0" stroke="white" strokeWidth="5" />
                  </svg>

                  <div className="absolute left-[58%] top-[46%] max-w-[168px] rounded-2xl border border-white/80 bg-white/92 px-3 py-2.5 shadow-[0_14px_26px_rgba(148,163,184,0.18)] backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Point Readout</p>
                    <p className="mt-1.5 text-xs font-semibold text-slate-800 sm:text-sm">f(2.4) = 6.9</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                      The slope starts flattening near this turning area.
                    </p>
                  </div>

                  <div className="absolute bottom-4 left-4 max-w-[68%] rounded-2xl border border-white/80 bg-white/90 px-3.5 py-2 text-[10px] font-semibold text-slate-600 shadow-[0_14px_26px_rgba(148,163,184,0.18)] backdrop-blur-sm sm:text-xs">
                    Active equation: <span className="font-mono text-[#0E1B48]">x^2 + sin(x)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
            </div>
          </div>
        </div>

        <div className="gs-graph-caption mt-4 text-center lg:hidden">
          <p className="mx-auto inline-flex max-w-2xl items-center justify-center rounded-full border border-white/80 bg-white/82 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
            When the algebra feels abstract, the graph turns it into something you can read at a glance.
          </p>
        </div>
      </div>
    </section>
  );
}

function CodeSection() {
  const codeLines = [
    { className: "", content: <><span className="text-purple-400">def</span><span className="text-white"> bubble_sort(arr):</span></> },
    { className: "pl-5 text-slate-500", content: <># Repeated swaps until the array is sorted</> },
    { className: "pl-5", content: <><span className="text-blue-400">n</span><span className="text-white"> = len(arr)</span></> },
    { className: "pl-5", content: <><span className="text-purple-400">for</span><span className="text-white"> i in range(n):</span></> },
    { className: "pl-10", content: <><span className="text-purple-400">for</span><span className="text-white"> j in range(0, n-i-1):</span></> },
    { className: "pl-16", content: <><span className="text-purple-400">if</span><span className="text-white"> arr[j] &gt; arr[j+1]:</span></> },
    { className: "pl-20 text-white", content: <>arr[j], arr[j+1] = arr[j+1], arr[j]</> },
    { className: "pl-5", content: <><span className="text-purple-400">return</span><span className="text-white"> arr</span></> },
  ];

  return (
    <section className="gs-code-section relative z-10 overflow-hidden bg-slate-950 py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-8 h-[500px] w-[760px] -translate-x-1/2 rounded-full bg-sky-500/12 blur-[140px]" />
      </div>

      <div className="container relative mx-auto px-4">
        <SectionHeader
          badge="Code Runner"
          title="Write code."
          accent="Run it. Submit."
          description="Solve programming questions inside the exam flow with a coding workspace that feels fast, familiar, and focused."
          Icon={CodeXml}
          dark
        />

        <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
          {[
            { label: "Run with one click", Icon: Terminal },
            { label: "Instant output", Icon: CheckCircle2 },
          ].map(({ label, Icon }) => (
            <div
              key={label}
              className="gs-code-badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200"
            >
              <Icon size={14} className="text-green-400" />
              {label}
            </div>
          ))}
        </div>

        <div className="gs-code-mockup mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400">Bubble Sort Assessment</p>
          </div>

          <div className="grid lg:grid-cols-[1.15fr_1.35fr]">
            <div className="border-b border-slate-800 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Question</p>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-400">Q3 · Algorithms · 10 pts</span>
                  <h3 className="mt-1.5 text-sm font-bold text-white">Implement Bubble Sort</h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  Write a function <code className="rounded bg-slate-800 px-1.5 py-0.5 text-green-400">bubble_sort(arr)</code>{" "}
                  that sorts a list of integers in ascending order.
                </p>
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/80 p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Example</div>
                  <div className="mt-2 space-y-1 font-mono text-xs">
                    <div className="text-slate-400">Input: <span className="text-white">[64, 34, 25, 12]</span></div>
                    <div className="text-slate-400">Output: <span className="text-green-400">[12, 25, 34, 64]</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col bg-[#1e1e2e]">
              <div className="flex flex-1 overflow-hidden">
                <div className="w-10 shrink-0 select-none border-r border-slate-700/40 py-4 pr-2 text-right font-mono text-xs text-slate-600">
                  {Array.from({ length: 13 }, (_, index) => (
                    <div key={index} className="leading-[22px]">
                      {index + 1}
                    </div>
                  ))}
                </div>
                <div className="flex-1 overflow-hidden px-3 py-4 font-mono text-xs leading-[22px]">
                  {codeLines.map((line, index) => (
                    <div key={index} className={line.className}>
                      {line.content}
                    </div>
                  ))}
                  <div className="mt-1 text-slate-500"># Sample run</div>
                  <div>
                    <span className="text-blue-400">data</span>
                    <span className="text-white"> = [64, 34, 25, 12, 22]</span>
                  </div>
                  <div>
                    <span className="text-yellow-300">print</span>
                    <span className="text-white">(&quot;Sorted:&quot;, bubble_sort(data))</span>
                  </div>
                  <div className="mt-1">
                    <span className="inline-block h-[18px] w-[7px] animate-pulse rounded-sm bg-slate-400" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 bg-slate-950">
                <div className="flex items-center border-b border-slate-700/40 px-4 py-2">
                  <button className="flex items-center gap-1.5 border-b-2 border-green-400 pb-0.5 text-xs font-bold text-green-400">
                    <Terminal size={12} /> Output
                  </button>
                </div>
                <div className="px-4 py-3 font-mono text-xs leading-5">
                  <div className="text-slate-600">$ python solution.py</div>
                  <div className="text-green-400">Sorted: [12, 22, 25, 34, 64]</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <CheckCircle2 size={11} className="text-green-500" />
                    <span className="text-[11px] text-slate-500">Exit code 0 · 0.08s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="gs-code-pills mt-8 flex flex-col items-center gap-5">
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { lang: "Python", className: "border-blue-500/30 bg-blue-500/10 text-blue-400" },
              { lang: "C++", className: "border-purple-500/30 bg-purple-500/10 text-purple-400" },
              { lang: "Java", className: "border-orange-500/30 bg-orange-500/10 text-orange-400" },
              { lang: "C", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400" },
            ].map(({ lang, className }) => (
              <div key={lang} className={`gs-code-pill rounded-full border px-5 py-2 text-xs font-bold ${className}`}>
                {lang}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { Icon: CodeXml, text: "Monaco editor with IntelliSense" },
              { Icon: Terminal, text: "Run code instantly" },
              { Icon: CheckCircle2, text: "Real compiler output" },
            ].map(({ Icon, text }) => (
              <div
                key={text}
                className="gs-code-pill flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:border-green-500/40 hover:text-green-400"
              >
                <Icon size={14} className="text-green-400" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EvaluationSection() {
  const studentViewPoints = [
    {
      Icon: Trophy,
      title: "Instant grade card",
      description: "Grade, marks obtained, and percentage appear as soon as evaluation is complete.",
    },
    {
      Icon: Target,
      title: "Per-question breakdown",
      description: "Expand any result to view marks awarded per question beside your original answer.",
    },
    {
      Icon: Brain,
      title: "AI feedback included",
      description: "Super Teacher evaluations include deeper per-question insights and an overall summary.",
    },
    {
      Icon: FileText,
      title: "Downloadable as Word",
      description: "Export answers plus evaluation as a .docx file for offline study and revision.",
    },
  ];

  const sampleResults = [
    {
      grade: "A+",
      subject: "Mathematics",
      obtained: 92,
      total: 100,
      pct: 92,
      typeLabel: "Super Teacher",
      typeClass: "bg-sky-100 text-sky-700",
      gradeClass: "bg-sky-50 text-sky-700",
      date: "Mar 10, 2026",
      expanded: true,
      feedback:
        "Excellent mastery of calculus and algebra. Work on geometry proofs for even higher accuracy.",
      questions: [
        { label: "Differentiate f(x) = x³ + 2x", score: "6/6" },
        { label: "Solve x² - 5x + 6", score: "4/4" },
        { label: "Area under curve ∫₀² x² dx", score: "5/6" },
      ],
    },
    {
      grade: "A",
      subject: "Physics",
      obtained: 81,
      total: 100,
      pct: 81,
      typeLabel: "Super Teacher + Teacher",
      typeClass: "bg-violet-100 text-violet-700",
      gradeClass: "bg-violet-50 text-violet-700",
      date: "Mar 8, 2026",
      expanded: false,
      feedback: "",
      questions: [],
    },
    {
      grade: "B+",
      subject: "Chemistry",
      obtained: 74,
      total: 100,
      pct: 74,
      typeLabel: "Teacher Graded",
      typeClass: "bg-teal-100 text-teal-700",
      gradeClass: "bg-teal-50 text-teal-700",
      date: "Mar 6, 2026",
      expanded: false,
      feedback: "",
      questions: [],
    },
  ];

  return (
    <section className="relative z-10 overflow-hidden bg-[rgba(210,214,248,0.58)] py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-200/30 blur-[130px]" />
      </div>

      <div className="container relative mx-auto px-4">
        <SectionHeader
          badge="Smart Evaluation"
          title="Three ways to get"
          accent="evaluated"
          description="Choose between instant AI feedback, a blended AI + teacher review, or a fully manual teacher-graded result."
          Icon={Trophy}
        />

        <div className="mx-auto mb-20 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {evaluationModes.map((mode, index) => (
            <motion.div
              key={mode.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12, duration: 0.5 }}
              className={`relative overflow-hidden rounded-[2rem] border p-7 transition-all ${mode.cardClass}`}
            >
              <div className="mb-5 flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${mode.iconWrapClass}`}>
                  <mode.Icon size={20} className={mode.iconClass} />
                </div>
                <div className={`rounded-full px-3 py-1 text-sm font-black ${mode.gradeClass}`}>{mode.grade}</div>
              </div>
              <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-white bg-white/70 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                {mode.tag}
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{mode.title}</h3>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{mode.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {mode.badges.map((badge) => (
                  <span key={badge} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${mode.badgeClass}`}>
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-16 lg:grid-cols-2">
          <div className="space-y-6 pt-2">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-600">Student View</p>
              <h3 className="mb-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                See your results <span className="text-sky-600">instantly</span>
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                Once your exam is evaluated, your score card appears in My Results with grade, marks breakdown, and expandable feedback.
              </p>
            </div>

            {studentViewPoints.map((point, index) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="flex items-start gap-4"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50">
                  <point.Icon size={16} className="text-sky-600" />
                </div>
                <div>
                  <p className="mb-0.5 font-bold text-[#071952]">{point.title}</p>
                  <p className="text-sm leading-relaxed text-gray-500">{point.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -6 }}
            className="overflow-hidden rounded-[2rem] border border-black/10 bg-[rgba(245,246,255,0.9)] shadow-xl"
          >
            <div className="h-1.5 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-500" />
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 pb-3 pt-4">
              <div className="rounded-xl bg-sky-50 p-2">
                <Trophy size={16} className="text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#071952]">My Results</p>
                <p className="text-[10px] text-gray-400">Your evaluated exam attempts</p>
              </div>
            </div>

            <div className="space-y-3 px-4 py-4">
              {sampleResults.map((result, index) => (
                <motion.div
                  key={result.subject}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.35 }}
                  className="overflow-hidden rounded-xl border border-gray-200"
                >
                  <div className="flex items-center gap-3 px-3 py-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black ${result.gradeClass}`}>
                      {result.grade}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-[11px] font-bold text-[#071952]">{result.subject}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${result.typeClass}`}>
                          {result.typeLabel}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-400">{result.date}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-[#071952]">
                        {result.obtained}/{result.total}
                      </p>
                      <p className="text-[9px] text-gray-500">{result.pct}%</p>
                    </div>
                  </div>

                  {result.expanded ? (
                    <div className="border-t border-gray-100 bg-sky-50/50 px-3 py-2.5">
                      <p className="mb-2 flex items-center gap-1 text-[9px] font-semibold text-sky-700">
                        <Brain size={9} /> AI Feedback
                      </p>
                      <p className="mb-2.5 text-[9px] italic leading-relaxed text-gray-600">{result.feedback}</p>
                      <div className="space-y-1">
                        {result.questions.map((question) => (
                          <div
                            key={question.label}
                            className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5"
                          >
                            <p className="flex-1 truncate text-[9px] text-gray-600">{question.label}</p>
                            <span className="shrink-0 text-[9px] font-bold text-amber-600">{question.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BackgroundScene() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${BACKGROUND_COLOR} 0%, #cfd3f8 42%, #bcc4f3 100%)`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_58%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.48)_1px,transparent_1px)] bg-[size:132px_132px] opacity-80" />
      <div className="absolute inset-0 bg-[linear-gradient(116deg,transparent_0%,transparent_44%,rgba(255,255,255,0.68)_49%,transparent_54%,transparent_100%),linear-gradient(64deg,transparent_0%,transparent_42%,rgba(255,255,255,0.52)_47%,transparent_52%,transparent_100%)] opacity-80" />
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-90"
        viewBox="0 0 1440 2200"
        preserveAspectRatio="none"
      >
        <path
          d="M-80 190 C 180 90, 420 290, 690 190 S 1220 10, 1540 140"
          fill="none"
          stroke="rgba(255,255,255,0.72)"
          strokeWidth="2"
        />
        <path
          d="M-40 620 C 260 480, 510 760, 800 620 S 1280 470, 1510 560"
          fill="none"
          stroke="rgba(255,255,255,0.64)"
          strokeWidth="1.6"
        />
        <path
          d="M-120 1180 C 220 980, 430 1300, 780 1130 S 1220 980, 1520 1100"
          fill="none"
          stroke="rgba(255,255,255,0.62)"
          strokeWidth="1.8"
        />
        <path
          d="M-90 1710 C 210 1550, 520 1880, 890 1700 S 1290 1570, 1530 1650"
          fill="none"
          stroke="rgba(255,255,255,0.58)"
          strokeWidth="1.5"
        />
      </svg>
      <div className="absolute left-[-8%] top-[10%] h-[26rem] w-[26rem] rounded-full bg-white/45 blur-[110px]" />
      <div className="absolute right-[-10%] top-[42%] h-[32rem] w-[32rem] rounded-full bg-[#8e97f0]/20 blur-[130px]" />
      <div className="absolute bottom-[-10%] left-[18%] h-[28rem] w-[28rem] rounded-full bg-white/35 blur-[120px]" />
    </div>
  );
}

function FlyingPencil({ pageRef }: { pageRef: RefObject<HTMLDivElement | null> }) {
  const pencilRef = useRef<HTMLDivElement | null>(null);
  const orbitPathRef = useRef<SVGPathElement | null>(null);
  const pathLengthRef = useRef(0);
  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const targetCursorRef = useRef({ x: 0.82, y: 0.18 });
  const smoothCursorRef = useRef({ x: 0.82, y: 0.18 });

  useEffect(() => {
    const pencil = pencilRef.current;
    const orbitPath = orbitPathRef.current;
    const scroller = pageRef.current;
    if (!pencil || !orbitPath || !scroller) return;

    let animationFrame = 0;
    let lastTime = performance.now();

    const updatePathLength = () => {
      pathLengthRef.current = orbitPath.getTotalLength();
    };

    const updateProgress = () => {
      const maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      targetProgressRef.current = clamp(scroller.scrollTop / maxScroll, 0, 1);
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetCursorRef.current = {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      };
    };

    const render = (time: number) => {
      const delta = Math.min(32, time - lastTime);
      lastTime = time;
      const smoothing = 1 - Math.exp(-delta / 120);

      smoothProgressRef.current +=
        (targetProgressRef.current - smoothProgressRef.current) * smoothing;
      smoothCursorRef.current.x +=
        (targetCursorRef.current.x - smoothCursorRef.current.x) * smoothing;
      smoothCursorRef.current.y +=
        (targetCursorRef.current.y - smoothCursorRef.current.y) * smoothing;

      const rocketPulse = Math.sin(time * 0.0045 + smoothProgressRef.current * Math.PI * 8) * 0.006;
      const orbitProgress =
        ((smoothProgressRef.current * PENCIL_ORBIT_LOOPS) + rocketPulse + 1) % 1;
      const orbitLength = pathLengthRef.current || orbitPath.getTotalLength();
      const point = orbitPath.getPointAtLength(orbitLength * orbitProgress);
      const pointAhead = orbitPath.getPointAtLength((orbitLength * ((orbitProgress + 0.0025) % 1) + orbitLength) % orbitLength);

      const angle =
        (Math.atan2(pointAhead.y - point.y, pointAhead.x - point.x) * 180) / Math.PI;
      const parallaxX = (smoothCursorRef.current.x - 0.5) * 36;
      const parallaxY = (smoothCursorRef.current.y - 0.5) * 16;
      const hoverBob = Math.sin(time * 0.0036 + smoothProgressRef.current * Math.PI * 10) * 6;
      const scale = 0.94 + smoothProgressRef.current * 0.12;

      pencil.style.transform = `translate3d(${point.x + parallaxX}px, ${point.y + parallaxY + hoverBob}px, 0) rotate(${angle}deg) scale(${scale})`;
      animationFrame = window.requestAnimationFrame(render);
    };

    updatePathLength();
    updateProgress();
    window.addEventListener("resize", updatePathLength);
    window.addEventListener("pointermove", handlePointerMove);
    scroller.addEventListener("scroll", updateProgress, { passive: true });
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updatePathLength);
      window.removeEventListener("pointermove", handlePointerMove);
      scroller.removeEventListener("scroll", updateProgress);
    };
  }, [pageRef]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] hidden lg:block">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path
          ref={orbitPathRef}
          d={PENCIL_ORBIT_PATH}
          fill="none"
          stroke="transparent"
          strokeWidth="2"
        />
      </svg>

      <div ref={pencilRef} className="absolute left-0 top-0 will-change-transform">
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-[-170px] top-1/2 h-3 w-44 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-white/85 to-white/10 blur-[1.4px]" />
          <div className="absolute left-[-136px] top-1/2 h-12 w-32 -translate-y-1/2 rounded-full bg-[#c18db4]/35 blur-[36px]" />
          <motion.div
            className="absolute left-[-42px] top-1/2 h-0 w-0 -translate-y-1/2 border-b-[11px] border-l-[34px] border-t-[11px] border-b-transparent border-l-[#ffab76] border-t-transparent opacity-80"
            animate={{ scaleX: [0.92, 1.18, 0.94], opacity: [0.55, 0.95, 0.6] }}
            transition={{ duration: 0.38, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-[-28px] top-1/2 h-0 w-0 -translate-y-1/2 border-b-[8px] border-l-[22px] border-t-[8px] border-b-transparent border-l-[#fff0a8] border-t-transparent"
            animate={{ scaleX: [0.9, 1.08, 0.92], opacity: [0.6, 0.92, 0.68] }}
            transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative flex items-center drop-shadow-[0_22px_34px_rgba(73,79,156,0.28)]">
            <div className="h-6 w-7 rounded-l-full border border-white/75 bg-gradient-to-b from-[#f7bed4] to-[#e59cbc]" />
            <div className="h-6 w-3 border-y border-white/75 bg-gradient-to-b from-slate-200 to-white" />
            <div className="relative h-6 w-32 overflow-hidden rounded-r-full border-y border-r border-white/75 bg-[linear-gradient(90deg,#f7de74_0%,#efc860_42%,#dea846_100%)]">
              <div className="absolute inset-x-5 top-1/2 h-px -translate-y-1/2 bg-white/60" />
              <div className="absolute left-7 top-[4px] h-[2px] w-10 rounded-full bg-white/45" />
              <div className="absolute bottom-[4px] left-8 h-[2px] w-8 rounded-full bg-white/25" />
            </div>
            <div className="h-0 w-0 border-b-[12px] border-l-[22px] border-t-[12px] border-b-transparent border-l-[#f4dfc0] border-t-transparent" />
            <div className="-ml-[1px] h-0 w-0 border-b-[7px] border-l-[12px] border-t-[7px] border-b-transparent border-l-slate-900 border-t-transparent" />
          </div>

          <motion.div
            className="absolute right-[-14px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white"
            animate={{ opacity: [0.35, 1, 0.4], scale: [0.8, 1.25, 0.82] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HomePage() {
  const { isAuthenticated, profile } = useAuth();
  const isStudent = isAuthenticated && profile?.role === "student";
  const isTeacher = isAuthenticated && profile?.role === "teacher";
  const isAdmin = isAuthenticated && profile?.role === "admin";
  const isRecruiter = isAuthenticated && profile?.role === "recruiter";
  const verifiedUniversityLabel = profile?.university_name ?? profile?.university_short_name ?? null;
  const hasVerifiedUniversity = !!(isStudent && profile?.is_university_verified && verifiedUniversityLabel);
  const studentEntryPath = getStudentExamEntryPath(profile);
  const studentEntryLabel = getStudentExamEntryLabel(profile);
  const verifiedMemberLabel = getVerifiedMemberLabel(profile?.organization_type);
  const [timerValue, setTimerValue] = useState(60);
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimerValue((current) => (current > 0 ? current - 1 : 60));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const scroller = pageRef.current;
    if (!scroller) return;

    const context = gsap.context(() => {
      const withTrigger = (trigger: string | Element, extra = {}) => ({
        scrollTrigger: {
          trigger,
          scroller,
          start: "top 85%",
          end: "top 40%",
          toggleActions: "play none none reverse",
          ...extra,
        },
      });

      gsap.fromTo(
        ".gs-feature-card",
        { opacity: 0, y: 60, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.1,
          ...withTrigger(".gs-features-section"),
        },
      );

      gsap.utils.toArray<HTMLElement>(".gs-section-head").forEach((section) => {
        gsap.fromTo(
          section,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", ...withTrigger(section) },
        );
      });

      gsap.fromTo(
        ".gs-paint-mockup",
        { opacity: 0, y: 80 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          ...withTrigger(".gs-paint-section", { start: "top 80%" }),
        },
      );

      gsap.fromTo(
        ".gs-paint-badge",
        { opacity: 0, scale: 0.7 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "back.out(2)",
          stagger: 0.12,
          scrollTrigger: {
            trigger: ".gs-paint-mockup",
            scroller,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.fromTo(
        ".gs-paint-pill",
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: ".gs-paint-pills",
            scroller,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.fromTo(
        ".gs-graph-mockup",
        { opacity: 0, y: 80 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          ...withTrigger(".gs-graph-section", { start: "top 80%" }),
        },
      );

      gsap.fromTo(
        ".gs-graph-badge",
        { opacity: 0, scale: 0.72 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "back.out(2)",
          stagger: 0.12,
          scrollTrigger: {
            trigger: ".gs-graph-mockup",
            scroller,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.fromTo(
        ".gs-graph-caption",
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".gs-graph-caption",
            scroller,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.fromTo(
        ".gs-code-mockup",
        { opacity: 0, y: 80 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          ...withTrigger(".gs-code-section", { start: "top 80%" }),
        },
      );

      gsap.fromTo(
        ".gs-code-badge",
        { opacity: 0, scale: 0.7 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "back.out(2)",
          stagger: 0.12,
          scrollTrigger: {
            trigger: ".gs-code-mockup",
            scroller,
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.fromTo(
        ".gs-code-pill",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.07,
          scrollTrigger: {
            trigger: ".gs-code-pills",
            scroller,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.fromTo(
        ".gs-cta",
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          ...withTrigger(".gs-cta"),
        },
      );
    }, scroller);

    return () => context.revert();
  }, []);

  const heroBadge = isTeacher
    ? "Teacher Portal"
    : isAdmin
      ? "Admin Portal"
      : isRecruiter
        ? "Recruiter Portal"
        : hasVerifiedUniversity
          ? verifiedMemberLabel
          : "New: AI-Powered Analysis";

  const heroDescription = isTeacher
    ? "Create subjects, add questions across multiple categories, review student submissions, and evaluate performance from one dashboard."
    : hasVerifiedUniversity
      ? "Turn your exam effort into a recruiter-ready story with a verified organization identity, a clearer skill profile, and measurable academic progress."
      : "Experience a realistic exam environment with curated questions, timed sessions, and practical tools that build confidence before the real test.";

  const primaryActionPath = isTeacher
    ? "/teacher/dashboard"
    : isAdmin
      ? "/admin/dashboard"
      : isRecruiter
        ? "/recruiter/dashboard"
        : isAuthenticated
          ? studentEntryPath
          : "/login";

  const primaryActionLabel = isTeacher
    ? "Go to Teacher Portal"
    : isAdmin
      ? "Go to Admin Portal"
      : isRecruiter
        ? "Go to Recruiter Portal"
        : isAuthenticated
          ? studentEntryLabel
          : "Login to Start";

  const closingTitle = isTeacher ? "Ready to manage your classroom?" : "Ready to test your full potential?";
  const closingDescription = isTeacher
    ? "Head to your Teacher Portal to create subjects, add questions, and review student submissions."
    : isAdmin
      ? "Head to your Admin Portal to manage your organization profile, official accounts, exam approvals, and analytics."
      : isRecruiter
        ? "Head to your Recruiter Portal to review verified talent, evaluate progress, and discover standout candidates."
        : "Start practicing with AI-powered tools designed to help you prepare effectively for your exams.";
  const closingActionLabel = isTeacher
    ? "Go to Teacher Portal"
    : isAdmin
      ? "Go to Admin Portal"
      : isRecruiter
        ? "Go to Recruiter Portal"
        : isAuthenticated
          ? studentEntryLabel
          : "Start for Free";

  const heroTitle = isTeacher ? (
    <>
      Manage Your <br />
      <span className="text-primary">Exams</span>
    </>
  ) : isAdmin ? (
    <>
      Run Your <br />
      <span className="text-primary">Exam Operations</span>
    </>
  ) : (
    <>
      Master Your <br />
      <span className="text-primary">Exams</span>
    </>
  );

  const circleRadius = 70;
  const circumference = 2 * Math.PI * circleRadius;
  const progress = (60 - timerValue) / 60;
  const circleOffset = circumference - progress * circumference;

  return (
    <div
      ref={pageRef}
      className="h-screen w-full overflow-x-hidden overflow-y-auto text-foreground selection:bg-primary/20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      style={{ backgroundColor: BACKGROUND_COLOR }}
    >
      <BackgroundScene />
      <FlyingPencil pageRef={pageRef} />

      <div className="relative z-50">
        <Navbar />

        <section className="relative flex min-h-[75vh] items-center overflow-hidden pb-20 pt-20 lg:pb-32 lg:pt-0">
          <div className="container mx-auto px-4">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-left"
              >
                <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-1.5 text-sm font-semibold text-primary shadow-md shadow-primary/10">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  {heroBadge}
                </div>

                <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                  {heroTitle}
                </h1>

                <p className="mb-8 max-w-xl text-xl leading-relaxed text-muted-foreground">{heroDescription}</p>

                {hasVerifiedUniversity && verifiedUniversityLabel ? (
                  <div className="mb-8 inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 shadow-sm shadow-sky-100/80">
                    <span className="max-w-[22rem] truncate">{verifiedUniversityLabel}</span>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" />
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-4">
                  <BlobButton to={primaryActionPath}>{primaryActionLabel}</BlobButton>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden h-[560px] w-full lg:block xl:h-[640px]"
              >
                <div className="relative h-full w-full">
                  {isTeacher ? (
                    <TeacherHeroVisual />
                  ) : (
                    <LearnerHeroVisual timerValue={timerValue} />
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="gs-features-section relative z-10 bg-[rgba(195,199,244,0.48)] py-28 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <SectionHeader
              badge={isTeacher ? "Teacher Workflow" : "Practice Experience"}
              title={isTeacher ? "Everything needed to" : "A study flow that feels"}
              accent={isTeacher ? "run great exams" : "clear and exam-ready"}
              description={
                isTeacher
                  ? "Set up subjects, build questions, review answers, and publish meaningful results from one polished workspace."
                  : "Practice feels focused from the first question to final review, with support for subjects, timing, notation, and feedback."
              }
              Icon={isTeacher ? ClipboardList : BookOpen}
            />

            {isTeacher ? (
              <TeacherFeatures />
            ) : (
              <LearnerFeatures
                timerValue={timerValue}
                circleOffset={circleOffset}
                circumference={circumference}
              />
            )}
          </div>
        </section>

        <PaintSection />
        <GraphingSection />
        <CodeSection />
        <EvaluationSection />

        <div className="relative z-10 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="gs-cta container mx-auto px-4"
          >
            <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-[rgba(240,242,255,0.78)] p-8 text-center shadow-2xl shadow-slate-900/10 backdrop-blur-sm md:p-12">
              <div className="pointer-events-none absolute -right-20 -top-20 h-[320px] w-[320px] rounded-full bg-black/10 blur-[60px] opacity-40" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-[320px] w-[320px] rounded-full bg-black/10 blur-[60px] opacity-40" />

              <div className="relative z-10 mx-auto max-w-2xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-gray-50 px-3 py-1.5 text-xs font-bold text-black shadow-sm">
                  <Sparkles size={14} className="text-black" />
                  <span>Early Access Available</span>
                </div>

                <h2 className="mb-6 text-3xl font-black leading-tight tracking-tight text-slate-900 md:text-5xl">
                  {closingTitle}
                </h2>

                <p className="mb-8 text-lg font-medium leading-relaxed text-slate-500">{closingDescription}</p>

                <div className="flex items-center justify-center">
                  <BlobButton to={primaryActionPath}>{closingActionLabel}</BlobButton>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <footer className="relative z-10 border-t border-border bg-secondary/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground sm:flex-row">
              <span>© {new Date().getFullYear()} EduXam. All rights reserved.</span>
              <span className="hidden sm:inline">·</span>
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary/80"
              >
                <Users size={14} />
                Meet the Team
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
