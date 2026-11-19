export interface ProjectionPoint {
  year: number;
  invested: number;
  value: number;
}

/** Monthly-equivalent rate for an annual compounded return. */
export const monthlyRate = (annualPct: number) => Math.pow(1 + annualPct / 100, 1 / 12) - 1;

/**
 * Future value of a monthly SIP (investment at start of each month) with an optional
 * annual step-up and an optional lump sum invested today.
 */
export function projectSip(opts: {
  monthly: number;
  annualReturn: number;
  years: number;
  stepUp?: number;
  lumpSum?: number;
}): { points: ProjectionPoint[]; invested: number; value: number; gains: number } {
  const r = monthlyRate(opts.annualReturn);
  const years = Math.max(0, Math.round(opts.years));
  let value = opts.lumpSum ?? 0;
  let invested = opts.lumpSum ?? 0;
  let contribution = Math.max(0, opts.monthly);
  const points: ProjectionPoint[] = [{ year: 0, invested, value }];
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value = (value + contribution) * (1 + r);
      invested += contribution;
    }
    points.push({ year: y, invested: Math.round(invested), value: Math.round(value) });
    contribution *= 1 + (opts.stepUp ?? 0) / 100;
  }
  return { points, invested: Math.round(invested), value: Math.round(value), gains: Math.round(value - invested) };
}

/** Monthly SIP needed (flat, start-of-month) to reach a target in `years`. */
export function requiredSip(target: number, annualReturn: number, years: number, lumpSum = 0) {
  const n = Math.round(years * 12);
  if (n <= 0) return Math.max(0, target - lumpSum);
  const r = monthlyRate(annualReturn);
  const fvLump = lumpSum * Math.pow(1 + r, n);
  const gap = target - fvLump;
  if (gap <= 0) return 0;
  if (r === 0) return gap / n;
  return (gap * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));
}

export const futureValue = (pv: number, annualPct: number, years: number) => pv * Math.pow(1 + annualPct / 100, years);
