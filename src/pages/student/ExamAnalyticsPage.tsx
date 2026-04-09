import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  Cpu,
  Filter,
  FolderOpen,
  Gauge,
  Layers3,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Zap,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { getStudentExamEntryPath, getStudentExamEntryLabel } from "@/lib/organizationFeatures";
import { EXAM_PORTAL_LABEL } from "@/lib/portalLabels";
import { blobToBase64, generateExamWordBlob } from "@/utils/exportToWord";
import { evaluateExam, type EvaluationProgress } from "@/services/evaluationService";
import {
  clearExamAnalyticsDraft,
  type ExamAnalyticsDraft,
  buildAttemptAnalyticsViewModel,
  buildProfileAnalyticsViewModel,
  buildSubjectAnalyticsViewModel,
  getStudentSubmissionAnalytics,
  getSubmissionAnalyticsBySubmissionId,
  loadExamAnalyticsDraft,
  saveExamAnalyticsDraft,
  upsertSubmissionAnalytics,
} from "@/services/examAnalyticsService";
import {
  createSubmission,
  getRecentSubmissionCount,
  getStudentEvaluationById,
  getStudentSubmissions,
  updateSubmissionMarks,
} from "@/services/submissionService";
import { saveTestResult } from "@/services/testResultsService";
import { uploadExamResult } from "@/services/resultStorageService";
import { sendParentNotification } from "@/services/emailService";
import { revokeRetakePermission } from "@/services/examRetakeService";
import type { SubmissionRow } from "@/lib/database.types";
import type { EvaluationResult } from "@/services/evaluationService";

type AnalyticsTab = "attempt" | "subject" | "profile";
type LibraryLensTab = Exclude<AnalyticsTab, "attempt">;
type AttemptViewMode = "focus" | "deep";
type LibraryStatusFilter = "all" | "pending" | "evaluated";
type PendingDemandPrompt = { mode: "ai" | "ai_teacher"; recentCount: number } | null;
type AnalyticsLibraryState = {
  activeTab: LibraryLensTab;
  selectedSubjectId: string;
  libraryStatusFilter: LibraryStatusFilter;
  libraryPage: number;
};
type AnalyticsRouteState = {
  draft?: ExamAnalyticsDraft;
  libraryState?: AnalyticsLibraryState;
};
type ChartDatum = {
  label: string;
  value: number;
  color: string;
  meta?: string;
};
type TrendPoint = {
  label: string;
  value: number;
  valueLabel?: string;
  meta?: string;
};

const CHART_COLORS = ["#071952", "#0284c7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];
const LIBRARY_PAGE_SIZE = 8;

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return "0m";
  }

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Pending";
  }
  return `${value.toFixed(1)}%`;
}

function gradeColor(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "text-slate-500";
  }
  if (value >= 80) return "text-emerald-600";
  if (value >= 60) return "text-sky-600";
  if (value >= 40) return "text-amber-600";
  return "text-rose-600";
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateLabel(value: string, maxLength = 18) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function formatChartNumber(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function getSubmissionPercentage(submission: SubmissionRow): number | null {
  if (submission.total_marks <= 0 || submission.total_marks_obtained === null) {
    return null;
  }

  return Math.round((submission.total_marks_obtained / submission.total_marks) * 1000) / 10;
}

function SegmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-[#071952] text-white shadow-sm" : "bg-white text-slate-600 hover:text-[#071952]"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{hint}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-[#071952]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  total = 100,
  tone = "from-[#071952] to-sky-500",
  suffix = "",
}: {
  label: string;
  value: number;
  total?: number;
  tone?: string;
  suffix?: string;
}) {
  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function QuestionStatusPill({ status }: { status: string }) {
  const tone =
    status === "answered"
      ? "bg-emerald-50 text-emerald-700"
      : status === "marked"
      ? "bg-amber-50 text-amber-700"
      : status === "skipped"
      ? "bg-rose-50 text-rose-700"
      : "bg-slate-100 text-slate-500";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{status}</span>;
}

function SubmissionStatusPill({ status }: { status: "pending" | "evaluated" }) {
  const tone =
    status === "evaluated" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {status === "evaluated" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
        active ? "bg-[#071952] text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:text-[#071952]"
      }`}
    >
      {label}
    </button>
  );
}

function LibraryMetricChip({
  label,
  value,
  tone = "bg-slate-100 text-slate-600",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      <span className="uppercase tracking-[0.16em] opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function DistributionChartCard({
  eyebrow,
  title,
  data,
  centerValue,
  centerHint,
  valueFormatter = formatChartNumber,
}: {
  eyebrow: string;
  title: string;
  data: ChartDatum[];
  centerValue: string;
  centerHint: string;
  valueFormatter?: (value: number) => string;
}) {
  const visible = data.filter((item) => item.value > 0);
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  const displayData =
    total > 0
      ? data
      : [{ label: "No data captured yet", value: 0, color: "#cbd5e1", meta: "Complete more attempts to populate this chart." }];

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-2xl font-black text-slate-900">{centerValue}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{centerHint}</p>
        </div>
      </div>

      <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          <span>Distribution</span>
          <span>{total > 0 ? valueFormatter(total) : "No measurable data"}</span>
        </div>
        <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-white shadow-inner ring-1 ring-slate-200">
          {visible.length > 0 ? (
            visible.map((item, index) => {
              const share = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div
                  key={`${item.label}-${index}`}
                  className="h-full"
                  style={{ width: `${share}%`, backgroundColor: item.color }}
                  title={`${item.label}: ${valueFormatter(item.value)} (${share.toFixed(1)}%)`}
                />
              );
            })
          ) : (
            <div className="h-full w-full bg-slate-200" />
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>0</span>
          <span>{total > 0 ? valueFormatter(total) : "Awaiting data"}</span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {displayData.map((item, index) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={`${item.label}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.meta ?? "Available in saved analytics"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-900">{valueFormatter(item.value)}</p>
                  <p className="text-xs text-slate-500">{share.toFixed(1)}%</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(share, 100)}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TrendChartCard({
  eyebrow,
  title,
  points,
  stroke = "#0284c7",
  valueFormatter = formatChartNumber,
  domainMax,
  yAxisLabel = "Value",
}: {
  eyebrow: string;
  title: string;
  points: TrendPoint[];
  stroke?: string;
  valueFormatter?: (value: number) => string;
  domainMax?: number;
  yAxisLabel?: string;
}) {
  const safePoints =
    points.length > 0
      ? points
      : [{ label: "No data", value: 0, valueLabel: "0", meta: "Complete more analytics to surface a trend." }];
  const chart = { width: 720, height: 260, top: 24, right: 28, bottom: 46, left: 64 };
  const innerWidth = chart.width - chart.left - chart.right;
  const innerHeight = chart.height - chart.top - chart.bottom;
  const maxPointValue = Math.max(...safePoints.map((point) => point.value), 0);
  const minPointValue = Math.min(...safePoints.map((point) => point.value), 0);
  const minValue = Math.min(0, minPointValue);
  const maxValue = Math.max(domainMax ?? maxPointValue, 1);
  const range = Math.max(maxValue - minValue, 1);
  const gradientId = `trend-fill-${eyebrow.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const getX = (index: number) =>
    safePoints.length === 1 ? chart.left + innerWidth / 2 : chart.left + (index / (safePoints.length - 1)) * innerWidth;
  const getY = (value: number) => chart.top + innerHeight - ((value - minValue) / range) * innerHeight;
  const linePath = safePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${getX(index).toFixed(2)} ${getY(point.value).toFixed(2)}`)
    .join(" ");
  const baselineY = getY(minValue);
  const areaPath =
    safePoints.length > 0
      ? `${linePath} L ${getX(safePoints.length - 1).toFixed(2)} ${baselineY.toFixed(2)} L ${getX(0).toFixed(2)} ${baselineY.toFixed(2)} Z`
      : "";
  const yTicks = Array.from({ length: 5 }, (_, index) => minValue + (range / 4) * index);
  const xLabelStep = safePoints.length <= 6 ? 1 : Math.ceil(safePoints.length / 6);
  const insightPoints = [
    { label: "Start", point: safePoints[0] },
    {
      label: "Peak",
      point: safePoints.reduce((best, point) => (point.value > best.value ? point : best), safePoints[0]),
    },
    { label: "Latest", point: safePoints[safePoints.length - 1] },
  ];

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-72 w-full" role="img" aria-label={`${title} chart`}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <text x={chart.left} y="14" fill="#64748b" fontSize="12" fontWeight="700">
            {yAxisLabel}
          </text>
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line x1={chart.left} y1={y} x2={chart.width - chart.right} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />
                <text x={chart.left - 12} y={y + 4} textAnchor="end" fill="#64748b" fontSize="12">
                  {valueFormatter(tick)}
                </text>
              </g>
            );
          })}
          <line x1={chart.left} y1={chart.top} x2={chart.left} y2={chart.top + innerHeight} stroke="#cbd5e1" />
          <line x1={chart.left} y1={chart.top + innerHeight} x2={chart.width - chart.right} y2={chart.top + innerHeight} stroke="#cbd5e1" />
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
          <path d={linePath} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {safePoints.map((point, index) => {
            const x = getX(index);
            const y = getY(point.value);
            const shouldLabel = index === 0 || index === safePoints.length - 1 || index % xLabelStep === 0;
            return (
              <g key={`${point.label}-${index}`}>
                <circle cx={x} cy={y} r="5" fill="#ffffff" stroke={stroke} strokeWidth="3">
                  <title>{`${point.label}: ${point.valueLabel ?? valueFormatter(point.value)}`}</title>
                </circle>
                {shouldLabel && (
                  <text x={x} y={chart.height - 16} textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="600">
                    {truncateLabel(point.label, 14)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {insightPoints.map(({ label, point }, index) => (
          <div key={`${label}-${point.label}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{point.label}</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{point.valueLabel ?? valueFormatter(point.value)}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{point.meta ?? "Trend point"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RankedBarChartCard({
  eyebrow,
  title,
  data,
  valueFormatter = formatChartNumber,
  domainMax,
}: {
  eyebrow: string;
  title: string;
  data: ChartDatum[];
  valueFormatter?: (value: number) => string;
  domainMax?: number;
}) {
  const safeData =
    data.length > 0 ? data : [{ label: "No data", value: 0, color: "#cbd5e1", meta: "Analytics will appear here." }];
  const maxValue = Math.max(domainMax ?? 0, ...safeData.map((item) => item.value), 1);

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-6 space-y-4">
        {safeData.map((item, index) => {
          const width = Math.min((item.value / maxValue) * 100, 100);
          return (
            <div key={`${item.label}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.meta ?? "Saved analytics"}</p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-900">{valueFormatter(item.value)}</p>
              </div>
              <div className="mt-3 h-3 rounded-full bg-white shadow-inner ring-1 ring-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${width}%`, backgroundColor: item.color }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span>0</span>
                <span>{valueFormatter(maxValue)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildPreCalculatedMarks(
  sections: ExamAnalyticsDraft["exam_sections"],
  mcqAnswers: Record<string, string>
) {
  const result: Record<string, number> = {};
  sections.forEach((section) => {
    section.questions.forEach((question) => {
      if (question.type === "mcq" && question.correctOption) {
        result[question.id] = question.correctOption === mcqAnswers[question.id] ? question.marks : 0;
      }
    });
  });
  return result;
}

export default function ExamAnalyticsPage() {
  const { profile } = useAuth();
  const { evaluationStrictness } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ submissionId?: string }>();
  const studentExamEntryPath = getStudentExamEntryPath(profile);
  const studentExamEntryLabel = getStudentExamEntryLabel(profile);

  const [activeTab, setActiveTab] = useState<AnalyticsTab>("profile");
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [analyticsRows, setAnalyticsRows] = useState<Awaited<ReturnType<typeof getStudentSubmissionAnalytics>>>([]);
  const [activeSubmission, setActiveSubmission] = useState<SubmissionRow | null>(null);
  const [activeAnalytics, setActiveAnalytics] = useState<Awaited<ReturnType<typeof getSubmissionAnalyticsBySubmissionId>>>(null);
  const [draft, setDraft] = useState<ExamAnalyticsDraft | null>(null);
  const [attemptViewMode, setAttemptViewMode] = useState<AttemptViewMode>("focus");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [libraryStatusFilter, setLibraryStatusFilter] = useState<LibraryStatusFilter>("all");
  const [libraryPage, setLibraryPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingLabel, setProcessingLabel] = useState<string | null>(null);
  const [evalProgress, setEvalProgress] = useState<EvaluationProgress | null>(null);
  const [demandPrompt, setDemandPrompt] = useState<PendingDemandPrompt>(null);
  const primaryContentRef = useRef<HTMLDivElement | null>(null);
  const isRestoringLibraryStateRef = useRef(false);
  const lastLibraryStateRef = useRef<AnalyticsLibraryState>({
    activeTab: "profile",
    selectedSubjectId: "",
    libraryStatusFilter: "all",
    libraryPage: 0,
  });

  const routeState = (location.state as AnalyticsRouteState | null) ?? null;
  const routeDraft = routeState?.draft ?? null;
  const routeLibraryState = routeState?.libraryState ?? null;
  const isSavedAttemptRoute = Boolean(params.submissionId);

  const refreshData = useCallback(
    async (focusSubmissionId?: string | null) => {
      if (!profile) {
        return;
      }

      const [nextSubmissions, nextAnalytics] = await Promise.all([
        getStudentSubmissions(profile.id),
        getStudentSubmissionAnalytics(profile.id),
      ]);

      setSubmissions(nextSubmissions);
      setAnalyticsRows(nextAnalytics);

      const targetId = focusSubmissionId ?? params.submissionId ?? null;
      if (targetId) {
        const submission = nextSubmissions.find((item) => item.id === targetId) ?? (await getStudentEvaluationById(targetId, profile.id));
        setActiveSubmission(submission ?? null);
        setActiveAnalytics(nextAnalytics.find((item) => item.submission_id === targetId) ?? (await getSubmissionAnalyticsBySubmissionId(targetId)));
        setActiveTab("attempt");
        if (submission?.subject_id) {
          setSelectedSubjectId((current) => current || submission.subject_id);
        }
      }
    },
    [params.submissionId, profile]
  );

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        if (routeDraft && !params.submissionId) {
          setDraft(routeDraft);
          saveExamAnalyticsDraft(routeDraft);
          setSelectedSubjectId(routeDraft.subject_id);
          setActiveTab("attempt");
        } else if (!params.submissionId) {
          const persistedDraft = loadExamAnalyticsDraft(profile.id);
          if (persistedDraft) {
            setDraft(persistedDraft);
            setSelectedSubjectId(persistedDraft.subject_id);
            setActiveTab("attempt");
          }
        }

        await refreshData(params.submissionId ?? null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.submissionId, profile, refreshData, routeDraft]);

  useEffect(() => {
    if (!selectedSubjectId) {
      const draftSubjectId = draft?.subject_id;
      const submissionSubjectId = activeSubmission?.subject_id;
      const fallbackSubjectId = submissions[0]?.subject_id;
      const nextSubjectId = draftSubjectId ?? submissionSubjectId ?? fallbackSubjectId ?? "";
      if (nextSubjectId) {
        setSelectedSubjectId(nextSubjectId);
      }
    }
  }, [activeSubmission, draft, selectedSubjectId, submissions]);

  useEffect(() => {
    if (isRestoringLibraryStateRef.current) {
      isRestoringLibraryStateRef.current = false;
      return;
    }
    setLibraryPage(0);
  }, [activeTab, libraryStatusFilter, selectedSubjectId]);

  useEffect(() => {
    if (routeLibraryState) {
      lastLibraryStateRef.current = routeLibraryState;
    }
  }, [routeLibraryState]);

  useEffect(() => {
    if (!isSavedAttemptRoute && activeTab !== "attempt") {
      lastLibraryStateRef.current = {
        activeTab,
        selectedSubjectId,
        libraryStatusFilter,
        libraryPage,
      };
    }
  }, [activeTab, isSavedAttemptRoute, libraryPage, libraryStatusFilter, selectedSubjectId]);

  useEffect(() => {
    if (!params.submissionId && !routeDraft && !draft) {
      const lastLibraryState = lastLibraryStateRef.current;
      isRestoringLibraryStateRef.current = true;
      setActiveTab(lastLibraryState.activeTab);
      setSelectedSubjectId(lastLibraryState.selectedSubjectId);
      setLibraryStatusFilter(lastLibraryState.libraryStatusFilter);
      setLibraryPage(lastLibraryState.libraryPage);
      setAttemptViewMode("focus");
    }
  }, [draft, params.submissionId, routeDraft]);

  const attemptView = useMemo(
    () =>
      buildAttemptAnalyticsViewModel({
        draft: params.submissionId ? null : draft,
        submission: activeSubmission,
        analytics: activeAnalytics,
      }),
    [activeAnalytics, activeSubmission, draft, params.submissionId]
  );

  const subjectView = useMemo(
    () =>
      selectedSubjectId
        ? buildSubjectAnalyticsViewModel({
            submissions,
            analyticsRows,
            subjectId: selectedSubjectId,
          })
        : null,
    [analyticsRows, selectedSubjectId, submissions]
  );

  const profileView = useMemo(
    () =>
      buildProfileAnalyticsViewModel({
        submissions,
        analyticsRows,
      }),
    [analyticsRows, submissions]
  );

  const finalizeDraftSuccess = useCallback(
    async (submissionId: string) => {
      clearExamAnalyticsDraft();
      setDraft(null);
      await refreshData(submissionId);
      navigate(`/student/analytics/${submissionId}`, { replace: true });
    },
    [navigate, refreshData]
  );

  const uploadAiArtifacts = useCallback(
    async (nextDraft: ExamAnalyticsDraft, result: EvaluationResult) => {
      if (!profile) {
        return;
      }

      try {
        const wordBlob = await generateExamWordBlob({
          examSections: nextDraft.exam_sections,
          answers: nextDraft.answers,
          mcqAnswers: nextDraft.mcq_answers,
          timeElapsed: nextDraft.time_elapsed,
          totalMarks: nextDraft.total_marks,
          answeredQuestions: nextDraft.answered_questions,
          totalQuestions: nextDraft.total_questions,
          subjectName: nextDraft.subject_name,
          evaluationResult: result,
          includeEvaluation: true,
        });

        await uploadExamResult(profile.id, nextDraft.subject_name, wordBlob).catch(() => {});

        if (profile.parent_email_verified && profile.parent_email) {
          const base64Doc = await blobToBase64(wordBlob);
          await sendParentNotification({
            studentId: profile.id,
            studentName: profile.username,
            subjectName: nextDraft.subject_name,
            score: result.totalMarksObtained,
            totalMarks: result.totalMaxMarks,
            percentage: result.percentage,
            grade: result.grade,
            evaluationType: "ai",
            wordDocBase64: base64Doc,
          }).catch(() => {});
        }
      } catch {
        // artifact generation should not block analytics
      }
    },
    [profile]
  );

  const sendDraftToTeacher = useCallback(
    async (nextDraft: ExamAnalyticsDraft, options?: { submittedDueToViolations?: boolean }) => {
      if (!profile) {
        return;
      }

      setProcessingLabel(nextDraft.exam_type === "main" ? `Submitting ${EXAM_PORTAL_LABEL}` : "Submitting to Teacher");
      try {
        const submission = await createSubmission({
          studentId: profile.id,
          teacherId: nextDraft.teacher_id,
          subjectId: nextDraft.subject_id,
          subjectName: nextDraft.subject_name,
          examType: nextDraft.exam_type,
          examSections: nextDraft.exam_sections,
          answers: nextDraft.answers,
          mcqAnswers: nextDraft.mcq_answers,
          totalMarks: nextDraft.total_marks,
          timeElapsed: nextDraft.time_elapsed,
          questionMarks: buildPreCalculatedMarks(nextDraft.exam_sections, nextDraft.mcq_answers),
          submittedDueToViolations:
            options?.submittedDueToViolations ?? nextDraft.submitted_due_to_violations ?? false,
        });

        await upsertSubmissionAnalytics(nextDraft, submission.id);

        if (nextDraft.exam_type === "main" && nextDraft.teacher_id) {
          await revokeRetakePermission(nextDraft.teacher_id, profile.id, nextDraft.subject_id).catch(() => {});
        }

        await finalizeDraftSuccess(submission.id);
      } finally {
        setProcessingLabel(null);
      }
    },
    [finalizeDraftSuccess, profile]
  );

  const saveDraftForLaterEvaluation = useCallback(
    async (mode: "ai" | "ai_teacher") => {
      if (!profile || !draft) {
        return;
      }

      setProcessingLabel("Saving Attempt");
      try {
        const submission = await createSubmission({
          studentId: profile.id,
          teacherId: mode === "ai_teacher" ? draft.teacher_id : null,
          subjectId: draft.subject_id,
          subjectName: draft.subject_name,
          examType: draft.exam_type,
          examSections: draft.exam_sections,
          answers: draft.answers,
          mcqAnswers: draft.mcq_answers,
          totalMarks: draft.total_marks,
          timeElapsed: draft.time_elapsed,
          questionMarks: buildPreCalculatedMarks(draft.exam_sections, draft.mcq_answers),
          evaluationType: mode,
        });

        await upsertSubmissionAnalytics(draft, submission.id);
        setDemandPrompt(null);
        await finalizeDraftSuccess(submission.id);
      } finally {
        setProcessingLabel(null);
      }
    },
    [draft, finalizeDraftSuccess, profile]
  );

  const evaluateDraft = useCallback(
    async (mode: "ai" | "ai_teacher", skipDemandCheck = false) => {
      if (!profile || !draft) {
        return;
      }

      if (!skipDemandCheck && draft.exam_type === "prep") {
        try {
          const recentCount = await getRecentSubmissionCount(draft.subject_id, 15);
          if (recentCount >= 20) {
            setDemandPrompt({ mode, recentCount });
            return;
          }
        } catch {
          // demand check is advisory only
        }
      }

      setProcessingLabel(mode === "ai" ? "Running Super Teacher" : "Running Super Teacher + Teacher");
      setEvalProgress(null);

      try {
        const result = await evaluateExam(
          draft.exam_sections,
          draft.answers,
          draft.mcq_answers,
          evaluationStrictness,
          (progress) => setEvalProgress(progress)
        );

        const questionMarks = Object.fromEntries(
          result.questionEvaluations.map((question) => [question.questionId, question.marksAwarded])
        );

        const submission = await createSubmission({
          studentId: profile.id,
          teacherId: mode === "ai_teacher" ? draft.teacher_id : null,
          subjectId: draft.subject_id,
          subjectName: draft.subject_name,
          examType: draft.exam_type,
          examSections: draft.exam_sections,
          answers: draft.answers,
          mcqAnswers: draft.mcq_answers,
          totalMarks: draft.total_marks,
          timeElapsed: draft.time_elapsed,
          questionMarks,
          totalMarksObtained: result.totalMarksObtained,
          evaluationType: mode,
          evaluationData: result,
          feedback: result.overallFeedback,
        });

        await upsertSubmissionAnalytics(draft, submission.id);

        if (draft.exam_type === "main" && draft.teacher_id) {
          await revokeRetakePermission(draft.teacher_id, profile.id, draft.subject_id).catch(() => {});
        }

        if (mode === "ai" && draft.subject_slug) {
          await saveTestResult(profile.id, draft.subject_slug, result.totalMarksObtained, result.totalMaxMarks).catch(() => {});
          await uploadAiArtifacts(draft, result);
        }

        setDemandPrompt(null);
        await finalizeDraftSuccess(submission.id);
      } finally {
        setProcessingLabel(null);
        setEvalProgress(null);
      }
    },
    [draft, evaluationStrictness, finalizeDraftSuccess, profile, uploadAiArtifacts]
  );

  const evaluatePendingSubmission = useCallback(
    async (submission: SubmissionRow) => {
      setProcessingLabel("Evaluating Saved Attempt");
      setEvalProgress(null);
      try {
        const result = await evaluateExam(
          submission.exam_sections as ExamAnalyticsDraft["exam_sections"],
          submission.answers ?? {},
          submission.mcq_answers ?? {},
          evaluationStrictness,
          (progress) => setEvalProgress(progress)
        );

        const questionMarks = Object.fromEntries(
          result.questionEvaluations.map((question) => [question.questionId, question.marksAwarded])
        );

        await updateSubmissionMarks(
          submission.id,
          questionMarks,
          result.totalMarksObtained,
          result.overallFeedback,
          result
        );

        await refreshData(submission.id);
      } finally {
        setProcessingLabel(null);
        setEvalProgress(null);
      }
    },
    [evaluationStrictness, refreshData]
  );

  const isPendingAi =
    activeSubmission?.status === "pending" &&
    activeSubmission.evaluation_type === "ai" &&
    !activeSubmission.evaluation_data;
  const isPendingAiTeacher =
    activeSubmission?.status === "pending" && activeSubmission.evaluation_type === "ai_teacher";

  const availableSubjects = useMemo(
    () =>
      profileView.subjectSummaries.map((item) => ({
        id: item.subjectId,
        name: item.subjectName,
      })),
    [profileView.subjectSummaries]
  );

  const analyticsBySubmissionId = useMemo(
    () => new Map(analyticsRows.map((item) => [item.submission_id, item])),
    [analyticsRows]
  );

  const scrollToPrimaryContent = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      primaryContentRef.current?.scrollIntoView({
        behavior,
        block: "start",
      });
    });
  }, []);

  const handleOpenAttempt = useCallback(
    (submissionId: string) => {
      setActiveTab("attempt");
      setAttemptViewMode("focus");

      const fallbackLibraryState = lastLibraryStateRef.current;
      const nextLibraryState = {
        activeTab: activeTab === "attempt" ? fallbackLibraryState.activeTab : activeTab,
        selectedSubjectId:
          activeTab === "attempt" ? fallbackLibraryState.selectedSubjectId : selectedSubjectId,
        libraryStatusFilter,
        libraryPage,
      };
      lastLibraryStateRef.current = nextLibraryState;

      if (params.submissionId === submissionId) {
        scrollToPrimaryContent();
        return;
      }

      navigate(`/student/analytics/${submissionId}`, {
        state: {
          libraryState: nextLibraryState,
        } satisfies AnalyticsRouteState,
      });
      scrollToPrimaryContent();
    },
    [activeTab, libraryPage, libraryStatusFilter, navigate, params.submissionId, scrollToPrimaryContent, selectedSubjectId]
  );

  useEffect(() => {
    if (params.submissionId) {
      setAttemptViewMode("focus");
      scrollToPrimaryContent("smooth");
    }
  }, [params.submissionId, scrollToPrimaryContent]);

  const libraryAttempts = useMemo(
    () =>
      submissions
        .filter((submission) => {
          if (libraryStatusFilter !== "all" && submission.status !== libraryStatusFilter) {
            return false;
          }

          if (activeTab === "subject" && selectedSubjectId && submission.subject_id !== selectedSubjectId) {
            return false;
          }

          return true;
        })
        .map((submission) => {
          const analytics = analyticsBySubmissionId.get(submission.id);
          const totalObserved =
            analytics ? analytics.active_duration_seconds + analytics.idle_duration_seconds : 0;
          const activeRatio =
            analytics && totalObserved > 0
              ? Math.round((analytics.active_duration_seconds / totalObserved) * 1000) / 10
              : null;

          return {
            submission,
            percentage: getSubmissionPercentage(submission),
            activeRatio,
            typingWpm: analytics?.typing_speed_wpm ?? null,
            isCurrent: params.submissionId === submission.id,
          };
        }),
    [activeTab, analyticsBySubmissionId, libraryStatusFilter, params.submissionId, selectedSubjectId, submissions]
  );

  const totalLibraryPages = Math.max(1, Math.ceil(libraryAttempts.length / LIBRARY_PAGE_SIZE));
  const currentLibraryPage = Math.min(libraryPage, totalLibraryPages - 1);
  const visibleLibraryAttempts = useMemo(
    () =>
      libraryAttempts.slice(
        currentLibraryPage * LIBRARY_PAGE_SIZE,
        currentLibraryPage * LIBRARY_PAGE_SIZE + LIBRARY_PAGE_SIZE
      ),
    [currentLibraryPage, libraryAttempts]
  );

  useEffect(() => {
    if (libraryPage > totalLibraryPages - 1) {
      setLibraryPage(Math.max(0, totalLibraryPages - 1));
    }
  }, [libraryPage, totalLibraryPages]);

  const showAttemptAnalytics = activeTab === "attempt" || isSavedAttemptRoute;

  const attemptQuestionStatusData = useMemo<ChartDatum[]>(
    () => [
      {
        label: "Answered",
        value: attemptView.questions.filter((question) => question.finalStatus === "answered").length,
        color: "#10b981",
        meta: `${attemptView.questions.filter((question) => question.finalStatus === "answered").length} finished with final answers`,
      },
      {
        label: "Marked",
        value: attemptView.questions.filter((question) => question.finalStatus === "marked").length,
        color: "#f59e0b",
        meta: `${attemptView.questions.filter((question) => question.finalStatus === "marked").length} left for review`,
      },
      {
        label: "Skipped",
        value: attemptView.questions.filter((question) => question.finalStatus === "skipped").length,
        color: "#ef4444",
        meta: `${attemptView.questions.filter((question) => question.finalStatus === "skipped").length} visited but unanswered`,
      },
      {
        label: "Unattempted",
        value: attemptView.questions.filter((question) => question.finalStatus === "unattempted").length,
        color: "#94a3b8",
        meta: `${attemptView.questions.filter((question) => question.finalStatus === "unattempted").length} never opened deeply enough to answer`,
      },
    ],
    [attemptView.questions]
  );

  const attemptFocusData = useMemo<ChartDatum[]>(
    () => [
      {
        label: "Active",
        value: attemptView.activeDurationSeconds,
        color: "#0284c7",
        meta: `${formatDuration(attemptView.activeDurationSeconds)} of focused work time`,
      },
      {
        label: "Idle",
        value: attemptView.idleDurationSeconds,
        color: "#e2e8f0",
        meta: `${formatDuration(attemptView.idleDurationSeconds)} detected as idle`,
      },
    ],
    [attemptView.activeDurationSeconds, attemptView.idleDurationSeconds]
  );

  const attemptSectionTimeData = useMemo<ChartDatum[]>(
    () =>
      attemptView.sections.map((section, index) => ({
        label: section.sectionName,
        value: section.timeSpentSeconds,
        color: CHART_COLORS[index % CHART_COLORS.length],
        meta: `${section.answeredCount}/${section.questionCount} answered`,
      })),
    [attemptView.sections]
  );

  const attemptTimelinePoints = useMemo<TrendPoint[]>(
    () =>
      attemptView.timeline.map((item) => ({
        label: item.label,
        value: item.activeSeconds,
        valueLabel: formatDuration(item.activeSeconds),
        meta: `${item.answers} answer events`,
      })),
    [attemptView.timeline]
  );

  const subjectAttemptMixData = useMemo<ChartDatum[]>(
    () =>
      subjectView
        ? [
            {
              label: "Evaluated",
              value: subjectView.evaluatedAttemptCount,
              color: "#10b981",
              meta: `${subjectView.evaluatedAttemptCount} attempts already scored`,
            },
            {
              label: "Pending",
              value: subjectView.pendingAttemptCount,
              color: "#f59e0b",
              meta: `${subjectView.pendingAttemptCount} attempts waiting for evaluation`,
            },
          ]
        : [],
    [subjectView]
  );

  const subjectRecentTrendPoints = useMemo<TrendPoint[]>(
    () =>
      (subjectView?.recentAttempts ?? []).slice().reverse().map((attempt) => ({
        label: attempt.label,
        value: attempt.percentage ?? attempt.activeRatio ?? 0,
        valueLabel:
          attempt.percentage !== null && attempt.percentage !== undefined
            ? `${attempt.percentage.toFixed(1)}%`
            : `${(attempt.activeRatio ?? 0).toFixed(1)}% active`,
        meta:
          attempt.percentage !== null && attempt.percentage !== undefined
            ? `${formatDuration(attempt.durationSeconds)} total duration`
            : "Pending evaluation, showing focus ratio",
      })),
    [subjectView]
  );

  const subjectSectionChartData = useMemo<ChartDatum[]>(
    () =>
      (subjectView?.sectionRollup ?? []).map((section, index) => ({
        label: section.sectionName,
        value: section.averageTimeSeconds,
        color: CHART_COLORS[index % CHART_COLORS.length],
        meta: section.averageScorePercentage !== null ? `${section.averageScorePercentage.toFixed(1)}% average score` : "Pending score mix",
      })),
    [subjectView]
  );

  const profileAttemptMixData = useMemo<ChartDatum[]>(
    () => [
      {
        label: "Evaluated",
        value: profileView.evaluatedAttemptCount,
        color: "#10b981",
        meta: `${profileView.evaluatedAttemptCount} attempts already scored`,
      },
      {
        label: "Pending",
        value: profileView.pendingAttemptCount,
        color: "#f59e0b",
        meta: `${profileView.pendingAttemptCount} still waiting for scoring`,
      },
    ],
    [profileView.evaluatedAttemptCount, profileView.pendingAttemptCount]
  );

  const profileRecentTrendPoints = useMemo<TrendPoint[]>(
    () =>
      profileView.recentAttempts
        .slice()
        .reverse()
        .map((attempt) => ({
          label: truncateLabel(attempt.subjectName, 12),
          value: attempt.percentage ?? attempt.activeRatio ?? 0,
          valueLabel:
            attempt.percentage !== null && attempt.percentage !== undefined
              ? `${attempt.percentage.toFixed(1)}%`
              : `${(attempt.activeRatio ?? 0).toFixed(1)}% active`,
          meta: `${formatShortDate(attempt.createdAt)} - ${formatDuration(attempt.durationSeconds)}`,
        })),
    [profileView.recentAttempts]
  );

  const profileSubjectScoreData = useMemo<ChartDatum[]>(
    () =>
      profileView.subjectSummaries.map((subject, index) => ({
        label: subject.subjectName,
        value: subject.averagePercentage ?? 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
        meta: `${subject.attemptCount} attempts`,
      })),
    [profileView.subjectSummaries]
  );

  const profileSubjectFocusData = useMemo<ChartDatum[]>(
    () =>
      profileView.subjectSummaries.map((subject, index) => ({
        label: subject.subjectName,
        value: subject.averageActiveRatio ?? 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
        meta: `${subject.averageTypingWpm?.toFixed(1) ?? "0"} WPM`,
      })),
    [profileView.subjectSummaries]
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eff6ff_40%,#f8fafc_100%)]">
      <Navbar />

      <div className="container mx-auto px-4 pb-10 pt-24">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
        >
          <div className="grid gap-8 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(135deg,_#ffffff,_#f8fafc)] p-6 sm:p-8 lg:grid-cols-[1.4fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-800">
                <Sparkles className="h-3.5 w-3.5" />
                {isSavedAttemptRoute ? "Saved Attempt Analytics" : "Deep Exam Analytics"}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {isSavedAttemptRoute
                  ? activeSubmission?.subject_name ?? "Focused attempt intelligence"
                  : draft
                  ? "Attempt intelligence before evaluation"
                  : "Attempt, subject, and profile intelligence"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {isSavedAttemptRoute
                  ? "This page stays locked to the saved attempt you opened, so the view stays clean. Use the browser back button or the library button below to return."
                  : "Review time on each question, navigation jumps, focus loss, typing speed, section pacing, and score efficiency from one analytics workspace."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={isSavedAttemptRoute ? "/student/analytics" : studentExamEntryPath}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#071952]/30 hover:text-[#071952]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isSavedAttemptRoute ? "Back to Analytics Library" : studentExamEntryLabel}
                </Link>
                <Link
                  to="/my-results"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#071952] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#071952]/90"
                >
                  Review Results
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
              {isSavedAttemptRoute ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Opened Attempt</p>
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {activeSubmission?.subject_name ?? "Saved attempt"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      This view only shows the single saved attempt you opened from the library.
                    </p>
                    {activeSubmission && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <SubmissionStatusPill status={activeSubmission.status} />
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {formatShortDate(activeSubmission.created_at)} -{" "}
                          {activeSubmission.exam_type === "main" ? EXAM_PORTAL_LABEL : "Prep Exam"}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Current Lens</p>
                  <div className="mt-4 flex flex-wrap gap-2 rounded-full bg-slate-100 p-1">
                    <SegmentButton
                      active={activeTab === "subject"}
                      label="Subject"
                      onClick={() => {
                        setActiveTab("subject");
                        scrollToPrimaryContent();
                      }}
                    />
                    <SegmentButton
                      active={activeTab === "profile"}
                      label="Profile"
                      onClick={() => {
                        setActiveTab("profile");
                        scrollToPrimaryContent();
                      }}
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {activeTab === "attempt"
                        ? draft?.subject_name ?? activeSubmission?.subject_name ?? "Attempt analytics"
                        : activeTab === "subject"
                        ? subjectView?.subjectName ?? "Subject analytics"
                        : "Profile analytics"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {activeTab === "attempt"
                        ? "See what happened during this exact attempt, before and after evaluation."
                        : activeTab === "subject"
                        ? "Track momentum, question hotspots, and section pacing across the subject."
                        : "Spot your strongest subjects, improvement trend, and consistency across exams."}
                    </p>

                    {activeTab === "attempt" && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                        This page is focused on the currently opened attempt. Use `Subject` or `Profile` above to switch lens.
                      </div>
                    )}

                    {activeTab === "subject" && availableSubjects.length > 0 && (
                      <div className="mt-4">
                        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                          Subject Filter
                        </label>
                        <select
                          value={selectedSubjectId}
                          onChange={(event) => {
                            setSelectedSubjectId(event.target.value);
                            setActiveTab("subject");
                            scrollToPrimaryContent();
                          }}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#071952]"
                        >
                          {availableSubjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.section>

        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : (
          <>
            <div ref={primaryContentRef} className="scroll-mt-32" />

            {showAttemptAnalytics && (
              <>
                <section className="mt-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Active Attempt
                      </div>
                      <h2 className="mt-3 text-2xl font-bold text-slate-900">
                        {draft?.subject_name ?? activeSubmission?.subject_name ?? "Attempt analytics"}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {draft
                          ? "You are reviewing a finished draft before evaluation."
                          : activeSubmission
                          ? `${formatShortDate(activeSubmission.created_at)} - ${
                              activeSubmission.exam_type === "main" ? EXAM_PORTAL_LABEL : "Prep Exam"
                            }`
                          : "Pick a saved attempt from the library to focus the page."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:items-end">
                      {activeSubmission && <SubmissionStatusPill status={activeSubmission.status} />}
                      <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1">
                        <SegmentButton
                          active={attemptViewMode === "focus"}
                          label="Focus View"
                          onClick={() => setAttemptViewMode("focus")}
                        />
                        <SegmentButton
                          active={attemptViewMode === "deep"}
                          label="Deep Dive"
                          onClick={() => setAttemptViewMode("deep")}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Focus View keeps the core insights up front. Deep Dive opens the heavy timeline and question table.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Total Time"
                    value={formatDuration(attemptView.totalDurationSeconds)}
                    hint={`${attemptView.answeredQuestions}/${attemptView.totalQuestions} answered`}
                    icon={Clock3}
                  />
                  <StatCard
                    label="Active Focus"
                    value={`${attemptView.activeRatio.toFixed(1)}%`}
                    hint={`${formatDuration(attemptView.activeDurationSeconds)} active work`}
                    icon={Gauge}
                  />
                  <StatCard
                    label="Typing Speed"
                    value={`${attemptView.typingWpm.toFixed(1)} WPM`}
                    hint={`${attemptView.totalWordsTyped} total words typed`}
                    icon={Zap}
                  />
                  <StatCard
                    label="Evaluation"
                    value={
                      attemptView.evaluationResult
                        ? formatPercent(attemptView.evaluationResult.percentage)
                        : activeSubmission?.status === "pending"
                        ? "Pending"
                        : "Not started"
                    }
                    hint={attemptView.evaluationResult ? `Grade ${attemptView.evaluationResult.grade}` : "Choose how to evaluate this attempt"}
                    icon={Target}
                  />
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-2">
                  <DistributionChartCard
                    eyebrow="Attempt Mix"
                    title="Question completion split"
                    data={attemptQuestionStatusData}
                    centerValue={`${attemptView.answeredQuestions}/${attemptView.totalQuestions}`}
                    centerHint="questions answered"
                  />
                  <DistributionChartCard
                    eyebrow="Focus Split"
                    title="Active work versus idle time"
                    data={attemptFocusData}
                    centerValue={`${attemptView.activeRatio.toFixed(1)}%`}
                    centerHint="active focus ratio"
                    valueFormatter={formatDuration}
                  />
                  <DistributionChartCard
                    eyebrow="Section Share"
                    title="Where the attempt spent time"
                    data={attemptSectionTimeData}
                    centerValue={formatDuration(attemptView.totalDurationSeconds)}
                    centerHint="total attempt time"
                    valueFormatter={formatDuration}
                  />
                  <TrendChartCard
                    eyebrow="Pace Graph"
                    title="Active rhythm across the attempt"
                    points={attemptTimelinePoints}
                    stroke="#0f766e"
                    valueFormatter={formatDuration}
                    domainMax={300}
                    yAxisLabel="Active time per 5m block"
                  />
                </section>

                <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Attempt Overview</p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">What this attempt says</h2>
                      </div>
                      {attemptView.evaluationResult && (
                        <div className={`text-right ${gradeColor(attemptView.evaluationResult.percentage)}`}>
                          <p className="text-3xl font-black">{attemptView.evaluationResult.grade}</p>
                          <p className="text-sm font-semibold text-slate-500">
                            {attemptView.evaluationResult.totalMarksObtained}/{attemptView.evaluationResult.totalMaxMarks}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Interaction density</p>
                        <div className="mt-4 space-y-4">
                          <BarRow label="Edit events" value={attemptView.answerChangeCount} total={Math.max(attemptView.answerChangeCount, 1)} />
                          <BarRow label="Navigator jumps" value={attemptView.navigatorJumpCount} total={Math.max(attemptView.navigatorJumpCount, 1)} tone="from-amber-500 to-orange-400" />
                          <BarRow label="Focus losses" value={attemptView.focusLossCount} total={Math.max(attemptView.focusLossCount, 1)} tone="from-rose-500 to-amber-400" />
                          <BarRow label="Paste events" value={attemptView.pasteEventCount} total={Math.max(attemptView.pasteEventCount, 1)} tone="from-emerald-500 to-teal-400" />
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Highlights</p>
                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                          <div className="rounded-2xl bg-white p-3">
                            <p className="font-semibold text-slate-900">Longest dwell</p>
                            <p>{attemptView.highlights.longestQuestion?.questionLabel ?? "N/A"} spent {formatDuration(attemptView.highlights.longestQuestion?.timeSpentSeconds ?? 0)}</p>
                          </div>
                          <div className="rounded-2xl bg-white p-3">
                            <p className="font-semibold text-slate-900">Most edited</p>
                            <p>{attemptView.highlights.mostEditedQuestion?.questionLabel ?? "N/A"} logged {attemptView.highlights.mostEditedQuestion?.answerChanges ?? 0} edit events</p>
                          </div>
                          <div className="rounded-2xl bg-white p-3">
                            <p className="font-semibold text-slate-900">Most revisited</p>
                            <p>{attemptView.highlights.mostRevisitedQuestion?.questionLabel ?? "N/A"} revisited {attemptView.highlights.mostRevisitedQuestion?.revisits ?? 0} times</p>
                          </div>
                          {attemptView.highlights.strongestQuestion && (
                            <div className="rounded-2xl bg-white p-3">
                              <p className="font-semibold text-slate-900">Best score efficiency</p>
                              <p>{attemptView.highlights.strongestQuestion.questionLabel} returned {formatPercent(attemptView.highlights.strongestQuestion.scorePercentage)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Next Step</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">Evaluation workflow</h2>

                    {draft ? (
                      <div className="mt-5 space-y-3">
                        {draft.exam_type === "main" ? (
                          <button
                            onClick={() => sendDraftToTeacher(draft)}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071952] px-4 py-4 text-sm font-semibold text-white transition hover:bg-[#071952]/90"
                          >
                            <UserCheck className="h-4 w-4" />
                            Submit {EXAM_PORTAL_LABEL}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => evaluateDraft("ai")}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071952] px-4 py-4 text-sm font-semibold text-white transition hover:bg-[#071952]/90"
                            >
                              <Cpu className="h-4 w-4" />
                              Super Teacher
                            </button>
                            <button
                              onClick={() => evaluateDraft("ai_teacher")}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-[#071952]/20 hover:text-[#071952]"
                            >
                              <Brain className="h-4 w-4" />
                              Super Teacher + Teacher
                            </button>
                            <button
                              onClick={() => sendDraftToTeacher(draft)}
                              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-[#071952]/20 hover:text-[#071952]"
                            >
                              <UserCheck className="h-4 w-4" />
                              Submit to Teacher
                            </button>
                          </>
                        )}
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                          This analytics snapshot is locked to your finished answers. Returning here will not reopen the exam editor.
                        </div>
                      </div>
                    ) : isPendingAi && activeSubmission ? (
                      <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                        <p className="font-semibold">Saved during high demand</p>
                        <p className="mt-1">Your attempt analytics are ready. Run Super Teacher now when you want detailed scoring.</p>
                        <button
                          onClick={() => evaluatePendingSubmission(activeSubmission)}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
                        >
                          <Sparkles className="h-4 w-4" />
                          Evaluate Now
                        </button>
                      </div>
                    ) : isPendingAiTeacher ? (
                      <div className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm text-sky-800">
                        <p className="font-semibold">Waiting for teacher review</p>
                        <p className="mt-1">Super Teacher has already scored this attempt. The teacher now reviews and finalizes your result.</p>
                      </div>
                    ) : attemptView.evaluationResult ? (
                      <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                        <p className="font-semibold">Evaluation complete</p>
                        <p className="mt-1">{attemptView.evaluationResult.overallFeedback}</p>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        Open a draft attempt or a saved submission to continue from here.
                      </div>
                    )}

                    {demandPrompt && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">High demand detected</p>
                        <p className="mt-1 text-sm text-amber-800">
                          There were {demandPrompt.recentCount} recent submissions for this subject. You can still evaluate now, or save the attempt and come back later.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            onClick={() => evaluateDraft(demandPrompt.mode, true)}
                            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                          >
                            Evaluate Anyway
                          </button>
                          <button
                            onClick={() => saveDraftForLaterEvaluation(demandPrompt.mode)}
                            className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                          >
                            Save for Later
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className={`mt-8 grid gap-6 ${attemptViewMode === "deep" ? "lg:grid-cols-[0.95fr_1.05fr]" : ""}`}>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Section Pacing</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">How time moved across sections</h2>
                    <div className="mt-5 space-y-4">
                      {attemptView.sections.map((section) => (
                        <div key={section.sectionId} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{section.sectionName}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {section.answeredCount}/{section.questionCount} answered
                              </p>
                            </div>
                            <div className="text-right text-sm text-slate-600">
                              <p>{formatDuration(section.timeSpentSeconds)}</p>
                              <p>{formatPercent(section.scorePercentage)}</p>
                            </div>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-white">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#071952] to-sky-500"
                              style={{ width: `${Math.min((section.timeSpentSeconds / Math.max(attemptView.totalDurationSeconds, 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {attemptViewMode === "deep" && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Attempt Timeline</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">Pace blocks every 5 minutes</h2>
                      <div className="mt-5 space-y-4">
                        {attemptView.timeline.map((item, index) => (
                          <div key={`${item.label}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-slate-800">{item.label}</span>
                              <span className="text-slate-500">{item.answers} answer events</span>
                            </div>
                            <div className="mt-3 grid gap-2">
                              <BarRow label="Active time" value={item.activeSeconds} total={300} tone="from-emerald-500 to-teal-400" suffix="s" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {attemptViewMode === "deep" ? (
                  <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Question Grid</p>
                        <h2 className="mt-2 text-xl font-bold text-slate-900">Per-question analytics</h2>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {attemptView.questions.length} questions
                      </div>
                    </div>
                    <div className="mt-5 overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                            <th className="px-3 py-3">Question</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Time</th>
                            <th className="px-3 py-3">Visits</th>
                            <th className="px-3 py-3">Edits</th>
                            <th className="px-3 py-3">Typing</th>
                            <th className="px-3 py-3">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attemptView.questions.map((question, index) => (
                            <tr key={`${question.sectionId}-${question.questionId}-${index}`} className="border-b border-slate-100 align-top">
                              <td className="px-3 py-4">
                                <p className="font-semibold text-slate-900">{question.questionLabel}</p>
                                <p className="mt-1 max-w-md text-sm text-slate-500">{question.questionText}</p>
                              </td>
                              <td className="px-3 py-4">
                                <QuestionStatusPill status={question.finalStatus} />
                              </td>
                              <td className="px-3 py-4 text-sm text-slate-600">{formatDuration(question.timeSpentSeconds)}</td>
                              <td className="px-3 py-4 text-sm text-slate-600">
                                {question.visits} visits
                                <div className="text-xs text-slate-400">{question.revisits} revisits</div>
                              </td>
                              <td className="px-3 py-4 text-sm text-slate-600">
                                {question.answerChanges} edits
                                <div className="text-xs text-slate-400">{question.markForReviewCount} marked</div>
                              </td>
                              <td className="px-3 py-4 text-sm text-slate-600">
                                {question.typingWords} words
                                <div className="text-xs text-slate-400">{question.backspaceCount} backspaces</div>
                              </td>
                              <td className={`px-3 py-4 text-sm font-semibold ${gradeColor(question.scorePercentage)}`}>
                                {question.scorePercentage === null ? "Pending" : `${question.marksAwarded}/${question.maxMarks}`}
                                {question.feedback && <div className="mt-1 max-w-xs text-xs font-normal text-slate-400">{question.feedback}</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : (
                  <section className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Deep Detail Hidden</p>
                        <h2 className="mt-2 text-xl font-bold text-slate-900">Question-by-question data is tucked away for now</h2>
                        <p className="mt-2 text-sm text-slate-500">
                          Switch to Deep Dive when you want the full timeline and per-question breakdown without loading the page with tables by default.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttemptViewMode("deep")}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#071952] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#071952]/90"
                      >
                        Open Deep Dive
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}

            {!isSavedAttemptRoute && activeTab === "subject" && subjectView && (
              <>
                <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Attempts" value={String(subjectView.attemptCount)} hint={`${subjectView.evaluatedAttemptCount} evaluated`} icon={BookOpen} />
                  <StatCard label="Average Score" value={formatPercent(subjectView.averagePercentage)} hint={`Best ${formatPercent(subjectView.bestPercentage)}`} icon={TrendingUp} />
                  <StatCard label="Average Time" value={formatDuration(subjectView.averageDurationSeconds ?? 0)} hint="Per attempt" icon={Clock3} />
                  <StatCard label="Focus Quality" value={subjectView.averageActiveRatio ? `${subjectView.averageActiveRatio.toFixed(1)}%` : "N/A"} hint={`Typing ${subjectView.averageTypingWpm?.toFixed(1) ?? 0} WPM`} icon={Gauge} />
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-2">
                  <DistributionChartCard
                    eyebrow="Attempt State"
                    title="Subject evaluation split"
                    data={subjectAttemptMixData}
                    centerValue={String(subjectView.attemptCount)}
                    centerHint="saved attempts in this subject"
                  />
                  <TrendChartCard
                    eyebrow="Score Trend"
                    title="How recent attempts are moving"
                    points={subjectRecentTrendPoints}
                    stroke="#0284c7"
                    valueFormatter={(value) => `${value.toFixed(1)}%`}
                    domainMax={100}
                    yAxisLabel="Score / focus ratio"
                  />
                  <RankedBarChartCard
                    eyebrow="Section Cost"
                    title="Average time spent per section"
                    data={subjectSectionChartData}
                    valueFormatter={formatDuration}
                  />
                  <RankedBarChartCard
                    eyebrow="Question Hotspots"
                    title="Questions absorbing the most editing"
                    data={subjectView.questionRollup.slice(0, 6).map((question, index) => ({
                      label: question.questionLabel,
                      value: question.averageAnswerChanges,
                      color: CHART_COLORS[index % CHART_COLORS.length],
                      meta: `${formatDuration(question.averageTimeSeconds)} average time`,
                    }))}
                  />
                </section>

                <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recent Attempts</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">Subject momentum</h2>
                    <div className="mt-5 space-y-4">
                      {subjectView.recentAttempts.map((attempt) => (
                        <button
                          key={attempt.submissionId}
                          type="button"
                          onClick={() => handleOpenAttempt(attempt.submissionId)}
                          className="block w-full rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{attempt.label}</p>
                              <p className="mt-1 text-xs text-slate-500">{formatDuration(attempt.durationSeconds)} total duration</p>
                            </div>
                            <div className={`text-right text-sm font-semibold ${gradeColor(attempt.percentage)}`}>
                              <p>{formatPercent(attempt.percentage)}</p>
                              <p className="text-xs font-normal text-slate-400">{attempt.activeRatio ? `${attempt.activeRatio}% active` : "Partial analytics"}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Section Rollup</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">Where this subject costs time</h2>
                    <div className="mt-5 space-y-4">
                      {subjectView.sectionRollup.map((section) => (
                        <div key={section.sectionId} className="rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{section.sectionName}</p>
                              <p className="mt-1 text-xs text-slate-500">Average {formatDuration(section.averageTimeSeconds)}</p>
                            </div>
                            <span className={`text-sm font-semibold ${gradeColor(section.averageScorePercentage)}`}>
                              {formatPercent(section.averageScorePercentage)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Question Hotspots</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">Questions that repeatedly absorb time</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {subjectView.questionRollup.slice(0, 8).map((question, index) => (
                      <div key={`${question.questionId}-${question.questionText}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{question.questionLabel}</p>
                            <p className="mt-1 text-sm text-slate-500">{question.questionText}</p>
                          </div>
                          <div className={`text-right text-sm font-semibold ${gradeColor(question.averageScorePercentage)}`}>
                            {formatPercent(question.averageScorePercentage)}
                          </div>
                        </div>
                        <div className="mt-4 space-y-3">
                          <BarRow label="Average time" value={question.averageTimeSeconds} total={Math.max(question.averageTimeSeconds, 1)} suffix="s" />
                          <BarRow label="Average edit events" value={question.averageAnswerChanges} total={Math.max(question.averageAnswerChanges, 1)} tone="from-amber-500 to-orange-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {!isSavedAttemptRoute && activeTab === "profile" && (
              <>
                <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Total Attempts" value={String(profileView.attemptCount)} hint={`${profileView.pendingAttemptCount} pending`} icon={Layers3} />
                  <StatCard label="Average Score" value={formatPercent(profileView.averagePercentage)} hint={`${profileView.evaluatedAttemptCount} evaluated attempts`} icon={TrendingUp} />
                  <StatCard label="Total Exam Time" value={formatDuration(profileView.totalExamSeconds)} hint={`Average ${formatDuration(profileView.averageDurationSeconds ?? 0)} per attempt`} icon={Clock3} />
                  <StatCard label="Average Typing" value={profileView.averageTypingWpm ? `${profileView.averageTypingWpm.toFixed(1)} WPM` : "N/A"} hint={profileView.averageActiveRatio ? `${profileView.averageActiveRatio.toFixed(1)}% active focus` : "Partial analytics"} icon={Zap} />
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-2">
                  <DistributionChartCard
                    eyebrow="Profile Mix"
                    title="Evaluated versus pending attempts"
                    data={profileAttemptMixData}
                    centerValue={String(profileView.attemptCount)}
                    centerHint="total analytics records"
                  />
                  <TrendChartCard
                    eyebrow="Recent Graph"
                    title="Latest attempt trend across the profile"
                    points={profileRecentTrendPoints}
                    stroke="#7c3aed"
                    valueFormatter={(value) => `${value.toFixed(1)}%`}
                    domainMax={100}
                    yAxisLabel="Score / focus ratio"
                  />
                  <RankedBarChartCard
                    eyebrow="Subject Scores"
                    title="Average score by subject"
                    data={profileSubjectScoreData}
                    valueFormatter={(value) => `${value.toFixed(1)}%`}
                    domainMax={100}
                  />
                  <RankedBarChartCard
                    eyebrow="Subject Focus"
                    title="Average focus quality by subject"
                    data={profileSubjectFocusData}
                    valueFormatter={(value) => `${value.toFixed(1)}%`}
                    domainMax={100}
                  />
                </section>

                <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Profile Signals</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">Your strongest patterns</h2>
                    <div className="mt-5 space-y-4 text-sm text-slate-600">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">Strongest subject</p>
                        <p className="mt-1">
                          {profileView.strongestSubject
                            ? `${profileView.strongestSubject.subjectName} at ${profileView.strongestSubject.averagePercentage.toFixed(1)}% average`
                            : "Complete more evaluated attempts to surface this"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">Most improved subject</p>
                        <p className="mt-1">
                          {profileView.mostImprovedSubject
                            ? `${profileView.mostImprovedSubject.subjectName} improved by ${profileView.mostImprovedSubject.improvement.toFixed(1)} points`
                            : "Need at least two evaluated attempts in the same subject"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">Evaluation readiness</p>
                        <p className="mt-1">{profileView.pendingAttemptCount} attempts are waiting for scoring or teacher review.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recent Attempts</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">Latest exam rhythm</h2>
                    <div className="mt-5 space-y-3">
                      {profileView.recentAttempts.map((attempt) => (
                        <button
                          key={attempt.submissionId}
                          type="button"
                          onClick={() => handleOpenAttempt(attempt.submissionId)}
                          className="flex w-full items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{attempt.subjectName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {new Date(attempt.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${gradeColor(attempt.percentage)}`}>{formatPercent(attempt.percentage)}</p>
                            <p className="text-xs text-slate-500">
                              {formatDuration(attempt.durationSeconds)}
                              {attempt.activeRatio ? ` - ${attempt.activeRatio}% active` : " - Partial analytics"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Subject Matrix</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">All subject summaries</h2>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {profileView.subjectSummaries.map((subject) => (
                      <div key={subject.subjectId} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{subject.subjectName}</p>
                            <p className="mt-1 text-xs text-slate-500">{subject.attemptCount} total attempts</p>
                          </div>
                          <span className={`text-sm font-semibold ${gradeColor(subject.averagePercentage)}`}>
                            {formatPercent(subject.averagePercentage)}
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          <BarRow label="Average active focus" value={subject.averageActiveRatio ?? 0} total={100} tone="from-emerald-500 to-teal-400" suffix="%" />
                          <BarRow label="Average typing speed" value={subject.averageTypingWpm ?? 0} total={Math.max(subject.averageTypingWpm ?? 0, 1)} tone="from-amber-500 to-orange-400" suffix=" wpm" />
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSubjectId(subject.subjectId);
                            setActiveTab("subject");
                            scrollToPrimaryContent();
                          }}
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#071952] transition hover:text-[#071952]/80"
                        >
                          Open subject analytics
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {!isSavedAttemptRoute && (
              <section className="mt-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Saved Attempt Library
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">Analytics library for every saved attempt</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Open any saved attempt in a clean detail view. When you go back, the analytics library returns exactly to this workspace instead of staying stuck on the attempt.
                  </p>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="mr-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <Filter className="h-3.5 w-3.5" />
                      Library Filter
                    </div>
                    <FilterPill active={libraryStatusFilter === "all"} label="All" onClick={() => setLibraryStatusFilter("all")} />
                    <FilterPill active={libraryStatusFilter === "pending"} label="Pending" onClick={() => setLibraryStatusFilter("pending")} />
                    <FilterPill active={libraryStatusFilter === "evaluated"} label="Evaluated" onClick={() => setLibraryStatusFilter("evaluated")} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>
                      Showing {libraryAttempts.length === 0 ? 0 : currentLibraryPage * LIBRARY_PAGE_SIZE + 1}
                      -
                      {Math.min((currentLibraryPage + 1) * LIBRARY_PAGE_SIZE, libraryAttempts.length)} of {libraryAttempts.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLibraryPage((current) => Math.max(0, current - 1))}
                      disabled={currentLibraryPage === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-[#071952]/20 hover:text-[#071952] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Prev
                    </button>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                      Page {currentLibraryPage + 1}/{totalLibraryPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLibraryPage((current) => Math.min(totalLibraryPages - 1, current + 1))}
                      disabled={currentLibraryPage >= totalLibraryPages - 1}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-[#071952]/20 hover:text-[#071952] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 xl:grid-cols-2">
                {visibleLibraryAttempts.length > 0 ? (
                  visibleLibraryAttempts.map((item) => (
                    <button
                      key={item.submission.id}
                      type="button"
                      onClick={() => handleOpenAttempt(item.submission.id)}
                      className={`rounded-3xl border p-4 text-left transition ${
                        item.isCurrent
                          ? "border-[#071952]/20 bg-[#071952]/[0.03] shadow-[0_16px_50px_rgba(7,25,82,0.08)]"
                          : "border-slate-200 bg-slate-50 hover:border-[#071952]/20 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-slate-900">{item.submission.subject_name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {formatShortDate(item.submission.created_at)} -{" "}
                            {item.submission.exam_type === "main" ? EXAM_PORTAL_LABEL : "Prep Exam"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <SubmissionStatusPill status={item.submission.status} />
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#071952]">
                            {item.isCurrent ? "Viewing" : "Open"}
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <LibraryMetricChip
                          label="Score"
                          value={formatPercent(item.percentage)}
                          tone={item.percentage !== null ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                        />
                        <LibraryMetricChip label="Duration" value={formatDuration(item.submission.time_elapsed)} />
                        <LibraryMetricChip
                          label="Focus"
                          value={item.activeRatio !== null ? `${item.activeRatio.toFixed(1)}%` : "N/A"}
                          tone="bg-sky-50 text-sky-700"
                        />
                        {item.typingWpm !== null && <LibraryMetricChip label="Typing" value={`${item.typingWpm.toFixed(1)} WPM`} tone="bg-violet-50 text-violet-700" />}
                      </div>

                      <p className="mt-4 text-sm text-slate-500">
                        {item.submission.status === "evaluated"
                          ? "Scored analytics ready to revisit."
                          : item.submission.evaluation_type === "teacher"
                          ? "Teacher review pending."
                          : item.submission.evaluation_type === "ai_teacher"
                          ? "Teacher final review pending."
                          : "Saved analytics awaiting AI evaluation."}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500 xl:col-span-2">
                    No attempts match this filter yet. Finish an exam and the analytics record will show up here.
                  </div>
                )}
              </div>
              </section>
            )}
          </>
        )}
      </div>

      {processingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
          <div className="relative mx-4 w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#071952]/10 text-[#071952]">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">{processingLabel}</h3>
              <p className="mt-2 text-sm text-slate-500">Your attempt analytics stay on screen while scoring and saving complete.</p>
            </div>
            {evalProgress && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>{evalProgress.currentSection}</span>
                  <span>
                    {evalProgress.currentQuestion}/{evalProgress.totalQuestions}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#071952] to-sky-500"
                    style={{ width: `${(evalProgress.currentQuestion / Math.max(evalProgress.totalQuestions, 1)) * 100}%` }}
                  />
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{evalProgress.message}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
