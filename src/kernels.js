/**
 * LAG KERNELS. Weights are precomputed in Python (parameters.kernel) and
 * arrive via params.js. Element m-1 is the share landing in month m.
 */
import { KERNELS, LAGS_MONTHS, P } from './params.js';

export function kernelFor(channel) {
  const k = KERNELS[channel];
  if (!k) throw new Error(`kernels: unknown channel '${channel}'. A typo here ` +
    `would silently drop an entire transmission channel.`);
  return k;
}

export function peakMonth(channel) {
  const m = LAGS_MONTHS[channel];
  if (m === undefined) throw new Error(`kernels: unknown channel '${channel}'`);
  return m;
}

/**
 * Sign-dependent scaling of a monetary shock.
 * Cuts are weaker than hikes (Tenreyro & Thwaites 2016) and weaker still in a
 * recession. This is doc 02's "pushing on a string vs pulling a rope",
 * upgraded from folklore to a coefficient by research pass 2.
 */
export function signAsymmetry(shock, inRecession) {
  if (shock > 0) return 1.0;                       // hike: pulling a rope
  const base = 1 / P.MONETARY_ASYMMETRY_RATIO.value;   // cut: ~0.67
  return inRecession ? base * 0.75 : base;
}
