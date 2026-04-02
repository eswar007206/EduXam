import { Parser } from 'expr-eval';

const parser = new Parser();

export interface ParseResult {
  success: boolean;
  error: string | null;
  evaluate: ((scope: Record<string, number>) => number) | null;
}

export function parseExpression(expression: string): ParseResult {
  try {
    let normalized = expression
      .replace(/ln\(/gi, 'log(')
      .replace(/\bpi\b/gi, 'PI');

    const parsed = parser.parse(normalized);

    return {
      success: true,
      error: null,
      evaluate: (scope: Record<string, number>) => {
        try {
          return parsed.evaluate(scope);
        } catch {
          return NaN;
        }
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Invalid expression',
      evaluate: null,
    };
  }
}

export function numericalDerivative(
  evaluate: (scope: Record<string, number>) => number,
  x: number,
  h: number = 1e-7,
  extraScope: Record<string, number> = {},
): number {
  const yPlus = evaluate({ ...extraScope, x: x + h });
  const yMinus = evaluate({ ...extraScope, x: x - h });
  return (yPlus - yMinus) / (2 * h);
}

export function numericalIntegral(
  evaluate: (scope: Record<string, number>) => number,
  a: number,
  b: number,
  n: number = 100,
  extraScope: Record<string, number> = {},
): number {
  if (n % 2 !== 0) n += 1;
  const h = (b - a) / n;
  let sum = evaluate({ ...extraScope, x: a }) + evaluate({ ...extraScope, x: b });

  for (let i = 1; i < n; i++) {
    const xi = a + i * h;
    const yi = evaluate({ ...extraScope, x: xi });
    if (!isFinite(yi)) continue;
    sum += (i % 2 === 0 ? 2 : 4) * yi;
  }

  return (h / 3) * sum;
}

export function findIntersections(
  evalA: (scope: Record<string, number>) => number,
  evalB: (scope: Record<string, number>) => number,
  xMin: number,
  xMax: number,
  steps: number = 200,
  tolerance: number = 1e-6,
): Array<{ x: number; y: number }> {
  const results: Array<{ x: number; y: number }> = [];
  const dx = (xMax - xMin) / steps;

  for (let i = 0; i < steps; i++) {
    const x1 = xMin + i * dx;
    const x2 = x1 + dx;
    const d1 = evalA({ x: x1 }) - evalB({ x: x1 });
    const d2 = evalA({ x: x2 }) - evalB({ x: x2 });

    if (!isFinite(d1) || !isFinite(d2)) continue;
    if (d1 * d2 > 0) continue;

    // Bisection refinement
    let a = x1, b = x2;
    for (let j = 0; j < 50; j++) {
      const mid = (a + b) / 2;
      const dm = evalA({ x: mid }) - evalB({ x: mid });
      if (Math.abs(dm) < tolerance) { a = mid; break; }
      if (dm * (evalA({ x: a }) - evalB({ x: a })) < 0) b = mid;
      else a = mid;
    }

    const x = (a + b) / 2;
    const y = evalA({ x });
    if (isFinite(y)) {
      results.push({ x, y });
    }
  }

  return results;
}
