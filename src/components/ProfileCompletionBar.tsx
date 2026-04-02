import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import type { ProfileSection } from '@/utils/profileCompletion';

interface ProfileCompletionBarProps {
  percentage: number;
  sections: ProfileSection[];
  compact?: boolean;
}

export default function ProfileCompletionBar({
  percentage,
  sections,
  compact = false,
}: ProfileCompletionBarProps) {
  const barColor =
    percentage >= 80
      ? 'bg-green-500'
      : percentage >= 50
        ? 'bg-amber-500'
        : 'bg-red-400';

  const textColor =
    percentage >= 80
      ? 'text-green-600'
      : percentage >= 50
        ? 'text-amber-600'
        : 'text-red-500';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${barColor} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className={`text-xs font-semibold ${textColor}`}>
          {percentage}%
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#071952]">Profile Completion</h3>
        <span className={`text-lg font-bold ${textColor}`}>{percentage}%</span>
      </div>

      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-5">
        <motion.div
          className={`h-full ${barColor} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sections.map((section) => (
          <div key={section.key} className="flex items-center gap-2 text-sm">
            {section.completed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-300 shrink-0" />
            )}
            <span
              className={
                section.completed ? 'text-gray-600' : 'text-gray-400'
              }
            >
              {section.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
