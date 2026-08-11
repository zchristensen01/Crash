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
  // policy_rate_markets, not policy_rate: markets reprice in about a month
  // (rate_to_asset_prices), which is a genuinely different chain from the
  // three quarters the real economy takes. QE pushes the whole curve down and
  // works at the lower bound, which is what it is for.
  const realRate = s.policy_rate_markets - s.qe_rate_relief - s.expected_inflation;
  const A = P.ASSET_PRICE_EQUITY_WEIGHT.value * P.ASSET_PRICE_RATE_SEMIELAST_EQUITY.value +
            (1 - P.ASSET_PRICE_EQUITY_WEIGHT.value) * P.ASSET_PRICE_RATE_SEMIELAST_HOUSING.value;

  // THE RATE CHANNEL IS A LEVEL RESPONSE, NOT A GROWTH RATE [4th audit B2].
  //
  // A is a SEMI-ELASTICITY: 4.6% of asset price per pp of real rate, which is
  // what the cited literature estimates and what its own unit string says.
  // This used to be `annualToMonthlyFlow(-A * (realRate - neutral))`, i.e. the
  // level response applied as a PERSISTENT MONTHLY GROWTH RATE. The only thing
  // stopping it was mean reversion, so the equilibrium was wherever those two
  // balanced:
  //
  //     A/12 = MEANREVERSION * 100 * ln(A/F)
  //     ln(A/F) = A / (1200 * MEANREVERSION)
  //
  // and the OVERSHOOT FACTOR is that divided by the sourced A/100, which is
  // 1 / (12 * MEANREVERSION) — a number that does not contain A at all. The
  // model's asset-price response to interest rates was therefore set by
  // ASSET_PRICE_MEANREVERSION and not by the semi-elasticity that is supposed
  // to govern it: 4.59x too large at MEANREVERSION = 0.02, and it would have
  // been 9.2x at the bottom of that parameter's range.
  //
  // WHY THIS SHAPE AND NOT THE OTHER ONE. The audit offered two repairs: apply
  // it to the level, or keep the growth form and DERIVE MEANREVERSION so the
  // implied equilibrium equals the sourced semi-elasticity. The second is not
  // available, and the arithmetic says so rather than a preference:
  //
  //     MEANREVERSION = A / (1200 * ln(1 + A/100)) = 0.0852
  //     published range                            = [0.01, 0.05]
  //
  // 70% above the top of its own range — and because the requirement is
  // ~1/12 regardless of A, it stays outside at every point of A's range too
  // (0.0846 at A=3, 0.0858 at A=6). The growth form needs the level anchor to
  // undo in ONE MONTH what an ANNUAL semi-elasticity does in a year. That is
  // the unit error, stated exactly.
  //
  // So the rate sets a TARGET deviation from fundamental, and prices approach
  // it at MEANREVERSION — which is what that parameter was always described
  // as. The equilibrium level response now equals the sourced semi-elasticity
  // BY CONSTRUCTION rather than by coincidence, and both parameters do the job
  // their notes claim.
  const lnTarget = -(A / 100) * (realRate - s.neutral_real_rate);
  const lnDeviation = Math.log(s.asset_prices / s.asset_fundamental);
  const speed = P.ASSET_PRICE_MEANREVERSION.value * 100;
  // Split for the trace only: the two halves are where rates want prices to
  // sit, and the pull back toward what they are worth. They sum to
  // speed * (lnTarget - lnDeviation).
  const discount = speed * lnTarget;
  const reversion = -speed * lnDeviation;

  const excessCredit = Math.max(0, s.credit_growth_annual - (s.potential_growth + s.inflation));
  const collateral = P.ASSET_PRICE_CREDIT_CHANNEL.value * excessCredit;

  // FORCED SELLING IS DONE BY SOMEONE, AND THEY RUN OUT. The rate is
  // ASSET_PRICE_FIRESALE per point of excess leverage, but the TOTAL a
  // deleveraging episode can deliver is FIRESALE_TOTAL_CAPACITY, spent down
  // as the selling happens and refilled slowly once leverage is back under
  // the line. Without the budget the loop cannot terminate: prices are in
  // leverage's denominator, so falling prices raise leverage, which sells
  // harder (docs/07 M4 follow-on).
  const overLeveraged = Math.max(0, s.leverage - s.leverage_max);
  const wanted = P.ASSET_PRICE_FIRESALE.value * 100 * overLeveraged;
  const room = Math.max(0, P.FIRESALE_TOTAL_CAPACITY.value - s.fire_sale_spent);
  const fireSale = -Math.min(wanted, room);
  s.fire_sale_spent = overLeveraged > 0
    ? s.fire_sale_spent - fireSale
    : Math.max(0, s.fire_sale_spent -
        P.FIRESALE_TOTAL_CAPACITY.value / P.FIRESALE_REFILL_MONTHS.value);

  const terms = {
    'cheap money chasing returns': discount,
    'borrowing against rising collateral': collateral,
    'gravity — prices pulled back to fundamentals': reversion,
    'FORCED SELLING (fire sale)': fireSale,
  };
  const gPct = Object.values(terms).reduce((a, b) => a + b, 0);
  trace.record('asset price change (%)', terms, gPct, {
    fire_sale_active: fireSale < 0,
    selling_capacity_left: Math.max(0, P.FIRESALE_TOTAL_CAPACITY.value - s.fire_sale_spent),
    note: fireSale < 0
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

/**
 * Debt against the value of what backs it, normalised to 1.0 at whatever
 * state the scenario STARTED in, so leverage_max = 1.35 means "35% above
 * where you began" everywhere.
 *
 * Both anchors have to come from the same place. The numerator used the
 * canonical START while the denominator used the scenario's own asset level,
 * which put the bubble scenario at leverage 0.75 — further BELOW the
 * fire-sale gate than any other scenario, when it is the one built to reach
 * it. Forced selling never fired once in any of the six over a full term
 * (docs/07 M4).
 */
export function updateLeverage(s, trace) {
  const before = s.leverage;
  s.leverage = (s.private_credit / s.credit_ss) /
               (s.asset_prices / s.asset_prices_ss);
  trace.record('leverage', {
    'where it was': before,
    'debt vs the value of what backs it': s.leverage - before,
  }, s.leverage, {
    threshold: s.leverage_max,
    note: s.leverage > s.leverage_max
      ? 'past the line — forced selling has started'
      : 'inflated collateral flatters this all the way up',
  });
}

/**
 *   default = d0 + DSR sensitivity*(DSR - DSR_ss) + unemployment sensitivity
 *   losses  = default * LOSS_GIVEN_DEFAULT * loans  -> eats bank capital
 *
 * Unemployment carries INDEPENDENT information about credit risk, robust to
 * the standard controls — it is not merely a proxy for output.
 */
export function updateDefaults(s, trace) {
  // lint-allow-dial: KNOWN DEFECT, RECORDED NOT FIXED (docs/12 M2 follow-on). This
  // is the same error the government's interest bill had until this pass: the whole
  // PRIVATE debt stock reprices the month the dial moves, i.e. every mortgage and
  // every corporate loan is floating-rate with no lag. Fixing it properly needs a
  // private-debt maturity structure to sit alongside DEBT_AVERAGE_MATURITY_YEARS,
  // which is a modelling change with its own parameter and source, not a keystroke.
  // Surfaced by a todo test in test/validation.test.js rather than half-fixed here.
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
    s.bank_capital_ratio - excessLosses +
      0.02 * (s.bank_capital_ss - s.bank_capital_ratio), 0, 30);

  // How far below the floor banks are defending. Positive means they are
  // cutting lending to get back above it, which is the quantity leg of the
  // doom loop — see updateCreditGap. BANK_CAPITAL_DELEVER_TRIGGER is 0,
  // meaning deleveraging starts exactly AT the minimum, not below it.
  s.bank_capital_shortfall = Math.max(0,
    P.BANK_CAPITAL_MINIMUM.value + P.BANK_CAPITAL_DELEVER_TRIGGER.value -
    s.bank_capital_ratio);
}

/**
 * THE DOOM LOOP, and it needed more than the price channel:
 *   bank capital below the minimum -> banks cut LENDING -> asset prices fall
 *   -> spreads widen -> more defaults -> repeat.
 *
 * The quantity leg is in updateCreditGap (forced deleveraging). This is the
 * price leg. BANK_CAPITAL_TO_LOAN_RATE is 13bp on loan rates per 1pp of
 * capital, sourced to BIS 2010; the code used an invented 0.15 in its place
 * and left the parameter unread (docs/07 M5).
 */
export function updateCreditSpread(s, trace) {
  const terms = {
    'normal cost of risk': s.credit_spread_ss,
    'how leveraged borrowers are': 0.8 * (s.leverage - s.leverage_ss),
    'collateral values': -0.5 * (s.asset_prices / s.asset_fundamental - 1),
    'unemployment': P.CREDIT_SPREAD_UNEMP.value * (s.unemployment - s.natural_unemployment),
    'loans going bad': 0.3 * (s.default_rate - 1.0),
    'how much capital banks hold':
      -(P.BANK_CAPITAL_TO_LOAN_RATE.value / 100) * (s.bank_capital_ratio - s.bank_capital_ss),
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
  s.credit_impulse = 0.85 * s.credit_impulse + 0.15 * rawImpulse;

  // FORCED DELEVERAGING — the quantity leg of the doom loop, and the piece
  // that was missing. A bank below its capital floor cuts lending rather than
  // raising equity in a crisis, which drops asset prices, which raises
  // leverage, which forces more selling. Supply, not demand: it does not fade
  // and it does not care what borrowers want.
  const forcedDelever = -P.BANK_DELEVER_STRENGTH.value * s.bank_capital_shortfall;
  s.credit_growth_annual = nominalGrowth +
    clamp(s.credit_impulse + forcedDelever, -25, 12);

  // WRITE-OFFS. Debt that defaults leaves the credit stock, and that is what
  // finally ENDS a deleveraging spiral: the fire sale drives prices down,
  // which raises leverage, which drives more selling, and nothing in the loop
  // stops until the debt itself is gone. Without this the bust had no exit —
  // asset prices ran to their floor with leverage at 36 and stayed there.
  //
  // Only defaults ABOVE the normal-times rate are netted off, exactly as
  // updateDefaults only charges losses above the baseline to bank capital.
  // Ordinary churn is already inside credit_growth_annual.
  s.write_offs = annualRateToMonthlyLinear((s.default_rate - 1.0) / 100) *
                 s.private_credit;

  const beforeCredit = s.private_credit;
  // credit/GDP moves only by the DIFFERENCE between credit growth and nominal
  // GDP growth — this is what keeps the ratio stationary at the steady state.
  s.private_credit = Math.max(20, beforeCredit *
    (1 + annualRateToMonthlyLinear((s.credit_growth_annual - nominalGrowth) / 100))
    - s.write_offs);

  const trendSpeed = annualRateToMonthlyLinear(0.20);
  s.credit_trend += trendSpeed * (s.private_credit - s.credit_trend);
  s.credit_to_gdp_gap = s.private_credit - s.credit_trend;

  trace.record('credit_to_gdp_gap', {
    'private borrowing (% of GDP)': s.private_credit,
    'its own slow trend': -s.credit_trend,
  }, s.credit_to_gdp_gap, {
    warning_at: 3, danger_at: P.CREDIT_GAP_CRISIS_THRESHOLD.value,
    credit_growth: s.credit_growth_annual,
    banks_forced_to_delever: forcedDelever < 0 ? -forcedDelever : 0,
    note: forcedDelever < 0
      ? 'banks are below their capital floor and cutting lending to get back'
      : 'the only gauge that sees a crash coming — the others look fine',
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
