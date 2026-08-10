/**
 * CREDIT, ASSET PRICES, SPREADS  [research 1.1, 1.3]
 *
 * Where crises come from. The defining property: growth, inflation, jobs and
 * public mood all look FINE through the entire build-up. The credit gap is
 * the only gauge that warns you.
 */
import { P } from '../params.js';
import { clamp, annualRateToMonthlyLinear, annualToMonthlyFlow } from '../units.js';

/**
 *   g = -A*(real_rate - r*)/12                  discount channel
 *       + C*max(0, credit growth - nominal growth)   collateral
 *       - M*(log(asset) - log(fundamental))     mean reversion
 *       - F*max(0, leverage - leverage_max)     FIRE SALE, one-sided
 *
 * THE FIRE-SALE TERM IS ONE-SIDED AND THAT IS THE WHOLE POINT. Above the
 * leverage threshold, forced selling drives prices down, which forces more
 * selling. Below it the term is exactly zero. Booms build slowly over ~5
 * years on the rate and credit channels; the bust compounds and takes ~1. A
 * symmetric model cannot teach a bubble no matter how it is tuned.
 *
 * asset_prices is a REAL index, so it is stationary in steady state and
 * leverage stays put. C, M and F are all weak/judgement — TUNING DIALS, not
 * evidence. Keep them labelled.
 */
export function updateAssetPrices(s, trace) {
  const realRate = s.policy_rate - s.expected_inflation;
  const A = P.ASSET_PRICE_EQUITY_WEIGHT.value * P.ASSET_PRICE_RATE_SEMIELAST_EQUITY.value +
            (1 - P.ASSET_PRICE_EQUITY_WEIGHT.value) * P.ASSET_PRICE_RATE_SEMIELAST_HOUSING.value;

  const discount = annualToMonthlyFlow(-A * (realRate - s.neutral_real_rate));

  const excessCredit = Math.max(0, s.credit_growth_annual - (s.potential_growth + s.inflation));
  const collateral = P.ASSET_PRICE_CREDIT_CHANNEL.value * excessCredit;

  const reversion = -P.ASSET_PRICE_MEANREVERSION.value * 100 *
                    Math.log(s.asset_prices / s.asset_fundamental);

  const overLeveraged = Math.max(0, s.leverage - s.leverage_max);
  const fireSale = -P.ASSET_PRICE_FIRESALE.value * 100 * overLeveraged;

  const terms = {
    'cheap money chasing returns': discount,
    'borrowing against rising collateral': collateral,
    'gravity — prices pulled back to fundamentals': reversion,
    'FORCED SELLING (fire sale)': fireSale,
  };
  const gPct = Object.values(terms).reduce((a, b) => a + b, 0);
  trace.record('asset price change (%)', terms, gPct, {
    fire_sale_active: overLeveraged > 0,
    note: overLeveraged > 0
      ? 'forced sales are driving prices down, which forces more sales'
      : 'no forced selling — the fire-sale term is off',
  });

  // Bound the monthly move. Beyond the playable region the model is
  // deliberately divergent — a fixed nominal rate against rising inflation is
  // a Taylor-principle violation and SHOULD spiral. But it must spiral
  // legibly: unbounded, asset prices reach 4-digit index values and the
  // invariant failures become unreadable. In the real game the hyperinflation
  // ending fires long before this bites. Asymmetric because fire sales fall
  // faster than booms rise.
  const boundedG = clamp(gPct, -30, 12);
  s.asset_prices = Math.max(5, s.asset_prices * (1 + boundedG / 100));
  // The fundamental anchor is stationary because asset_prices is a REAL
  // (deflated) index. Growing it here makes asset/fundamental drift below 1
  // every tick, which quietly moves leverage, the wealth effect in
  // consumption and the credit impulse — three channels, one unit error.
}

export function updateLeverage(s, trace) {
  const before = s.leverage;
  s.leverage = (s.private_credit / s.credit_ss) /
               (s.asset_prices / s.asset_fundamental);
  trace.record('leverage', {
    'where it was': before,
    'debt vs the value of what backs it': s.leverage - before,
  }, s.leverage, { threshold: s.leverage_max });
}

/**
 *   default = d0 + DSR sensitivity*(DSR - DSR_ss) + unemployment sensitivity
 *   losses  = default * LOSS_GIVEN_DEFAULT * loans  -> eats bank capital
 *
 * Unemployment carries INDEPENDENT information about credit risk, robust to
 * the standard controls — it is not merely a proxy for output.
 */
export function updateDefaults(s, trace) {
  const dsr = s.private_credit * (s.policy_rate + s.credit_spread) / 100;
  const terms = {
    'baseline defaults': 1.0,
    'debt service burden': P.DEFAULT_RATE_DSR.value * (dsr - s.dsr_ss),
    'people losing jobs': P.DEFAULT_RATE_UNEMP.value * (s.unemployment - s.natural_unemployment),
  };
  const rawDefault = Object.values(terms).reduce((a, b) => a + b, 0);
  s.default_rate = Math.max(0.05, rawDefault);
  trace.record('default_rate', { ...terms,
    'floor (defaults never reach zero)': s.default_rate - rawDefault,
  }, s.default_rate);

  // Only losses ABOVE the normal-times baseline eat capital; ordinary losses
  // are covered by ordinary profits. Retained earnings then rebuild toward
  // the target ratio.
  s.loan_losses = s.default_rate / 100 * P.LOSS_GIVEN_DEFAULT.value * s.private_credit;
  const excessLosses = annualToMonthlyFlow(s.loan_losses - s.loan_losses_ss);
  s.bank_capital_ratio = clamp(
    s.bank_capital_ratio - excessLosses + 0.02 * (13 - s.bank_capital_ratio), 0, 30);
}

/**
 * THE DOOM LOOP needs no extra scripting:
 *   bank capital below the minimum -> banks cut lending -> asset prices fall
 *   -> spreads widen -> more defaults -> repeat.
 */
export function updateCreditSpread(s, trace) {
  const terms = {
    'normal cost of risk': s.credit_spread_ss,
    'how leveraged borrowers are': 0.8 * (s.leverage - s.leverage_ss),
    'collateral values': -0.5 * (s.asset_prices / s.asset_fundamental - 1),
    'unemployment': P.CREDIT_SPREAD_UNEMP.value * (s.unemployment - s.natural_unemployment),
    'loans going bad': 0.3 * (s.default_rate - 1.0),
    'how much capital banks hold': -0.15 * (s.bank_capital_ratio - 13),
  };
  const target = Object.values(terms).reduce((a, b) => a + b, 0);
  s.credit_spread = Math.max(0.2, s.credit_spread + 0.3 * (target - s.credit_spread));
  trace.record('credit_spread', terms, target, { actual_after_smoothing: s.credit_spread });
}

/**
 * THE CRASH METER.
 *   credit_gap = private credit/GDP - its own slow trend
 * One-sided HP filter (lambda 400,000, Borio & Lowe) approximated by an EMA
 * with a very long half-life.
 *
 *   < 3pp  normal   3pp warning (~76% of crises)   9pp BIS optimal (~66%)
 *   > 15pp historically extreme (Ireland, Spain pre-2008)
 *
 * STEADY-STATE REQUIREMENT: with credit growing at nominal GDP growth the gap
 * must be EXACTLY ZERO and stay there. The prototype's converged to 12pp with
 * no player input, crossing the danger line unaided and destroying the Bubble
 * scenario. This is the acceptance test for this function.
 */
export function updateCreditGap(s, trace) {
  const nominalGrowth = s.potential_growth + s.inflation;

  // Credit demand responds to the real rate and to confidence.
  const realRate = s.market_rate - s.expected_inflation;

  // LOOP GAIN MATTERS MORE THAN EITHER COEFFICIENT. Borrowing lifts asset
  // prices (ASSET_PRICE_CREDIT_CHANNEL) and richer collateral supports more
  // borrowing (the term below). Their product is the gain of the bubble loop,
  // and it has no balancing counterpart — that is the whole point of it. Set
  // too high, a bubble goes vertical in two years and nothing is teachable;
  // the design calls for one that builds over ~5 years and deflates in ~1.
  // Both coefficients are `weak`/`judgement` in parameters.py, so this is a
  // TUNING DIAL, not a finding.
  const collateralFeedback = 0.02 * (s.asset_prices / s.asset_fundamental - 1) * 100;
  const rawImpulse = -0.4 * (realRate - s.market_real_rate_ss) + collateralFeedback;

  // Credit demand is a flow that fades back toward trend rather than a level
  // that ratchets. Without this the impulse integrates and credit/GDP has no
  // finite equilibrium under any sustained policy.
  s.credit_impulse = 0.85 * (s.credit_impulse || 0) + 0.15 * rawImpulse;
  s.credit_growth_annual = nominalGrowth + clamp(s.credit_impulse, -12, 12);

  const beforeCredit = s.private_credit;
  // credit/GDP moves only by the DIFFERENCE between credit growth and nominal
  // GDP growth — this is what keeps the ratio stationary at the steady state.
  s.private_credit = Math.max(20, beforeCredit *
    (1 + annualRateToMonthlyLinear((s.credit_growth_annual - nominalGrowth) / 100)));

  const trendSpeed = annualRateToMonthlyLinear(0.20);
  s.credit_trend += trendSpeed * (s.private_credit - s.credit_trend);
  s.credit_to_gdp_gap = s.private_credit - s.credit_trend;

  trace.record('credit_to_gdp_gap', {
    'private borrowing (% of GDP)': s.private_credit,
    'its own slow trend': -s.credit_trend,
  }, s.credit_to_gdp_gap, {
    warning_at: 3, danger_at: P.CREDIT_GAP_CRISIS_THRESHOLD.value,
    note: 'the only gauge that sees a crash coming — the others look fine',
  });
}

/**
 * Annual probability from the credit gap, capped past ~2 SD because
 * extrapolating 3.5pp/SD further does more than Schularick & Taylor support.
 * Greenwood-Hanson-Shleifer: a joint credit AND asset boom preceded 64% of
 * crises, so the combination raises risk above either alone.
 */
export function updateCrisisRisk(s, trace) {
  const ONE_SD = 6.0;
  const excess = Math.max(0, s.credit_to_gdp_gap - 3.0);
  const sds = Math.min(excess / ONE_SD, 2.5);

  const base = P.CRISIS_PROB_PER_SD_CREDIT.value * sds;
  const assetBoom = s.asset_prices / s.asset_fundamental > 1.25;
  const rZone = assetBoom && s.credit_to_gdp_gap > 3 ? base * 0.6 : 0;

  s.crisis_prob = clamp(base + rZone, 0, 40);
  trace.record('crisis_prob', {
    'excess borrowing above trend': base,
    'credit boom AND asset boom together': rZone,
  }, s.crisis_prob, {
    note: assetBoom && s.credit_to_gdp_gap > 3
      ? 'the R-zone — credit-financed bubbles preceded 64% of crises'
      : 'annual probability, not a vibe',
  });
}
