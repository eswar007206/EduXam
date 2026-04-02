import type { ExamType } from "@/lib/database.types";
import { getExamTypeLabel } from "@/lib/portalLabels";

interface ExamTypeBadgeProps {
  examType: ExamType;
  className?: string;
  compact?: boolean;
}

export default function ExamTypeBadge({
  examType,
  className = "",
  compact = false,
}: ExamTypeBadgeProps) {
  const palette =
    examType === "prep"
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-bold uppercase tracking-wide",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        palette,
        className,
      ].join(" ")}
    >
      {getExamTypeLabel(examType)}
    </span>
  );
}
