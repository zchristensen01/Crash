/**
 * RULE ORDER
 * ==========
 * The list IS the causal order, and the order is a modelling decision, not a
 * convenience. Two examples of why:
 *
 *   - supply runs FIRST because potential output is the denominator of the
 *     output gap, and every other rule reads that gap.
 *   - sentiment runs LAST because confidence is mostly an echo of
 *     fundamentals (pass 2, question 3.2) — it reads the world rather than
 *     moving it.
 *
 * Adding a mechanism = write one function, add one line here.
 *
 * Every rule has the same shape:
 *     function updateThing(s, trace, ctx) -> void
 * mutating `s` and recording its terms in `trace`. No rule returns anything.
 * No rule may modify state without recording why.
 */

import { updatePotentialOutput } from './supply.js';
import { updateConsumption } from './consumption.js';
import { updateInvestment } from './investment.js';
import { aggregateDemand } from './aggregate.js';
import { updateEmployment } from './labour.js';
import { updateWages } from './wages.js';
import { updateMoneySupply, updateVelocity, updateMonetisation } from './money.js';
import { updateInflation, updateExpectations, updateCredibility } from './prices.js';
import { updateAssetPrices, updateLeverage, updateDefaults, updateCreditSpread, updateCreditGap, updateCrisisRisk } from './credit.js';
import { updateBondYield, updateAutoStabilisers, updateBudget } from './fiscal.js';
import { updateCrisisRecovery } from './crisis.js';
import { updateConfidence, updateApproval } from './sentiment.js';

export const RULES = [
  // --- supply side: the ceiling everything else is measured against ---
  updatePotentialOutput,      // [A4] Cobb-Douglas, capital, productivity

  // --- demand side: the centre of the model, and what never existed ---
  updateConsumption,          // [A1]
  updateInvestment,           // [A2]
  aggregateDemand,            // [A3] C+I+G+NX -> output gap

  // --- labour ---
  updateEmployment,           // asymmetric hiring/firing, Okun switch
  updateWages,                // wage PC with the kink, bunching at zero

  // --- money and prices ---
  updateMoneySupply,          // [A6]
  updateMonetisation,         // the gate — MUST run before updateInflation
  updateVelocity,
  updateInflation,            // Phillips, kappa gated by credibility
  updateExpectations,
  updateCredibility,

  // --- credit and assets: where crises come from ---
  updateAssetPrices,          // with the one-sided fire-sale term
  updateLeverage,
  updateDefaults,
  updateCreditSpread,
  updateCreditGap,            // the crash meter
  updateCrisisRisk,

  // --- government ---
  updateBondYield,            // foreign_share switch: Japan vs periphery
  updateAutoStabilisers,
  updateBudget,               // revenue, deficit, debt

  // --- crisis aftermath, if one is running ---
  updateCrisisRecovery,       // trough, path back, permanent scar

  // --- reads the world, doesn't move it ---
  updateConfidence,
  updateApproval,
];
