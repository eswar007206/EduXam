import { useState } from "react";
import type { HeatmapDay } from "@/services/heatmapService";

const COLORS: Record<string, string[]> = {
  green: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  blue: ["#ebedf0", "#9ecae1", "#4292c6", "#2171b5", "#084594"],
  purple: ["#ebedf0", "#c4b5fd", "#8b5cf6", "#7c3aed", "#5b21b6"],
};

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface ActivityHeatmapProps {
  data: HeatmapDay[];
  colorScheme?: "green" | "blue" | "purple";
}

export default function ActivityHeatmap({ data, colorScheme = "green" }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: HeatmapDay } | null>(null);

  const colors = COLORS[colorScheme];

  // Organize data into weeks (columns)
  if (data.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-8">
        No activity data yet
      </div>
    );
  }

  // Find the first Sunday on or before the start date
  const firstDate = new Date(data[0].date + "T00:00:00");
  const startDay = firstDate.getDay(); // 0=Sun
  const paddedData: (HeatmapDay | null)[] = [
    ...Array(startDay).fill(null),
    ...data,
  ];

  // Split into weeks of 7
  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < paddedData.length; i += 7) {
    weeks.push(paddedData.slice(i, i + 7));
  }

  // Pad last week
  const lastWeek = weeks[weeks.length - 1];
  while (lastWeek.length < 7) {
    lastWeek.push(null);
  }

  // Month labels
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    for (const day of week) {
      if (day) {
        const month = new Date(day.date + "T00:00:00").getMonth();
        if (month !== lastMonth) {
          monthLabels.push({ label: MONTH_NAMES[month], weekIndex: wi });
          lastMonth = month;
        }
        break;
      }
    }
  });

  const totalActiveDays = data.filter((d) => d.count > 0).length;
  const totalActivities = data.reduce((sum, d) => sum + d.count, 0);

  const cellSize = 12;
  const cellGap = 2;
  const step = cellSize + cellGap;
  const leftPad = 28;
  const topPad = 18;
  const svgWidth = leftPad + weeks.length * step + 4;
  const svgHeight = topPad + 7 * step + 4;

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-2">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="block"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Day labels */}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={i}
                x={leftPad - 6}
                y={topPad + i * step + cellSize - 2}
                textAnchor="end"
                className="fill-gray-400"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
              >
                {label}
              </text>
            ) : null
          )}

          {/* Month labels */}
          {monthLabels.map(({ label, weekIndex }, i) => (
            <text
              key={i}
              x={leftPad + weekIndex * step}
              y={topPad - 6}
              textAnchor="start"
              className="fill-gray-400"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              {label}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (!day) return null;
              const x = leftPad + wi * step;
              const y = topPad + di * step;
              return (
                <rect
                  key={`${wi}-${di}`}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={colors[day.intensity]}
                  className="transition-opacity hover:opacity-80 cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = (e.target as SVGRectElement).getBoundingClientRect();
                    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, day });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[100] px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y - 36,
            transform: "translateX(-50%)",
          }}
        >
          <span className="font-semibold">{tooltip.day.count} activit{tooltip.day.count === 1 ? "y" : "ies"}</span>
          {" on "}
          {new Date(tooltip.day.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="text-xs text-gray-500">
          {totalActiveDays} active days · {totalActivities} total activities
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Less</span>
          {colors.map((color, i) => (
            <div
              key={i}
              className="w-[10px] h-[10px] rounded-[2px]"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-xs text-gray-400">More</span>
        </div>
      </div>
    </div>
  );
}
