import { ChevronDown, ChevronUp, Award, FolderOpen, Briefcase } from 'lucide-react';
import { useState } from 'react';
import type { StudentMatchDetailV2 } from '@/services/skillPointsService';
import SkillPointsBreakdown from './SkillPointsBreakdown';

interface CandidateAnalyticsPanelProps {
  student: StudentMatchDetailV2;
  requiredSkills: string[];
  defaultExpanded?: boolean;
}

export default function CandidateAnalyticsPanel({
  student,
  requiredSkills,
  defaultExpanded = false,
}: CandidateAnalyticsPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const scoreColor =
    student.overallScore >= 70
      ? 'text-green-600'
      : student.overallScore >= 40
        ? 'text-amber-600'
        : 'text-gray-500';

  const scoreBg =
    student.overallScore >= 70
      ? 'bg-green-50 border-green-200'
      : student.overallScore >= 40
        ? 'bg-amber-50 border-amber-200'
        : 'bg-gray-50 border-gray-200';

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${expanded ? scoreBg : 'border-gray-100 bg-white'}`}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        {/* Avatar */}
        {student.avatarUrl ? (
          <img
            src={student.avatarUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#071952] flex items-center justify-center text-white text-sm font-bold">
            {student.username.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#071952] truncate">{student.username}</p>
          <p className="text-xs text-gray-400 truncate">
            {student.topEvidence.slice(0, 3).join(' · ') || 'No matching evidence'}
          </p>
        </div>

        {/* Score badge */}
        <div className="text-right shrink-0 mr-2">
          <span className={`text-lg font-bold ${scoreColor}`}>{student.overallScore}</span>
          <span className="text-[10px] text-gray-400 block">/ 100</span>
        </div>

        {/* Top 3 skill mini bars */}
        <div className="hidden sm:flex flex-col gap-1 w-24 shrink-0">
          {student.perSkill.slice(0, 3).map((ps) => (
            <div key={ps.skill} className="flex items-center gap-1">
              <span className="text-[9px] text-gray-400 w-12 truncate">{ps.skill}</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    ps.points >= 70 ? 'bg-green-500' : ps.points >= 40 ? 'bg-amber-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${ps.points}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-200 p-5 space-y-5">
          {/* Match Ring + Score */}
          <div className="flex items-start gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  className={
                    student.overallScore >= 70
                      ? 'stroke-green-500'
                      : student.overallScore >= 40
                        ? 'stroke-amber-500'
                        : 'stroke-gray-400'
                  }
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(student.overallScore / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold ${scoreColor}`}>{student.overallScore}</span>
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-bold text-[#071952] mb-1">Match Breakdown</h4>
              <p className="text-xs text-gray-500 mb-3">
                Matching {requiredSkills.length} required skill{requiredSkills.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {student.topEvidence.map((ev, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#071952]/5 text-[#071952] font-medium"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Per-skill breakdown */}
          <SkillPointsBreakdown perSkill={student.perSkill} />

          {/* Evidence sections */}
          {student.certDetails.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                Relevant Certifications
              </h5>
              <div className="space-y-1.5">
                {student.certDetails.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700">{c.name}</span>
                    <div className="flex gap-1">
                      {c.skills.map((s, si) => (
                        <span key={si} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {student.projectDetails.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                Relevant Projects
              </h5>
              <div className="space-y-1.5">
                {student.projectDetails.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700">{p.title}</span>
                    <div className="flex gap-1">
                      {p.skills.map((s, si) => (
                        <span key={si} className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {student.experienceDetails.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                Relevant Experience
              </h5>
              <div className="space-y-1.5">
                {student.experienceDetails.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700">{e.title}</span>
                    <span className="text-gray-400 text-xs">at {e.company}</span>
                    <div className="flex gap-1">
                      {e.skills.map((s, si) => (
                        <span key={si} className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
