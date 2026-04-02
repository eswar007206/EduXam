export const GRAPH_COLORS: string[] = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#be185d', // pink
  '#854d0e', // brown
  '#4f46e5', // indigo
  '#059669', // emerald
];

export function getNextColor(usedColors: string[]): string {
  const available = GRAPH_COLORS.find(c => !usedColors.includes(c));
  return available ?? GRAPH_COLORS[usedColors.length % GRAPH_COLORS.length];
}
