import { supabase } from '@/lib/supabase';

export interface HeatmapDay {
  date: string;       // YYYY-MM-DD
  count: number;      // number of activities
  intensity: number;  // 0-4 scale
}

function computeIntensity(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export async function getActivityHeatmap(
  studentId: string,
  daysBack: number = 365
): Promise<HeatmapDay[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startIso = startDate.toISOString();

  const [submissionsRes, testResultsRes] = await Promise.all([
    supabase
      .from('submissions')
      .select('created_at')
      .eq('student_id', studentId)
      .gte('created_at', startIso),
    supabase
      .from('test_results')
      .select('created_at')
      .eq('student_id', studentId)
      .gte('created_at', startIso),
  ]);

  // Build a day -> count map
  const dayMap: Record<string, number> = {};

  const allDates = [
    ...(submissionsRes.data ?? []).map((r) => r.created_at),
    ...(testResultsRes.data ?? []).map((r) => r.created_at),
  ];

  for (const ts of allDates) {
    const day = ts.slice(0, 10); // YYYY-MM-DD
    dayMap[day] = (dayMap[day] || 0) + 1;
  }

  // Build full range array
  const result: HeatmapDay[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const dateStr = current.toISOString().slice(0, 10);
    const count = dayMap[dateStr] || 0;
    result.push({
      date: dateStr,
      count,
      intensity: computeIntensity(count),
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}
