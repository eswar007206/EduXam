import type { PerSkillMatch } from '@/services/skillPointsService';

const SOURCE_COLORS = {
  profile: { bg: 'bg-blue-500', label: 'Profile' },
  certifications: { bg: 'bg-purple-500', label: 'Certs' },
  projects: { bg: 'bg-green-500', label: 'Projects' },
  exams: { bg: 'bg-amber-500', label: 'Exams' },
  experience: { bg: 'bg-teal-500', label: 'Experience' },
} as const;

type SourceKey = keyof typeof SOURCE_COLORS;

interface SkillPointsBreakdownProps {
  perSkill: PerSkillMatch[];
  compact?: boolean;
}

export default function SkillPointsBreakdown({ perSkill, compact = false }: SkillPointsBreakdownProps) {
  if (perSkill.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-1.5">
        {perSkill.map((ps) => (
          <div key={ps.skill} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-20 truncate" title={ps.skill}>
              {ps.skill}
            </span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
              {(Object.keys(SOURCE_COLORS) as SourceKey[]).map((key) => {
                const val = ps.breakdown[key];
                if (val <= 0) return null;
                return (
                  <div
                    key={key}
                    className={`h-full ${SOURCE_COLORS[key].bg}`}
                    style={{ width: `${val}%` }}
                  />
                );
              })}
            </div>
            <span className="text-xs font-semibold text-gray-700 w-8 text-right">
              {ps.points}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(SOURCE_COLORS) as SourceKey[]).map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${SOURCE_COLORS[key].bg}`} />
            <span className="text-[10px] text-gray-500 font-medium">{SOURCE_COLORS[key].label}</span>
          </div>
        ))}
      </div>

      {/* Skill bars */}
      <div className="space-y-2.5">
        {perSkill.map((ps) => (
          <div key={ps.skill}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">{ps.skill}</span>
              <span
                className={`text-sm font-bold ${
                  ps.points >= 70 ? 'text-green-600' : ps.points >= 40 ? 'text-amber-600' : 'text-gray-500'
                }`}
              >
                {ps.points}/100
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              {(Object.keys(SOURCE_COLORS) as SourceKey[]).map((key) => {
                const val = ps.breakdown[key];
                if (val <= 0) return null;
                return (
                  <div
                    key={key}
                    className={`h-full ${SOURCE_COLORS[key].bg} transition-all duration-500`}
                    style={{ width: `${val}%` }}
                    title={`${SOURCE_COLORS[key].label}: ${val} pts`}
                  />
                );
              })}
            </div>
            {/* Source detail */}
            <div className="flex flex-wrap gap-2 mt-1">
              {(Object.keys(SOURCE_COLORS) as SourceKey[]).map((key) => {
                const val = ps.breakdown[key];
                if (val <= 0) return null;
                return (
                  <span key={key} className="text-[10px] text-gray-400">
                    {SOURCE_COLORS[key].label}: {val}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
