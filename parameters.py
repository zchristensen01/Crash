"""
PARAMETERS
==========
Every number the model needs, in one place. No logic lives here — this file is
pure data (plus one validator and one kernel helper, both of which only read).
Import it and read `.value` off any parameter.

    from parameters import OKUN_BETA
    unemployment_change = -OKUN_BETA.value * output_gap

Each parameter carries its plausible range, how good the evidence is, and where
it came from. When confidence is "weak" or "contested", the central value is a
coding convenience, not a fact — show the range to the player instead of
pretending you know.

CONFIDENCE SCALE
  strong     — well identified, many studies agree, safe to code as given
  moderate   — reasonable central estimate, real spread around it
  weak       — poorly identified, treat the range as the finding
  contested  — credible economists disagree about the SIGN or the mechanism
  judgement  — no usable estimate exists; this is a guess, clearly labelled

UNITS ARE ALWAYS STATED. If a parameter has no unit comment, that's a bug.

--------------------------------------------------------------------------
RESEARCH PASS 2 — folded in 10 Aug 2026. See docs/04-research-brief.md for
the questions and docs/05-handoff.md for what changed. Four corrections were
applied to the report on the way in; each is marked [PASS2 FIX] at its site:

  1. Two parameters had `low` and `high` inverted (CRISIS_OUTPUT_TROUGH,
     AUTOSTAB_BENEFIT_ELASTICITY). `validate()` at the bottom of this file now
     catches that class of error at import time.
  2. BOND_YIELD_DEBT_SLOPE was declared as 0.03 with the unit "bp", while its
     equation divided it by 100 again. Same estimate as the old DEBT_TO_YIELD
     (3bp), stated twice in different units. Merged into one parameter in pp,
     with all four citations.
  3. The gamma lag kernels were parameterised theta = peak/k, which puts the
     kernel's MODE at roughly two-thirds of the documented peak — every lag
     would have landed about a third early. Doc 02 means the peak of the
     impulse response, so theta is now DERIVED as peak/(k-1) and the modal
     month equals LAGS_MONTHS by construction. See kernel() below.
  4. CLASSICAL_WAGE_CORRECTION_STRENGTH is deleted, not merely deprecated —
     it double-counted the DNWR friction now carried by WAGE_RIGIDITY_SHARE.
--------------------------------------------------------------------------
"""

from dataclasses import dataclass
from math import lgamma, exp, log


@dataclass(frozen=True)
class P:
    """One parameter: central value, plausible range, provenance."""
    value: float
    low: float
    high: float
    unit: str
    confidence: str
    source: str
    note: str = ""


# =====================================================================
# 1. STARTING STATE — mid-size developed economy
#
# [PASS2] This vector is no longer a set of plausible-looking readings. It is
# the internally consistent steady state derived in research question 1.7 and
# checked against the accounting identities at the bottom of section 2. Every
# rule fed this vector must return this vector. If it doesn't, the rule is
# wrong — that is what tests/steady-state asserts.
#
# Changed from the pre-pass-2 values: potential growth 2.0 -> 1.5,
# unemployment 4.5 -> 5.0, debt 75 -> 100, deficit 2.5 -> 3.5, yield 3.5 ->
# 3.25, tax 25.0 -> 24.75 (solved, see IDENTITY CHECK), plus six new entries.
# =====================================================================

START = {
    # Real economy
    "gdp_growth_annual":      1.5,    # %
    "potential_growth":       1.5,    # % per year
    "output_gap":             0.0,    # % of potential
    "capital_output_ratio":   3.0,    # K/Y, annual
    "investment_share":      22.5,    # % of GDP — solved, holds K/Y constant
    "labour_share":           0.62,   # fraction of income

    # Labour
    "unemployment":           5.0,    # %
    "natural_unemployment":   5.0,    # %
    "participation":         63.0,    # %
    "wage_growth":            3.5,    # % per year = target 2.0 + productivity 1.5
    "hiring_momentum":        0.0,    # state, see HIRING_MOMENTUM

    # Prices
    "inflation":              2.0,    # % per year
    "expected_inflation":     2.0,    # % per year
    "credibility":            0.85,   # 0-1, see section 8
    "velocity":               1.0,    # index, see section 7

    # Money and credit
    "policy_rate":            2.5,    # % = r* + target
    "neutral_real_rate":      0.5,    # % (r*)
    "term_premium":           0.75,   # pp
    "yield_10y":              3.25,   # % = policy rate + term premium
    "credit_spread":          1.5,    # pp over policy rate
    "private_credit_gdp":   150.0,    # % of GDP
    "credit_to_gdp_gap":      0.0,    # pp above trend — THE crisis variable
    "asset_prices":         100.0,    # index, combined equity + housing
    "leverage":               1.0,    # private_debt / asset_prices

    # Government
    "tax_rate":              24.75,   # % of GDP — solved, see IDENTITY CHECK
    "govt_spending":         22.0,    # % of GDP
    "transfers":              3.0,    # % of GDP
    "govt_debt":            100.0,    # % of GDP
    "deficit":                3.5,    # % of GDP — the debt-stabilising level
    "foreign_share":          0.30,   # [PASS2 NEW] fraction of govt debt held
                                      # abroad. Required by the yield equation
                                      # (section 5). This is the Japan-vs-
                                      # periphery switch.

    # External — v1 IS A CLOSED ECONOMY. See docs/05-handoff.md decision A5.
    "current_account":        0.0,    # % of GDP, pinned
    "fx_change":              0.0,    # %, pinned to zero in v1

    # Supply shocks
    "supply_shock":           0.0,    # [PASS2 NEW] pp of cost-push inflation.
                                      # Required by the 1970s and 2021 scenarios.

    # Financial
    "bank_capital_ratio":    13.0,    # CET1 %

    # Sentiment — a game mechanic with a thin empirical basis. See section 10.
    "consumer_confidence":   60.0,
    "approval":              65.0,
}


# =====================================================================
# 2. STEADY STATE — the long-run anchors, and the arithmetic that proves
#    they hang together. Research question 1.7.
# =====================================================================

SS_POTENTIAL_GROWTH = P(
    1.5, 1.0, 2.0, "% per year real potential growth",
    "moderate", "OECD Economic Outlook 2024-25 (growth accounting)",
    "Median-AE potential per-capita growth fell ~0.8pp between 2002-08 and 2024.")

SS_R_STAR = P(
    0.5, -0.7, 1.6, "% real natural rate of interest",
    "moderate", "Holston-Laubach-Williams FRBNY Staff Report 1063 (2023); "
    "Williams, 'R-Star: A Global Perspective', ECB Sintra 2024",
    "Semi-structural Kalman filter. Williams puts euro-area r* at 0.5% in "
    "2023; Bank of Finland's modified HLW puts it clearly negative (-0.7% in "
    "2024Q2); UK/Canada HLW ~1.55-1.62%. THE DISPERSION IS MODEL DISAGREEMENT, "
    "not measurement noise. Do not average it away — show the range.")

SS_NAIRU = P(
    5.0, 4.5, 6.0, "% natural unemployment",
    "moderate", "OECD Economic Outlook; Rusticelli, Turner & Cavalleri OECD WP1231",
    "Phillips-curve Kalman filter. OECD-area unemployment held ~4.9% through "
    "2024. Badly imprecise in real time — that imprecision is itself a lesson.")

SS_INFLATION_TARGET = P(
    2.0, 2.0, 2.0, "% per year", "strong", "Central bank mandates", "Definitional.")

SS_POLICY_RATE = P(
    2.5, 1.5, 3.5, "% nominal policy rate", "moderate", "Fisher identity",
    "= SS_R_STAR + SS_INFLATION_TARGET.")

SS_TERM_PREMIUM = P(
    0.75, 0.0, 1.4, "pp, 10y term premium",
    "moderate", "Kim-Wright FEDS 2005-33; Adrian, Crump & Moench (NY Fed)",
    "Kim-Wright THREEFYTP10 ran ~0.05pp before Sept 2024 then ~0.8pp by Jan "
    "2025, the highest since 2011. ACM 65-year median ~1.41pp.")

SS_YIELD_10Y = P(
    3.25, 2.0, 4.5, "% 10y nominal yield", "moderate",
    "= SS_POLICY_RATE + SS_TERM_PREMIUM", "Expectations hypothesis in steady state.")

SS_CREDIT_GDP = P(
    150.0, 130.0, 170.0, "% private non-financial credit / GDP",
    "strong", "BIS total credit database 2025Q3 (US 140.4%, UK 133.0%); "
    "IMF Global Debt Monitor Dec 2024",
    "Households ~55-65%, non-financial corporates ~90%.")

SS_DEBT_GDP = P(
    100.0, 88.0, 110.0, "% general government gross debt / GDP",
    "strong", "IMF Fiscal Monitor Oct 2024; IMF Global Debt Monitor 2025",
    "AE government borrowing close to 110% of GDP; euro area ~88-90%, UK ~100%.")

SS_LABOUR_SHARE = P(
    0.62, 0.50, 0.63, "labour share of income",
    "moderate", "IMF WP/17/169; OECD 2018",
    "Broad national-accounts measures ~60-63%. Capital share alpha ~0.38 on "
    "the 0.62 measure. Feeds the Cobb-Douglas exponent in supply.")

SS_K_OVER_Y = P(
    3.0, 2.5, 3.4, "capital / output ratio, annual",
    "moderate", "OECD Long-Term Model (targets 3.4); Mankiw (2.5)",
    "Perpetual inventory. Sets the investment share needed to hold K/Y fixed.")

SS_DEPRECIATION = P(
    0.06, 0.04, 0.10, "annual depreciation rate, delta",
    "moderate", "Solow calibration 0.04-0.05; DSGE/RBC ~0.025/qtr (~10%/yr)",
    "Aggregate capital ~6-7%/yr. Supersedes the old DEPRECIATION_RATE=0.065, "
    "which is the same estimate to within its own range.")

SS_ELB = P(
    -0.75, -1.0, -0.5, "% effective lower bound on the policy rate",
    "moderate", "SNB policy rate -0.75% 2015-2022 (deepest sustained); "
    "ECB and Riksbank negative-rate experience 2014-2022",
    "[PASS2] CONFIRMED — was an unsourced bare constant. Reversal-rate logic "
    "bounds it near -0.75; the SNB is the deepest sustained real-world case.")

# --------------------------------------------------------------------
# IDENTITY CHECK — the arithmetic behind START. tests/steady-state
# re-derives all of this; if you change a number above, that test fails.
#
#   nominal growth  g = SS_POTENTIAL_GROWTH + SS_INFLATION_TARGET
#                     = 1.5 + 2.0 = 3.5 %/yr
#
#   (a) DEBT STABLE when deficit = debt x nominal growth
#         100.0 x 0.035 = 3.50 % of GDP           -> START["deficit"] = 3.5
#       and that deficit must be what the budget actually produces:
#         interest  = debt x yield = 100.0 x 0.0325       = 3.25 % of GDP
#         outlays   = spending + transfers + interest
#                   = 22.0 + 3.0 + 3.25                   = 28.25
#         revenue   = outlays - deficit = 28.25 - 3.50    = 24.75
#         -> START["tax_rate"] = 24.75, SOLVED not chosen. This is the only
#            value that holds debt at 100% of GDP. It was 25.0, which drifted.
#
#   (b) CREDIT/GDP STABLE when credit grows at nominal GDP growth
#         credit must grow 3.5 %/yr to hold 150% of GDP  -> credit gap 0.0
#
#   (c) CAPITAL STABLE (growing economy) when I/Y = (delta + g_real) x K/Y
#         (0.06 + 0.015) x 3.0 = 0.225                   -> 22.5 % of GDP
#       NB the textbook I = delta x K gives 18%; that is the ZERO-GROWTH case
#       and using it here would shrink K/Y every tick.
#
#   (d) RATES   policy = r* + target = 0.5 + 2.0         = 2.50 %
#               yield  = policy + term premium           = 3.25 %
#               real 10y = 3.25 - 2.0 = 1.25% = r* + term premium. Consistent.
#
#   (e) LABOUR  unemployment = natural = 5.0, hiring momentum 0, output gap 0
#               wage growth = target inflation + productivity growth
#                           = 2.0 + 1.5 = 3.5                          [CHECK]
#       [RESOLVED — was open pending A4.] With K/Y constant, output per worker
#       grows at potential growth, so labour productivity growth is 1.5%/yr
#       and steady-state wage growth is 3.5%, not the 3.0% previously carried.
#       TFP growth is the residual after capital deepening:
#           g_A = g * (1 - alpha) = 1.5 * 0.62 = 0.93 %/yr
#       Unit labour cost growth is then 3.5 - 1.5 = 2.0 = target, so the wage
#       block adds ZERO price pressure at rest, which is what lets the
#       Phillips curve sit still. See src/rules/supply.js.
# --------------------------------------------------------------------


# =====================================================================
# 3. BEHAVIOURAL EQUATIONS
# The relationships that do most of the work.
# =====================================================================

# --- Okun's law:  (u - u*) = -BETA * output_gap ---
OKUN_BETA = P(
    0.45, 0.15, 0.55, "pp unemployment per 1% output gap",
    "contested", "Ball, Leigh & Loungani 2012; post-Covid euro-area labour hoarding",
    "[PASS2] Reclassified from strong to contested, and the range widened "
    "down. Beta is STATE-DEPENDENT: ~0.45 US normal, ~0.15 Japan structurally, "
    "~0.23 euro area post-Covid under labour hoarding. Code the switch, not "
    "the constant — see OKUN_LABOUR_HOARDING.")

OKUN_LABOUR_HOARDING = P(
    0.20, 0.15, 0.23, "pp unemployment per 1% output gap, hoarding regime",
    "moderate", "post-Covid euro-area estimates; Japan structural",
    "[PASS2 NEW] Switch condition: a sharp output fall combined with "
    "short-time-work or job-retention policy support. Firms hold labour "
    "through the trough and unemployment barely moves. [AUDIT docs/07 L5, "
    "L6] Coded as a HARD switch at output_gap < -2, which did two bad "
    "things: stimulus that carried the gap across -2 doubled beta and RAISED "
    "unemployment, and an equal-sized boom moved employment three times "
    "further than a slump, inverting 'firms fire fast and hire slowly'. Now "
    "a smooth ramp in |output_gap| over OKUN_HOARDING_GAP, symmetric, so the "
    "asymmetry lives in HIRING_SPEED vs FIRING_SPEED where the evidence is.")

OKUN_HOARDING_GAP = P(
    4.0, 2.0, 6.0, "|output gap| at which beta reaches the full hoarding value",
    "judgement", "Shape assumption, not an estimate",
    "The hoarding regime is a description of a state, not a threshold, and "
    "nothing in the literature dates its onset to a specific gap. Symmetric "
    "in the gap: firms that hold staff through a trough also do not hire "
    "hard in the recovery, and at very low unemployment the labour-supply "
    "constraint flattens Okun again. TUNING DIAL.")

# --- Phillips curve:  pi = E[pi] + KAPPA * output_gap + shocks ---
# THE most important parameter in the model. It is not a constant.
PHILLIPS_KAPPA_ANCHORED = P(
    0.05, 0.03, 0.08, "pp inflation per 1% output gap",
    "moderate", "Cleveland Fed time-varying estimates; Fed FEDS 2024",
    "Reduced-form slope fell from ~0.12 (1970s) to ~0.04 (recent), expressed "
    "here per OUTPUT gap and therefore positive. This is why 'low "
    "unemployment causes inflation' stopped working.")

PHILLIPS_KAPPA_UNANCHORED = P(
    0.20, 0.15, 0.25, "pp inflation per 1% output gap",
    "moderate", "Hazell et al.; IMF WP 2023/100",
    "Once expectations unanchor the slope steepens sharply. KAPPA is a "
    "function of CREDIBILITY, not a constant. This single switch is the "
    "difference between a toy and a model that teaches something.")

MAX_CAPACITY_OVERHEAT = P(
    4.0, 2.0, 6.0, "% above potential that can physically be produced",
    "judgement", "Peak-to-trough capacity utilisation swings of 4-6pp in "
    "advanced economies (Fed G.17, euro-area survey series)",
    "The hard ceiling in aggregate.js: demand above this cannot become "
    "output and flows entirely into prices. [AUDIT docs/07 M2] It was a bare "
    "4.0 in the rule, and it is the model's single sharpest nonlinearity — "
    "the audit brief read its effect as a zero lower bound on the rate dial, "
    "because low rates and a hot economy coincide. Named so it is visible.")

# --- Taylor rule --- kept as an AUTOPILOT / comparison opponent only.
# The player is the central bank; this is what a rule-follower would have done.
TAYLOR_INFLATION = P(0.5, 0.5, 1.0, "coefficient", "strong", "Taylor 1993",
                     "Total response to inflation is 1+A = 1.5. Must exceed "
                     "1.0 or inflation is unstable (the Taylor principle). "
                     "BUT THE PRINCIPLE IS ABOUT THE RATE THE ECONOMY FEELS, "
                     "NOT THE ONE ON THE DIAL, and the two are not the same "
                     "number. Measured over months 3-12 of `stagflation` under "
                     "the rule, d(felt rate)/d(inflation) was 0.37 before the "
                     "4th audit's A1 split: inflation rose 9.92pp while the "
                     "transmitted rate rose 3.67pp. The dial satisfied the "
                     "principle and TRANSMISSION VIOLATED IT, which is why the "
                     "model bifurcated — a rule can be above unity on paper and "
                     "below it in effect, and only the effect stabilises "
                     "anything. IT IS NOW 1.96 over the same window, and the "
                     "real rate felt at month 12 went from -14.50% to -1.77%. "
                     "(2.3 recorded 1.80 and docs/02 recorded 1.83; 3.1's asset-"
                     "units fix moved both to 1.96 and neither was updated. "
                     "Re-measured in Phase 5 verification.) "
                     "DO NOT RAISE THIS COEFFICIENT TO FIX A TRANSMISSION "
                     "PROBLEM. The reason is NOT that the coefficient is "
                     "powerless — that claim was measured while transmission "
                     "was still broken (177.62% at m48 against 242.34%, i.e. "
                     "hyperinflating either way) and it no longer holds. "
                     "Re-measured after Phases 2-4, raising this to 1.0 — the "
                     "TOP of the sourced range — takes `stagflation` under the "
                     "rule from 7.12% to 3.24% at m48 and 3.15% to 1.42% at "
                     "m96. It now has plenty of traction. The reason to leave "
                     "it at 0.5 is that the defect WAS transmission, fixing "
                     "transmission fixed it, and moving a sourced coefficient "
                     "to cover a structural error is rule 4. "
                     "test/transmission.test.js measures the transmitted "
                     "response on every run.")
TAYLOR_OUTPUT    = P(0.5, 0.25, 1.0, "coefficient", "strong", "Taylor 1993")
TAYLOR_SMOOTHING = P(0.85, 0.75, 0.90, "AR(1) on the rate", "strong",
                     "standard central bank practice",
                     "Central banks move in 25bp steps, not jumps.")

# --- Consumption (question A1) ---
MPC_BASE = P(
    0.35, 0.22, 0.45, "fraction of transitory income spent per quarter",
    "strong", "Sokolova 2023 meta-analysis, 1244 estimates from 40 studies",
    "Mean quarterly MPC. CARES: 40-46% spent within two weeks, 10-14% used "
    "to repay debt.")

MPC_UNEMPLOYMENT_SLOPE = P(
    0.045, 0.035, 0.055, "MPC increase per 1pp unemployment",
    "strong", "Sokolova 2023",
    "MPC ~0.22 at 4% unemployment, ~0.40 at 8%. Poor and constrained "
    "households spend more of what you give them — which is why stimulus "
    "works better in a slump.")

WEALTH_EFFECT = P(
    0.04, 0.03, 0.05, "cents of consumption per $1 of housing wealth",
    "moderate", "standard range", "Judgement on the exact value.")

SUPPLY_SHOCK_INCOME_LOSS = P(
    1.0, 0.7, 1.2, "pp of real disposable income lost per pp of cost-push inflation",
    "strong", "Accounting: an unmatched price rise is a real income cut, "
    "one-for-one. Terms-of-trade losses from the 1973 and 1979 oil shocks ran "
    "2-4% of GDP in net-importing advanced economies",
    "[AUDIT docs/07 L4 follow-on] docs/02 Self-correction 1 — the PRICE BRAKE: "
    "'demand > capacity -> prices up -> real incomes down -> demand down'. It "
    "was not in the model at all. supply_shock entered the Phillips curve and "
    "nothing else, so an oil shock was purely inflationary and the stagflation "
    "scenario boomed straight out of its own regime: unemployment fell from "
    "8% to 4.5% in six months while inflation climbed. A cost-push shock "
    "raises prices without raising anybody's income, which is a real income "
    "cut by definition, and it is what makes a supply shock STAGflationary "
    "rather than merely inflationary. Below 1.0 because wages recover part of "
    "it through WAGE_PC_EXPECTED_INFL; not far below, because that recovery "
    "is slow and partial.")

ASSET_WEALTH_TO_GDP = P(
    1.0, 0.5, 5.0, "years of output of paper wealth per 100 index points of asset_prices",
    "judgement", "Scale convention for the model's asset index",
    "[AUDIT docs/07 hygiene] WEALTH_EFFECT is cents per DOLLAR OF WEALTH and "
    "consumption.js applied it straight to a difference in INDEX POINTS, so "
    "the unit conversion was missing and the magnitude was right only by "
    "coincidence. This supplies it explicitly. 1.0 means one index point of "
    "overvaluation is 1% of a year's output of paper wealth — about a fifth "
    "of true household net worth in an advanced economy, standing in for the "
    "much lower propensity to spend UNREALISED paper gains than the realised "
    "housing wealth WEALTH_EFFECT is estimated on. The high end of the range "
    "is the literal net-worth reading; taking it would multiply the wealth "
    "channel by five. Kept at 1.0 so this fix changes units, not behaviour.")

HAND_TO_MOUTH_SHARE = P(
    0.30, 0.20, 0.40, "fraction of households with no buffer",
    "moderate", "HANK literature")

# --- Investment (question A2) ---
INVESTMENT_RATE_ELASTICITY = P(
    1.5, 1.0, 2.0, "% change in investment level per 1pp policy rate",
    "moderate", "Bank of England transmission mechanism",
    "Peaks 4-6 quarters out. Most rate-sensitive demand component. THE PEAK "
    "IS NOT AN INPUT: it is produced by RATE_PASSTHROUGH_TO_BORROWERS "
    "convolved with INVESTMENT_ADJUSTMENT_SPEED, and measured against "
    "LAGS_MONTHS['rate_to_investment']. This elasticity is the LONG-RUN "
    "response; the partial adjustment in updateInvestment delivers it in "
    "full, only later.")

# --- The two halves of the monetary transmission lag (4th audit, A1) ---
#
# THE DEFECT THIS SPLITS. dials.js used to schedule the transmitted policy
# rate itself on the `rate_to_investment` kernel — an estimated impulse
# response OF INVESTMENT (a quantity) TO A MONETARY SHOCK (a price). The rate
# arrived at the economy with a 14.74-month mean lag, and updateInvestment
# then applied INVESTMENT_RATE_ELASTICITY to that already-lagged rate. The
# reduced form was doing duty as a structural input and was then multiplied by
# the structural coefficient it already contained — rule 4, in the busiest
# channel in the model.
#
# The published IRF is the CONVOLUTION of two things the literature measures
# separately, so the model now carries them separately:
#
#   (1) how fast a policy move reaches the rate borrowers actually pay
#       — a PRICE reaching a price. Fast.
#   (2) how fast capital spending responds once the price has moved
#       — a QUANTITY responding to a price. Slow.
#
# The 9-month peak becomes a TARGET TO REPRODUCE rather than a number to
# impose, which is what rule 4 requires. test/transmission.test.js measures it.
RATE_PASSTHROUGH_TO_BORROWERS = P(
    3.0, 1.0, 6.0, "months to peak, policy rate -> the rate borrowers pay",
    "moderate", "ECB retail bank interest rate pass-through (MIR-based "
    "studies); BIS work on bank lending-rate pass-through",
    "Pass-through to NEW lending rates is fast and largely complete within a "
    "quarter — banks reprice new business off market rates within weeks. The "
    "STOCK of existing loans reprices far more slowly, which is a SEPARATE "
    "question and a separate parameter (see TEST-RESULTS.md #11 on private "
    "debt maturity); this is the marginal borrower deciding whether to invest, "
    "so it is the new-business rate that matters. The range spans the "
    "corporate/mortgage and fixed/floating spread across advanced economies.")

INVESTMENT_ADJUSTMENT_SPEED = P(
    0.15, 0.08, 0.30, "monthly fraction of the desired investment gap closed",
    "moderate", "Kydland & Prescott 1982 (time-to-build, ~4 quarters for US "
    "manufacturing); Christiano, Eichenbaum & Evans 2005 (investment "
    "adjustment costs)",
    "Capital spending is planned, ordered and built, so a firm that decides "
    "today to invest less does not spend less today. Geometric partial "
    "adjustment: mean lag is (1-speed)/speed, so 0.15 is about 5.7 months and "
    "the range spans roughly 2.3 to 11.5. IT APPLIES TO THE WHOLE INVESTMENT "
    "LEVEL, not only to the rate term — adjustment costs are a property of "
    "capital spending and do not care why the firm changed its mind.")

# --- Wage setting (question 1.6) ---
WAGE_PC_EXPECTED_INFL = P(
    1.0, 0.8, 1.0, "pass-through of expected inflation to wage growth",
    "moderate", "Wage Phillips curve consensus; Alvarez et al. IMF WP22/221",
    "[PASS2 NEW] Near-unit long-run pass-through. Advanced economies.")

WAGE_PC_SLOPE = P(
    0.3, 0.1, 1.2, "pp wage growth per 1pp fall in the unemployment gap",
    "contested", "Fed FEDS 2024-043 'The Slope of the Phillips Curve'; "
    "Fed FEDS Notes 2024 'Nonlinear Phillips Curves'; Chicago Fed 2023",
    "[PASS2 NEW] Identification: regional/state panels with time fixed "
    "effects. NONLINEAR — roughly flat in a normal labour market, steepens "
    "below ~5% unemployment. Code as a kink at WAGE_PC_KINK, not a slope.")

WAGE_PC_KINK = P(
    5.0, 4.0, 5.5, "% unemployment below which the wage slope steepens",
    "moderate", "Fed FEDS Notes 2024 'Nonlinear Phillips Curves'",
    "[PASS2 NEW] The nonlinearity is the finding. Above the kink, running the "
    "economy hot is nearly free; below it, wage pressure arrives quickly.")

WAGE_PC_PRODUCTIVITY = P(
    1.0, 0.5, 1.0, "pass-through of trend productivity growth to wages",
    "moderate", "Blanchard-Katz wage setting",
    "Long-run wages track productivity roughly one for one.")

WAGE_RIGIDITY_SHARE = P(
    0.14, 0.08, 0.20, "fraction of workers whose wage change bunches at zero",
    "strong", "US ECI and CPS; FRBSF 2013; Fed FEDS 2016; Card-Hyslop; ECB WDN",
    "[PASS2] Reinterpreted. This is now the ONLY representation of downward "
    "nominal wage rigidity: a share f of workers cannot take a nominal cut in "
    "a given period, the rest adjust freely. Model DNWR as a SPIKE AT ZERO, "
    "not as a hard floor plus a separate strength multiplier — that was one "
    "friction counted twice. Rises in slumps.")

# [PASS2 DELETED] CLASSICAL_WAGE_CORRECTION_STRENGTH (was 0.20, judgement).
# It multiplied the classical wage-clearing channel down to 20% of textbook
# strength, while a hard 0% floor was ALSO specified. Both encode the same
# friction. Research 1.6 resolved it: keep the bunching share above, delete
# this. Do not reintroduce it.

WAGE_PRICE_SPIRAL_CREDIBILITY_GATE = P(
    0.5, 0.3, 0.6, "credibility below which a wage-price spiral can self-sustain",
    "moderate", "Alvarez, Bluedorn, Hansen, Huang, Pugacheva & Sollaci, "
    "IMF WP22/221 (2022); Economica 91(364):1291-1319 (2024)",
    "[PASS2 NEW — OVERTURNS A DESIGN ASSUMPTION] A spiral is defined as at "
    "least three of four consecutive quarters of accelerating prices AND "
    "rising nominal wages. Of 79 such episodes since the 1960s, only a small "
    "minority saw further acceleration after eight quarters. The spiral is "
    "RARE. It must be a switch-gated regime, not the default inflation "
    "engine. Gate: credibility below this AND backward-looking expectations "
    "AND accelerating in >=3 of the last 4 quarters.")


# =====================================================================
# 4. REGIME MULTIPLIERS
#
# [PASS2 / DECISION A3] These are NO LONGER MODEL TERMS. Once consumption,
# investment and aggregation are built structurally (questions A1-A3), using
# a reduced-form multiplier as well would count the same channel twice.
#
# They are now VALIDATION TARGETS. tests/scenarios shocks the assembled model
# and asserts the multiplier it produces falls inside these ranges. Where the
# model lands outside, that is a finding to surface — not a number to tune to.
# =====================================================================

FISCAL_MULT_EXPANSION = P(
    0.5, 0.1, 1.0, "multiplier — VALIDATION TARGET, not a model term",
    "contested", "Auerbach & Gorodnichenko 2012 vs Ramey & Zubairy 2018",
    "Ramey-Zubairy find multipliers below 1 REGARDLESS of slack, directly "
    "contesting the state dependence everyone else assumes. Show the range.")

FISCAL_MULT_NORMAL = P(0.8, 0.5, 1.2, "multiplier — VALIDATION TARGET",
                       "moderate", "IMF")

FISCAL_MULT_RECESSION = P(
    1.5, 1.0, 2.5, "multiplier — VALIDATION TARGET",
    "contested", "Auerbach & Gorodnichenko 2012; IMF bucket approach")

TAX_MULT_ACCOMMODATIVE = P(4.3, 2.0, 5.0, "multiplier — VALIDATION TARGET",
                           "moderate", "threshold VAR literature")
TAX_MULT_TIGHT         = P(1.2, 0.5, 2.0, "multiplier — VALIDATION TARGET",
                           "moderate", "same")

TRANSFER_MULT_RECESSION = P(0.9, 0.5, 1.5, "multiplier — VALIDATION TARGET",
                            "moderate", "IMF")
TRANSFER_MULT_EXPANSION = P(0.4, 0.2, 0.8, "multiplier — VALIDATION TARGET",
                            "moderate", "IMF")

TAX_SHOCK_TO_GDP = P(
    2.5, 2.0, 3.0, "% GDP per 1% of GDP tax rise over 2-3 yr — VALIDATION TARGET",
    "moderate", "Romer & Romer 2010 (narrative identification)",
    "Blanchard-Perotti SVAR estimates are smaller. Narrative approach avoids "
    "reverse causality by reading legislative history.")

PERSONAL_TAX_RATE_TO_GDP = P(
    0.45, 0.30, 0.60, "% GDP per 1pp cut in the average rate — VALIDATION TARGET",
    "moderate", "Mertens & Ravn", "Peaks ~3 quarters. Moves consumption, not investment.")

CORPORATE_TAX_RATE_TO_GDP = P(
    0.50, 0.40, 0.60, "% GDP per 1pp cut — VALIDATION TARGET",
    "moderate", "Mertens & Ravn",
    "Moves investment, unlike the personal rate.")

RATE_TO_OUTPUT = P(
    0.30, 0.20, 0.60, "% output per 1pp rate held one year — VALIDATION TARGET",
    "strong", "Bank of England macro model", "Peak ~12 months.")

RATE_TO_INFLATION = P(
    0.30, 0.20, 0.40, "pp inflation per 1pp rate — VALIDATION TARGET",
    "strong", "Bank of England",
    "Peak 18-24 months. The SLOWEST link in the model — you will be a year "
    "into hiking with nothing to show for it. That's not a bug.")

# Crowding out stays a MODEL TERM: it is a distinct mechanism (deficit ->
# yield -> investment), not a reduced form of the same channel.
CROWDING_OUT = P(
    0.33, 0.15, 0.50, "cents of private investment per $1 of deficit",
    "moderate", "CBO Huntley 2014",
    "Central estimate 33 cents; literature mean ~42. NEAR ZERO under slack "
    "or at the ELB — can even crowd IN. Commonly overstated.")

ZLB_RATE_EFFECTIVENESS = P(
    0.0, 0.0, 0.2, "fraction of normal effect at the lower bound",
    "strong", "2009-2015 experience",
    "SIGN/SIZE FLIP. Rate cuts do almost nothing. Fiscal takes over. This is "
    "the whole reason QE exists. [AUDIT docs/07 M2] Was unread: the rate "
    "transmission had NO dependence on the level of the rate, and the "
    "damping the audit brief attributed to a lower bound was the capacity "
    "cap. Now applied in rules/investment.js:monetaryEasingScale.")

ZLB_EFFECTIVE_BAND = P(
    1.5, 1.0, 2.5, "pp above the ELB over which easing regains its full effect",
    "judgement", "Shape assumption, not an estimate",
    "ZLB_RATE_EFFECTIVENESS gives the endpoint (nothing works AT the bound) "
    "and the literature is clear that policy is fully effective well away "
    "from it, but nothing pins the shape in between. A linear ramp over "
    "1.5pp puts half effect at roughly a zero policy rate, which matches the "
    "2009-2015 experience. TUNING DIAL, not evidence.")


# =====================================================================
# 5. ASSET PRICES, YIELDS AND SPREADS   (research questions 1.1-1.3)
# =====================================================================

# --- 1.1 Asset prices ---
ASSET_PRICE_RATE_SEMIELAST_EQUITY = P(
    4.0, 2.0, 6.0, "% change in real equity prices per 1pp fall in the real rate, cumulative ~1yr",
    "moderate", "Dividend-discount duration logic; NBER w2047 (Shiller/Beltratti); FRB IFDP 841 (2005)",
    "Identification: discount-rate/duration channel of the dividend discount "
    "model. Advanced economies 1990-2019.")

ASSET_PRICE_RATE_SEMIELAST_HOUSING = P(
    5.0, 3.0, 8.0, "% change in real house prices per 1pp fall in the mortgage/real rate, cumulative 2-5yr",
    "contested", "Gorea & Kryvtsov IZA DP15481 / FRBSF WP2022-16 (direct "
    "semi-elasticity 3, one month); Ehrenbergerova et al. meta-analysis 2023 "
    "(peak 1.2% at 2yr); CEPR 2023 conditional (up to 8% over 5yr)",
    "Identification: high-frequency IV (Swanson 2021 factors) on US listings "
    "2001-2019. THE SPREAD IS THE FINDING — 1.2 to 8 across credible methods. "
    "Contested by Glaeser, Gyourko & Saiz: a user-cost model implies a much "
    "smaller effect once mean-reverting rates, mobility, prepayment and "
    "elastic supply are included; rates explain only ~1/5 of the 1996-2006 "
    "boom. Show the range in the UI rather than the point.")

ASSET_PRICE_CREDIT_CHANNEL = P(
    0.15, 0.05, 0.30, "% change in real asset prices per 1pp of excess credit growth",
    "weak", "Judgement anchored on Jorda, Schularick & Taylor credit-boom evidence",
    "The collateral/leverage channel. No direct identification; calibrated so "
    "a sustained credit boom inflates the index. TUNING DIAL, not evidence.")

# The other two legs of the bubble loop. Both were BARE LITERALS in
# credit.js until the fourth audit, inside a comment that asserted they were
# "weak/judgement in parameters.py" — which was true of
# ASSET_PRICE_CREDIT_CHANNEL above and false of these. Promoted so the claim
# is true and so tools/lint.mjs check (f) has something to point at.
CREDIT_COLLATERAL_FEEDBACK = P(
    0.02, 0.005, 0.05, "pp of annual credit growth per 1% of asset overvaluation",
    "weak", "Judgement anchored on Kiyotaki & Moore 1997 (collateral "
    "constraints) and Jorda, Schularick & Taylor credit-boom evidence",
    "THE RETURN LEG OF THE BUBBLE LOOP. ASSET_PRICE_CREDIT_CHANNEL takes "
    "excess credit growth into asset prices; this takes the resulting "
    "overvaluation back into credit growth, and their PRODUCT is the loop "
    "gain. No direct identification for either. TUNING DIAL, not evidence — "
    "but the gain it produces is measured on every run by "
    "test/credit-loop.test.js at four operating points, because at the steady "
    "state the loop is switched off by its own kink and a gain measured there "
    "says nothing.")

CREDIT_IMPULSE_RATE_SENSITIVITY = P(
    0.4, 0.2, 0.8, "pp of annual credit growth per pp of real market rate above its baseline",
    "weak", "Credit-demand semi-elasticity; BIS financial-cycle work",
    "Enters with a negative sign: a real rate above baseline suppresses credit "
    "growth. This is the channel through which the debt-service balancing term "
    "closes the loop — higher credit raises the debt-service burden, which "
    "raises defaults (DEFAULT_RATE_DSR), which widens the spread, which raises "
    "the real market rate and shows up here.")

ASSET_PRICE_MEANREVERSION = P(
    0.02, 0.01, 0.05, "monthly fraction of the gap to fundamental closed (equity; housing slower)",
    "weak", "Campbell-Shiller dividend-yield return predictability",
    "Long-horizon return predictability implies slow reversion; equity "
    "half-life ~3-5yr. TUNING DIAL.")

ASSET_PRICE_FIRESALE = P(
    0.08, 0.03, 0.20, "extra monthly % fall per 1pp of leverage above the threshold",
    "judgement", "Brunnermeier-Pedersen margin/fire-sale spiral; Shleifer & "
    "Vishny 2011; JST crash asymmetry",
    "[PASS2 — DESIGN-CRITICAL] No identification. Calibrated so deflation "
    "takes ~1yr against ~5yr of inflation. THIS ONE-SIDED TERM IS WHAT MAKES "
    "THE CRASH ASYMMETRIC, and a symmetric model cannot teach a bubble. "
    "TUNING DIAL — keep it visibly labelled as such.")

FIRESALE_TOTAL_CAPACITY = P(
    40.0, 20.0, 60.0, "cumulative % fall in real asset prices that forced selling can deliver in one episode",
    "judgement", "Peak-to-trough real falls of 35-55% in credit-financed "
    "housing busts (Ireland, Spain, US 2006-11); Shleifer & Vishny 2011 on "
    "the finite capacity of distressed sellers",
    "[AUDIT docs/07 M4 follow-on] FORCED SELLING IS DONE BY SOMEONE, AND "
    "THEY RUN OUT. ASSET_PRICE_FIRESALE is a monthly RATE keyed on leverage, "
    "and leverage has asset prices in its denominator — so falling prices "
    "raise leverage, which raises the rate, forever. That is the doom loop "
    "and it is meant to be unbalanced, but an unbalanced loop still has to "
    "END: uncapped, once the audit made the gate reachable at all, the asset "
    "index ran to its floor with leverage at 36 and stayed there, which is "
    "not a bust, it is annihilation. Distressed holders have a finite amount "
    "to sell. This is that amount, spent down over an episode and refilled "
    "slowly once leverage is back below the line.")

FIRESALE_REFILL_MONTHS = P(
    48.0, 24.0, 96.0, "months for distressed-selling capacity to rebuild once the constraint clears",
    "judgement", "Post-crisis releveraging takes years (Jorda, Schularick & "
    "Taylor credit cycles)",
    "Slow, so a second bust inside a term hits an economy that has not "
    "reloaded — which is the right shape for back-to-back crises.")

ASSET_PRICE_EQUITY_WEIGHT = P(
    0.4, 0.3, 0.5, "weight on equities in the combined index; housing = 1 - w",
    "moderate", "Housing is roughly 2x equity in household wealth in a "
    "mid-size advanced economy",
    "Housing is the larger, slower component and dominates the wealth effect.")

# --- 1.2 Bond yields ---
BOND_YIELD_DEBT_SLOPE = P(
    0.03, 0.02, 0.046, "pp on the 10y yield per 1pp of debt/GDP (LINEAR regime)",
    "strong", "Laubach 2009 (3-4bp); Poghosyan IMF WP12/271 (2bp); "
    "Gruber & Kamin FRB IFDP 2010 (2bp on net debt, G7); Engen & Hubbard "
    "(2.8bp); Gale & Orszag (4.9bp); Mercatus OLS (4.6bp); Dallas Fed 2025 (~3bp)",
    "[PASS2 FIX] Stated in PERCENTAGE POINTS: 0.03pp = 3bp. The pass-2 report "
    "declared 0.03 while labelling it 'bp' and its equation divided by 100 "
    "again — a 100x error. This parameter also SUPERSEDES the old "
    "DEBT_TO_YIELD, which was the same estimate in bp; citations merged. "
    "Identification: forward yields on PROJECTED debt, to purge the cycle. "
    "Advanced-economy panel cointegration 1980-2010. Suppressed at the ELB "
    "and when the central bank is buying.")

BOND_YIELD_FOREIGN_MULTIPLIER = P(
    3.0, 2.0, 4.0, "multiplier on the debt slope for foreign- vs domestically-financed debt",
    "moderate", "Determinants of long-term yields, panel of major countries, "
    "Journal of the Japanese and International Economies (2015)",
    "[PASS2 NEW — DESIGN-CRITICAL] Foreign-financed debt raises the forward "
    "real rate roughly 3x domestically-financed debt. THIS IS THE JAPAN-VS-"
    "PERIPHERY SWITCH: the yield nonlinearity is driven by currency "
    "denomination and ownership, NOT by the debt level alone. It is the only "
    "way one equation reproduces both cases. Requires the foreign_share state "
    "variable.")

SOVEREIGN_TO_CORPORATE_PASSTHROUGH = P(
    0.6, 0.3, 1.0, "share of a SOVEREIGN risk premium that passes into private borrowing costs",
    "contested", "Neri, Bank of Italy Occasional Paper 170 (2013): euro-area "
    "periphery sovereign-spread pass-through to lending rates ~0.4-0.7 within "
    "a few quarters. Zoli, IMF WP/13/84 (2013) on Italy: ~0.5-0.7. Bofondi, "
    "Carpinelli & Sette, JEEA 16:696-729 (2018), bank lending channel. "
    "Almeida, Cunha, Ferreira & Restrepo, J.Finance 72:249-290 (2017), 'The "
    "Real Effects of Credit Ratings: The Sovereign Ceiling Channel'. "
    "Borensztein, Cowan & Valenzuela, JBF 37:4014-4024 (2013).",
    "[AUDIT-3 NEW, docs/12 M2] THE SOVEREIGN YIELD USED TO REACH NOTHING. It "
    "was read in exactly two places — the government's own interest bill and "
    "the debt-crisis ending — so a country could carry a 7% yield with 60% of "
    "its debt held abroad and the private economy would not notice. That is "
    "why `debt_trap` was provably inert: the Taylor arm was BIT-IDENTICAL to "
    "doing nothing over 48 months, because output_gap sat at 0.000000 the "
    "whole time and nothing the player could do was visible against compound "
    "interest. The channel restores the loop that IS a debt trap: yield -> "
    "private borrowing cost -> investment -> output -> revenue -> debt -> "
    "yield. "
    "IT PASSES THE RISK PREMIUM, NOT THE YIELD. The yield already contains "
    "the expected policy rate, and investment gets that through "
    "policy_rate_demand; passing the whole yield would count the policy rate "
    "twice. Contested because the estimates are almost entirely from the "
    "2010-12 euro periphery, where banks held their own sovereign in size — "
    "the pass-through is plainly weaker for a country borrowing in its own "
    "currency from domestic savers, which is what BOND_YIELD_FOREIGN_MULTIPLIER "
    "already encodes on the yield itself.")

DEBT_AVERAGE_MATURITY_YEARS = P(
    7.0, 5.0, 15.0, "years — average term to maturity of outstanding government debt",
    "strong", "OECD Sovereign Borrowing Outlook 2023: OECD average term to "
    "maturity ~7.5 years. US ~5.8, euro area ~7-8, Japan ~9, UK ~14 (the "
    "outlier, and the reason this is a range rather than a constant).",
    "[AUDIT-3 NEW, docs/12 M2] THE ENTIRE DEBT STOCK USED TO REPRICE "
    "INSTANTLY: interest_cost = govt_debt * yield_10y / 100, so a country with "
    "140% of GDP of debt issued over decades paid this month's ten-year yield "
    "on all of it. Only the maturing fraction refinances, which is 1/this per "
    "year. Two consequences the model had backwards. A hike does NOT bite the "
    "interest bill on impact, so a debt trap gives the player a window instead "
    "of a knife-edge — and the window closing is the lesson. And docs/11's "
    "claim that 'debt is the second fastest thing to respond to a rate cut, "
    "and almost nobody expects that' was an artefact of this defect rather "
    "than a result; nobody expects it because it is not true.")

BOND_YIELD_NONLINEAR_THRESHOLD = P(
    100.0, 80.0, 120.0, "% debt/GDP above which sensitivity rises for own-currency debt",
    "moderate", "Ardagna, Caselli & Lane 2007; Baldacci & Kumar IMF 2010",
    "Quadratic debt term in OECD/AE panels. Above ~100% the marginal "
    "sensitivity rises; a periphery reprices when debt is foreign-held or "
    "effectively foreign-currency. Lower the threshold for foreign currency.")

# --- 1.3 Credit spreads and defaults ---
CREDIT_SPREAD_UNEMP = P(
    0.10, 0.05, 0.20, "pp widening in a Baa-type spread per 1pp rise in unemployment",
    "moderate", "'Unemployment and credit risk', Journal of Financial "
    "Economics 2022; Moody's Baa-Aaa spread 1929-2018",
    "[PASS2 NEW] Identification: 14-country panel, DMP search model with "
    "defaultable debt. Robust to standard credit-risk controls — unemployment "
    "carries INDEPENDENT information about credit risk.")

DEFAULT_RATE_DSR = P(
    0.15, 0.08, 0.30, "pp rise in the default rate per 1pp rise in the debt-service ratio",
    "weak", "'Financial Development, Default Rates and Credit Spreads', "
    "Economic Journal 130(626) 2020 (Moody's data)",
    "[PASS2 NEW] Moody's 15,000-issuer database 1950-2017. Magnitude is judgement. "
    "[4TH AUDIT 5.2] The DSR it reads is now the rate PAID on the outstanding "
    "stock, not this month's market rate — see PRIVATE_DEBT_REPRICING_YEARS.")

PRIVATE_DEBT_REPRICING_YEARS = P(
    3.0, 1.0, 8.0,
    "years — average time for the rate PAID on the outstanding private debt "
    "stock to catch up with the market rate",
    "weak", "BIS Annual Economic Report 2023 and BIS Quarterly Review "
    "Mar-2023 on the floating-rate/short-fixation share of private credit and "
    "the speed of the 2022 hiking cycle's pass-through; ECB MIR statistics on "
    "the fixation-period distribution of outstanding euro-area household "
    "loans; IMF GFSR 2022-23 on household debt-service sensitivity.",
    "[4TH AUDIT 5.2, docs/12 E1] THE PRIVATE ANALOGUE OF "
    "DEBT_AVERAGE_MATURITY_YEARS, and the asymmetry it removes was visible and "
    "absurd: the state refinanced over seven years while its households "
    "refinanced overnight. updateDefaults computed the debt-service burden as "
    "private_credit * (policy_rate + credit_spread) / 100 — the DIAL, and the "
    "WHOLE STOCK — so every mortgage and every corporate loan was "
    "floating-rate with no lag and the default rate moved the month a rate "
    "change was announced. Same error, same shape, one block later.\n"
    "\n"
    "THIS IS THE SEPARATE QUESTION RATE_PASSTHROUGH_TO_BORROWERS' NOTE POINTS "
    "AT. That parameter is how fast a policy move reaches the rate on NEW "
    "business (fast, about a quarter). This is how fast the STOCK of existing "
    "loans inherits it (slow, and it is a different literature). The two "
    "compose: a hike reaches new borrowers in a quarter and the average rate "
    "paid crawls toward it over years.\n"
    "\n"
    "WHY A SINGLE NUMBER IS THE WRONG SHAPE AND IS USED ANYWAY. There is no "
    "published advanced-economy average here the way OECD publishes sovereign "
    "term to maturity, because the quantity varies by an order of magnitude "
    "across countries and that spread IS the interesting fact — it is most of "
    "why the 2022 cycle hurt Australia and the UK so much more than the US. "
    "The central value is a composition, and the WEIGHTS ARE JUDGEMENT:\n"
    "  corporates  bank loans are largely floating or short-fixation "
    "(~1yr); bonds are fixed at ~7yr average maturity. Bank-based mix -> ~3yr.\n"
    "  households  mortgages dominate. Variable-rate and short-fixation "
    "countries (AU, ES, PT, FI, SE, and the UK's 2-5yr fixes) sit at ~1-3yr; "
    "long-fixation ones (US 30yr, FR, DE, NL, DK) at 10yr+ -> ~4-6yr.\n"
    "Roughly equal weight gives 3-4 years; 3.0 is the round number inside it. "
    "The range [1, 8] is deliberately the CROSS-COUNTRY spread rather than an "
    "estimation interval, which is why the confidence is `weak`: a sweep over "
    "it is a sweep over 'which country is this', and that is the honest "
    "reading of the parameter.\n"
    "\n"
    "NOT MODELLED, AND IT IS ASYMMETRIC IN REALITY: US-style prepayable fixed "
    "mortgages reprice FAST when rates fall (refinancing) and not at all when "
    "they rise (lock-in). One speed cannot carry that, the same way one "
    "ASSET_PRICE_MEANREVERSION cannot carry equity and housing (open_items "
    "B4). Recorded, not fudged.")

DEFAULT_RATE_UNEMP = P(
    0.20, 0.10, 0.40, "pp rise in the default rate per 1pp rise in unemployment",
    "moderate", "DMP / credit-risk literature",
    "[PASS2 NEW] Cross-country panel; strong positive unemployment-to-default link.")

LOSS_GIVEN_DEFAULT = P(
    0.55, 0.40, 0.70, "fraction of a defaulted loan not recovered",
    "judgement", "Basel LGD conventions (45% senior unsecured; higher in "
    "systemic episodes)",
    "[PASS2 GAP-FILL] The pass-2 credit-spread equation references `recovery` "
    "without ever giving it a value — flagged as a dangling symbol in "
    "docs/05-handoff.md Tier B. recovery = 1 - this. Labelled judgement.")

BANK_CAPITAL_DELEVER_TRIGGER = P(
    0.0, 0.0, 0.0, "pp of capital ratio below the regulatory minimum at which forced deleveraging starts",
    "judgement", "Basel III minima",
    "[PASS2 NEW] Zero means 'exactly at the minimum'. Below the buffer banks "
    "cut lending rather than raise capital in a crisis — this is what arms "
    "the doom loop.")

BANK_CAPITAL_MINIMUM = P(
    10.5, 8.0, 13.0, "% capital ratio: the regulatory floor banks defend",
    "strong", "Basel III: 8% total capital + 2.5% conservation buffer",
    "[AUDIT docs/07 M5] BANK_CAPITAL_DELEVER_TRIGGER is stated as pp BELOW "
    "the regulatory minimum, and the minimum itself was never given a value, "
    "so the trigger could not be implemented and the doom loop had no "
    "forced-selling engine.")

BANK_DELEVER_STRENGTH = P(
    3.0, 1.0, 6.0, "pp off annual credit growth per 1pp of capital shortfall",
    "judgement", "Calibrated so a 2pp shortfall roughly halts credit growth",
    "[AUDIT docs/07 M5] Banks below the buffer cut lending rather than raise "
    "capital. No clean identification exists for the quantity response — the "
    "BIS work is on loan RATES, which is BANK_CAPITAL_TO_LOAN_RATE. TUNING "
    "DIAL, and it is the gain of the doom loop, so treat it as such.")

BANK_CAPITAL_TO_LOAN_RATE = P(
    13.0, 10.0, 16.0, "bp on loan rates per 1pp of capital requirement",
    "moderate", "BIS 2010 LEI",
    "[AUDIT docs/07 M5] Was unread: credit.js used an invented 0.15 in its "
    "place. Now the spread's bank-capital term, at value/100 pp per pp.")

BANK_CAPITAL_TO_GDP = P(
    -10.0, -16.0, -9.0, "bp on the GDP level per 1pp of capital requirement",
    "moderate", "BIS 2010; BCBS literature review",
    "TRANSITIONAL, not permanent. Offset by lower crisis probability. Lending "
    "falls ~1.4% over 16 quarters then mostly recovers within three years.")


# =====================================================================
# 6. CRISIS DYNAMICS   (existing + research question 2.4)
# Crises come from an accumulating stock, not a random draw.
# =====================================================================

CREDIT_GAP_HP_LAMBDA = 400_000   # one-sided HP filter, quarterly (Borio & Lowe 2002)

CREDIT_TREND_CATCHUP = P(
    0.127, 0.090, 0.253, "annual fraction of the credit/GDP gap the trend closes",
    "moderate", "DERIVED from CREDIT_GAP_HP_LAMBDA above (Borio & Lowe 2002) by "
    "matching the half-power cutoff of this model's one-sided exponential trend "
    "to that of the HP filter at the BIS lambda",
    "[4TH AUDIT 5.4] Was a bare 0.20 literal in credit.js with no derivation at "
    "all, under a comment citing the HP filter it does not resemble. "
    "THE DERIVATION. lambda = 400,000 is for QUARTERLY data; Ravn-Uhlig scales "
    "it by the 4th power of the observation frequency, so monthly lambda is "
    "400,000 x 3^4 = 32.4 million. The HP trend's gain is 1/(1 + 4*lambda*"
    "(1-cos w)^2) and this model's trend is a one-sided exponential whose gain "
    "is a/sqrt(1 - 2(1-a)cos w + (1-a)^2). Matching where each falls to "
    "1/sqrt(2) gives a monthly a of 0.010577, i.e. 0.127 a year: a half-life of "
    "5.5 years against the 3.5 the old 0.20 implied. The range spans lambda "
    "from 25,000 to 1.6 million, which is the spread of credit-gap lambdas in "
    "the literature. "
    "THE AUDIT BRIEF SAYS THE METER IS 3-4x TOO FAST. MEASURED, IT IS 1.58x. "
    "The brief's 10-15 year 'trend time constant' does not follow from lambda = "
    "400,000 by any matching this derivation could reproduce; the implied "
    "cutoff PERIOD is 49 years and the implied half-life is 5.5. "
    "AND A STRUCTURAL CAVEAT THAT MATTERS MORE THAN THE NUMBER: the BIS trend "
    "is a LOCAL LINEAR trend — it carries a slope state, so it tracks a "
    "steadily growing credit stock without lagging. This model's is level-only "
    "and lags any trend permanently. Fitting the two empirically on the model's "
    "own credit paths gives 0.598, 0.010, 0.468 and 0.010 across four "
    "scenarios: no single speed makes them equivalent, because they are not the "
    "same kind of filter. The frequency-domain match above is therefore the "
    "honest derivation available, and the residual difference is a known "
    "limitation rather than a tuning opportunity.")

CREDIT_GAP_CRISIS_THRESHOLD = P(
    9.0, 3.0, 10.0, "pp of credit/GDP above trend",
    "strong", "BIS Aldasoro, Borio & Drehmann 2018",
    "Optimal threshold 9pp captures ~66% of crises. Basel III maxes the "
    "countercyclical buffer at 10pp. A lower 3pp threshold captures ~76% over "
    "3 years with more false positives. THIS IS YOUR CRASH METER. Also serves "
    "as leverage_max in the asset-price fire-sale term.")

BANK_WOBBLE_FRAGILITY_GAIN = P(
    3.0, 1.5, 5.0, "x — extra severity of a bank scare at the BIS danger line versus at trend credit",
    "moderate", "Baron, Verner & Xiong, 'Banking Crises Without Panics', QJE "
    "136:51-113 (2021): bank equity declines predict far worse real outcomes "
    "when they follow high credit growth, and most bank distress episodes "
    "without a preceding boom pass with little real damage. Jorda, Schularick "
    "& Taylor JMCB 45:3-28 (2013), the same source as CRISIS_OUTPUT_TROUGH.",
    "[AUDIT-3 NEW, docs/12 M3] bank_wobble was one of three shocks the player "
    "could not detect: measured -0.19pp of output in `bubble` and -0.28pp in "
    "`calm`, and IDENTICAL across every capital position, because a flat -1.0pp "
    "hit to a ratio that rebuilds toward 13% never reached BANK_CAPITAL_MINIMUM "
    "and so never armed the delever trigger. The shock now scales with how "
    "stretched the system already is, measured on the credit gap — the model's "
    "own fragility gauge, the same one crisis_prob reads, rather than a new "
    "one. At trend credit it is exactly what it always was; at the BIS line it "
    "takes enough capital to arm the doom loop. THE STATE-DEPENDENCE IS THE "
    "LESSON: the same news is a non-event in a sound system and a near-crisis "
    "in a stretched one, which is also why the credit gap is the gauge worth "
    "watching.")

CRISIS_PROB_PER_SD_CREDIT = P(
    3.5, 2.6, 5.3, "pp crisis probability per 1 SD of excess credit growth",
    "moderate", "Schularick & Taylor 2012; Greenwood, Hanson & Shleifer 2020",
    "GHS: a combined credit AND asset-price boom (the 'R-zone') preceded 64% "
    "of crises. Credit-financed bubbles are far more dangerous than "
    "equity-only ones. Do not extrapolate much beyond 2 SD — cap it.")

FINANCIAL_ACCELERATOR_STRENGTH = P(
    0.3, 0.1, 0.5, "amplification on INVESTMENT, not output",
    "weak", "Christensen & Dib 2008",
    "Estimated models find amplification SIGNIFICANT for investment but "
    "'relatively minor' for total output. DO NOT code a large output "
    "multiplier here — that's a common modelling error. [AUDIT docs/07 "
    "section C] SUPERSEDED, and deliberately unread. investment.js carried "
    "this as a second coefficient on (credit_spread - spread_ss) alongside "
    "the spread's entry into user_cost, i.e. the same regressor twice, "
    "adding 89% to the credit channel. In Bernanke-Gertler-Gilchrist the "
    "external finance premium IS the spread, so it enters once, through "
    "user_cost. Deleting the second term is the de-duplication; re-adding "
    "any coefficient on the spread inside investment.js re-creates the bug.")

CRISIS_OUTPUT_TROUGH = P(
    -9.0, -15.0, -6.0, "% peak-to-trough real GDP per capita fall in a financial-crisis recession",
    "strong", "Reinhart & Rogoff 2009 (~9% average); Jorda, Schularick & "
    "Taylor, 'When Credit Bites Back', JMCB 45:3-28 (2013)",
    "[AUDIT-2 FINDING, docs/11] THIS IS A REDUCED FORM BEING USED AS A "
    "STRUCTURAL SHOCK, and the model double-counts as a result. -9% is the "
    "OBSERVED peak-to-trough fall, which already contains the multiplier; "
    "crisis.js feeds it in as an exogenous demand impulse and the model's own "
    "multiplier then amplifies it again. Measured realised trough: -24% of "
    "output, against a published -6 to -15. Compounding it, CRISIS_HYSTERESIS_SCAR "
    "lands as an immediate 10% cut to potential, when Cerra-Saxena measure a "
    "level that diverges from TREND over years. Resolving this needs the "
    "structural impulse separated from the observed trough and the scar phased "
    "in — a modelling decision, not a keystroke. Surfaced by a todo test in "
    "test/validation.test.js rather than closed by shrinking a number. "
    "[PASS2 NEW; low/high order corrected] 200+ recessions, 14 advanced "
    "economies 1870-2008, local projections conditioning on credit. More "
    "credit-intensive booms produce deeper busts.")

CRISIS_YEARS_TO_RECOVER = P(
    5.0, 4.0, 8.0, "years for output to climb back toward the prior trend",
    "strong", "JST 2013; IMF WP20/73 'Hysteresis and Business Cycles'",
    "[PASS2 NEW] The financial-crisis path still lies below the "
    "normal-recession path at five years. [AUDIT-3, docs/12] Now used TWICE, "
    "on one time constant tau = 12*value/ln(10): the transitory demand "
    "collapse DECAYS on it and the permanent scar GROWS on it. That is not a "
    "convenience — it is the hysteresis mechanism stated as arithmetic. The "
    "scar IS the part of the collapse that never came back, so the two have "
    "to be the same clock. At 60 months the drag is down to 10% of the "
    "impulse and the scar is up to 90% of its eventual value.")

# --------------------------------------------------------------------
# THE TWO DECONVOLUTION CONSTANTS      [AUDIT-3, docs/12 section 2]
#
# These are the only two parameters in this file that describe THIS MODEL
# rather than the world, and they exist to undo a specific error: feeding a
# REDUCED FORM in as a STRUCTURAL INPUT.
#
# CRISIS_OUTPUT_TROUGH (-9%) and CRISIS_HYSTERESIS_SCAR (10%) are OBSERVATIONS.
# Each already contains everything the economy did in response — the
# multiplier, the accelerator, the capital channel, the balance sheet. crisis.js
# used to hand both of them to the model as exogenous impulses, and the model
# then did all of that a SECOND time. Measured before the fix: a -9%
# observation produced a realised trough of -23.5%, and the 10% scar landed in
# full on month one.
#
# So each observation is divided by the model's own measured amplification of
# it. The observations do not move. If the demand block changes, these must be
# RE-MEASURED, never nudged — test/crisis.test.js re-derives the realised arc
# on every run and fails if it has left the published bands.
#
# AND THE TWO OBSERVATIONS ARE MEASURED AGAINST DIFFERENT BASELINES, which is
# the part that had gone unnoticed and which made them look contradictory:
#   CRISIS_OUTPUT_TROUGH    peak-to-trough, vs the pre-crisis LEVEL
#   CRISIS_HYSTERESIS_SCAR  years later,    vs the pre-crisis TREND
# At 1.5% trend growth, -10% vs trend at 60 months is only -2.2% vs the level.
# Comparing both to one baseline — which docs/11 and the audit brief both did —
# makes a permanent loss look DEEPER than the trough it followed.
# --------------------------------------------------------------------

CRISIS_IMPULSE_AMPLIFICATION = P(
    2.1855, 1.8, 3.4, "x — this model's amplification of a crisis-state demand impulse into a realised output trough",
    "judgement", "DERIVED FROM THIS MODEL by solving for the value that makes "
    "the realised peak-to-trough fall equal CRISIS_OUTPUT_TROUGH. Re-measured "
    "by test/crisis.test.js on every run.",
    "[4TH AUDIT 4.1] RE-SOLVED from 2.59 to 2.1855 after Phases 2 and 3 changed "
    "the demand block. This is not a correction of an error: the constant is "
    "DEFINED as this model's amplification, the model's amplification fell, "
    "and so did the constant. The structural demand impulse is "
    "CRISIS_OUTPUT_TROUGH / this = 4.118pp of GDP, up from 3.47, and the model "
    "turns that into the observed -9.0% peak-to-trough at month 15. "
    "It is NOT constant in the size of the impulse — at the old 9pp impulse it "
    "was only 1.68x, because investment hit its floor clamp and the "
    "amplification saturated. That nonlinearity is why this had to be solved "
    "rather than read off a single measurement, and it is the range. "
    "SEE CRISIS_SCAR_AMPLIFICATION: its companion could NOT be re-solved "
    "inside its own range, and the reason is a finding about the demand block "
    "rather than about either constant.")

CRISIS_SCAR_AMPLIFICATION = P(
    3.14, 2.0, 4.5, "x — this model's amplification of an exogenous capacity cut into a total loss against trend",
    "judgement", "DERIVED FROM THIS MODEL by solving for the value that puts "
    "output CRISIS_HYSTERESIS_SCAR below the pre-crisis trend at 60 months, "
    "the horizon Cerra & Saxena measure.",
    "[4TH AUDIT 4.1] IT NO LONGER SOLVES INSIDE ITS OWN RANGE, AND THAT IS THE "
    "FINDING — NOT A REASON TO MOVE IT. Left at 3.14 deliberately. "
    "The logic of this constant is a DECONVOLUTION: Cerra & Saxena's ~10% is "
    "the TOTAL observed divergence from trend, the model generates most of it "
    "endogenously, and the exogenous capacity cut is only what is left over. "
    "That is what not double-counting means. Measured with no exogenous scar "
    "at all, the model used to produce 8.4% of the 10 by itself — capital "
    "destruction, a contracted credit stock, and an output gap that had not "
    "closed at five years. IT NOW PRODUCES 3.65%. "
    "Re-solved against the 10% target it lands at 1.06-1.26 depending on "
    "whether its companion is solved with it, which would make the exogenous "
    "cut 7.9-9.5% of the 10 and leave the model supplying almost nothing. "
    "Forcing it there would load the model's missing propagation onto an "
    "exogenous constant — imposing the observed reduced form as a structural "
    "input, which is rule 4 and is the exact defect the deconvolution was "
    "built to remove. "
    "WHAT THIS ACTUALLY MEASURES is that the demand block propagates a shock "
    "too weakly, and it is the fourth independent sighting of that: the UK "
    "1979-83 sacrifice ratio (0.38 against Ball's 2-4), TAX_SHOCK_TO_GDP (0.46 "
    "against Romer-Romer's 2-3), the missing austerity paradox, and this. "
    "Re-solve it when the demand block has been addressed, not before.")


CRISIS_HYSTERESIS_SCAR = P(
    10.0, 5.0, 15.0, "% PERMANENT output-level loss",
    "strong", "Cerra & Saxena, 'Growth Dynamics: The Myth of Economic "
    "Recovery', AER 98(1):439-457 (2008); IMF WP20/73",
    "[PASS2 NEW — DESIGN-CRITICAL] ~5% balance-of-payments crisis, ~10% "
    "banking crisis, ~15% twin crisis. 190-country panel. Cerra-Saxena find "
    "no significant rebound after financial crises: output shifts the TREND, "
    "it does not cycle back. This makes a crash a permanent handicap rather "
    "than a setback, and turns surviving one into a distinct, harder game.")

RECAP_RECOVERY_MULTIPLIER = P(
    0.5, 0.3, 0.7, "fraction by which prompt recapitalisation shrinks the permanent scar",
    "weak", "DeLong & Summers 2012; Cerra, Fatas & Saxena JEL 2020",
    "[PASS2 NEW] Hysteresis logic: prompt policy reduces scarring. Magnitude "
    "is judgement. TUNING DIAL. [AUDIT docs/07 L7] Was dead: recap_promptness "
    "was only ever set to 0 and nothing could raise it, so the decision this "
    "parameter exists to create did not exist. See RECAP_FULL_RESPONSE.")

RECAP_FULL_RESPONSE = P(
    5.0, 3.0, 8.0, "pp of GDP of extra public spending in year one that counts as a full recapitalisation",
    "moderate", "2008-09 public capital injections: US TARP ~5% of GDP, "
    "Ireland ~40%, UK ~6%, euro-area median ~5%",
    "[AUDIT docs/07 L7] Recapitalisation IS a fiscal operation, so the game "
    "does not need a separate dial for it: extra government spending inside "
    "RECAP_WINDOW after a crash is read as the recapitalisation response. "
    "This is the amount that earns the full RECAP_RECOVERY_MULTIPLIER.")

RECAP_WINDOW_MONTHS = P(
    12.0, 6.0, 18.0, "months after a crash during which the scar is still being set",
    "moderate", "Cerra, Fatas & Saxena JEL 2020: 'prompt' is about a year",
    "[AUDIT docs/07 L7] The scar used to be fixed on the first tick of a "
    "crisis, which left no window in which a response could matter.")

# The three loops with no balancing counterpart. These generate crises.
# A model with only balancing loops can never teach one.
# =====================================================================
# CONSTANTS SOLVED FROM THIS MODEL, NOT MEASURED FROM THE WORLD
# =====================================================================
#
# READ THIS BEFORE QUOTING ANY TEST THAT CHECKS ONE OF THEM.
#
# Every other parameter in this file is an estimate of something in the world,
# with a source and a range, and a test that compares the model against it can
# FAIL — which is what makes it evidence. The entries below are different in
# kind. Their value is DEFINED as whatever makes this model reproduce a
# published magnitude. That has two consequences and both are easy to forget:
#
#   1. THE TEST THAT CHECKS THEM CANNOT FAIL ON MAGNITUDE, because the constant
#      is solved to make it pass. test/crisis.test.js asserting that the crash
#      troughs at CRISIS_OUTPUT_TROUGH is therefore a CONSISTENCY CHECK, not a
#      validation. The crash's headline magnitude is pinned by construction and
#      is not independent evidence about the model.
#   2. WHEN THE MODEL CHANGES, THEY MUST BE RE-SOLVED. They absorb whatever the
#      rest of the model stops doing, silently, and a stale one reads as a
#      healthy magnitude while the mechanism underneath it has gone.
#
# They are not a defect — deconvolving an observation into a structural input
# is the correct move, and the alternative (feeding the observed magnitude in
# directly) is rule 4's error. They just must never be mistaken for findings.
#
# WHAT THEY ARE WORTH IS THE RESIDUAL. The useful question is never "does the
# trough match" — it is solved to match — but "how much of the published
# magnitude does the model supply BY ITSELF". That number is evidence, it is
# measured on every run, and in the 4th audit it fell from 8.4% to 3.65%.
SOLVED_FROM_MODEL = {
    "CRISIS_IMPULSE_AMPLIFICATION":
        "solved so the realised peak-to-trough equals CRISIS_OUTPUT_TROUGH. "
        "Re-solved 2.59 -> 2.1855 in the 4th audit after Phases 2 and 3 changed "
        "the demand block.",
    "CRISIS_SCAR_AMPLIFICATION":
        "solved so output sits CRISIS_HYSTERESIS_SCAR below trend at 60 months. "
        "NOT re-solved in the 4th audit: it lands at 1.06-1.26, outside its own "
        "range, which would make the exogenous cut supply 9.5 of the 10 and "
        "destroy the deconvolution. The refusal is the finding.",
}


UNBALANCED_LOOPS = [
    "fire_sale_deleveraging",           # Shleifer & Vishny 2011. The engine.
    "deposit_insurance_moral_hazard",   # slow, invisible, builds for decades
    "debt_service_spiral",              # high debt + high rates -> debt grows itself
]


# =====================================================================
# 7. MONEY, VELOCITY AND MONETISATION   (questions A6, 2.1, 2.2)
# =====================================================================

VELOCITY_INTEREST_SEMIELAST = P(
    0.6, 0.3, 1.0, "elasticity of velocity to the nominal interest rate",
    "moderate", "McKibbin & Sachs (money-demand interest elasticity ~-0.6); "
    "Fed KDME 2009 money-demand review",
    "[PASS2 NEW] = minus the money-demand elasticity. Velocity rises with the "
    "nominal rate. Advanced economies.")

VELOCITY_FLIGHT_THRESHOLD = P(
    20.0, 10.0, 40.0, "% annual inflation above which velocity rises sharply",
    "weak", "Cagan semi-log hyperinflation money demand",
    "[PASS2 NEW] Below ~10-20% velocity is roughly stable; above it there is "
    "a convex takeoff. REGIME-SPECIFIC: drawn from EM/high-inflation "
    "episodes, flagged as such. This convexity is the hyperinflation engine, "
    "and it is what breaks the naive money-printing story at low inflation.")

MONETISATION_SLACK_GATE = P(
    1.0, 0.5, 1.5, "pp of slack at which printing pass-through is fully suppressed",
    "moderate", "IMF WP10/189 'Still Minding the Gap'",
    "[PASS2 NEW] 25 persistent-large-gap episodes in advanced economies, all "
    "producing significant disinflation.")

MONETISATION_CREDIBILITY_GATE = P(
    0.5, 0.3, 0.7, "credibility below which printing pass-through switches on",
    "moderate", "IMF Colombia SIP 2025; BIS Papers 67 (fiscal dominance in EMEs)",
    "[PASS2 NEW — THE HIGHEST-PRIORITY FIX IN THE MODEL] Fiscal-deficit "
    "shocks raise 1y inflation expectations but leave 5y expectations "
    "unchanged in strong-framework economies. Pass-through is the PRODUCT of "
    "a credibility ramp and a slack ramp, moving smoothly from 0 to 1 — it is "
    "not a threshold and it is NOT unconditional. Anchored plus slack gives "
    "~0 (this is why QE after 2008 did not cause hyperinflation); unanchored "
    "plus hot gives ~1. The prototype applied it unconditionally, which "
    "INVERTS the lesson.")

QE_TO_YIELD = P(
    3.5, 2.0, 10.0, "bp fall in the 10y yield per 1% of GDP purchased",
    "moderate", "BIS; BoE (UK GBP200bn ~ 14% GDP ~ 100bp)",
    "Fed literature median ~50bp total, span 40-240bp. Diminishing returns "
    "across rounds; the announcement effect is front-loaded.")

QE_TO_GDP = P(
    0.10, 0.02, 0.15, "% GDP per 1% of GDP purchased",
    "weak", "BoE WP 2012",
    "Real-economy effect genuinely contested; some argue near-zero outside "
    "market dysfunction.")


# =====================================================================
# 8. CREDIBILITY AND EXPECTATIONS   (research question 2.3)
# =====================================================================

CREDIBILITY_DECAY = P(
    0.05, 0.02, 0.10, "quarterly FALL in credibility per sustained 1pp inflation miss",
    "weak", "Bems, Caselli, Grigoli & Gruss IMF WP18/280 / Journal of "
    "International Economics 2021; Banque de France WP852; Corsello, Neri & "
    "Tagliabracci (Bank of Italy 2019)",
    "[PASS2 NEW] Anchoring measured via forecast dispersion and the "
    "sensitivity of 5y-forward expectations to data surprises. GENUINELY "
    "UNDER-IDENTIFIED — the ~3:1 asymmetry against repair is firmer than "
    "either level.")

CREDIBILITY_REPAIR = P(
    0.017, 0.005, 0.03, "quarterly RISE in credibility during a sustained on-target period",
    "weak", "Volcker disinflation (FRBSF WP98-01; Hardouvelis & Barnhart "
    "credibility measure); 2021-24 re-anchoring",
    "[PASS2 NEW] The Volcker natural experiment: re-anchoring took years of "
    "demonstrated resolve. Implied decay-to-repair asymmetry ~3:1. The "
    "prototype used 0.02 / 0.010 — directionally right but far too "
    "symmetric. That asymmetry is the whole reason central bankers hike into "
    "visible pain rather than waiting for proof.")

CREDIBILITY_MISS_TOLERANCE = P(
    2.0, 1.0, 3.0, "pp inflation miss tolerated before credibility erodes",
    "judgement", "Central bank tolerance bands",
    "[PASS2 GAP-FILL] The pass-2 equation references `tolerance` without a "
    "value. NOTE THE SIGN TRAP: use a SIGNED miss for erosion, not an "
    "absolute one. The prototype used abs(), so engineering deflation to -4% "
    "destroyed credibility exactly as fast as causing 8% inflation — "
    "punishing the cure identically to the disease.")

EXPECTATION_ADAPTIVE_WEIGHT = P(
    0.3, 0.2, 0.5, "weight on lagged inflation in expectation formation",
    "moderate", "Coibion & Gorodnichenko survey-expectations work",
    "[PASS2] Confirms the prototype's 0.30 as a reasonable central value, but "
    "it must RISE WITH THE INFLATION LEVEL — expectations become more "
    "backward-looking at higher inflation, which is a second amplifier on top "
    "of the credibility switch.")

MONETARY_ASYMMETRY_RATIO = P(
    1.5, 1.2, 2.0, "ratio of contractionary to expansionary effect magnitude",
    "moderate", "Tenreyro & Thwaites, 'Pushing on a String: US Monetary "
    "Policy Is Less Powerful in Recessions', AEJ: Macroeconomics 8(4):43-74 "
    "(2016); Barnichon & Matthes, Richmond Fed WP 16-08 / EB17-03",
    "[PASS2 NEW] State-dependent local projections on Romer-Romer shocks; "
    "Gaussian-mixture IRFs. Contractionary shocks raise unemployment more "
    "than expansionary shocks lower it, and policy is weaker in recessions, "
    "especially for durables and business investment. THIS IS THE EVIDENCE "
    "FOR 'pushing a string vs pulling a rope' — code cuts at 1/ratio and "
    "hikes at 1.0, and weaken cuts further in recession.")


# =====================================================================
# 9. FISCAL AND AUTOMATIC STABILISERS   (research question 2.5)
# =====================================================================

AUTO_STABILISER_ABSORPTION = P(
    0.60, 0.38, 0.80, "fraction of a shock absorbed with no decision",
    "strong", "OECD Maravalle & Rawdanowicz 2020 (ECO/WKP(2020)43)",
    "OECD average ~60% on impact: ~80% Germany/Netherlands, <40% Spain/"
    "Slovakia/Japan/Greece. Micro estimates (Dolls, Fuest & Peichl): income "
    "shock 38% EU / 32% US; unemployment shock 47% EU / 34% US. This is the "
    "AGGREGATE the two channels below must reproduce.")

AUTOSTAB_TAX_ELASTICITY = P(
    1.3, 1.0, 1.8, "elasticity of personal income-tax revenue to the output gap",
    "strong", "Girouard & Andre OECD 2005; Price et al. OECD 2015; IMF SPN09/23",
    "[PASS2 NEW] Marginal x average tax rates across the earnings "
    "distribution. Progressive income tax is the LARGEST stabiliser channel "
    "(~0.45 of the 0.60 total). Semi-elasticities rose across most OECD "
    "countries between 2005 and 2015.")

AUTOSTAB_BENEFIT_ELASTICITY = P(
    3.0, 2.0, 5.0, "elasticity of unemployment-benefit spending to the number unemployed",
    "strong", "OECD ECO/WKP(2020)43; Girouard & Andre 2005",
    "[PASS2 NEW; low/high order corrected] The MOST TIMELY channel — it fires "
    "immediately on job loss (~0.15 of the 0.60 total). [AUDIT docs/07 "
    "hygiene] SIGN CORRECTED, -3 -> +3. Benefit spending RISES when "
    "unemployment rises, so the elasticity is positive; fiscal.js negated it "
    "back, which is two compensating errors and hid the third — an invented "
    "0.1 factor converting an elasticity into a level coefficient. That is "
    "now UNEMPLOYMENT_BENEFIT_SHARE.")

UNEMPLOYMENT_BENEFIT_SHARE = P(
    1.0, 0.5, 1.5, "% of GDP spent on unemployment benefits at the natural rate",
    "moderate", "OECD Social Expenditure Database, out-of-work income support",
    "[AUDIT docs/07 hygiene] The base that AUTOSTAB_BENEFIT_ELASTICITY is an "
    "elasticity OF. Without it the code multiplied an elasticity by an "
    "invented 0.1 and produced roughly half the intended stabiliser.")

AUTOSTAB_TAX_LAG = P(
    3.0, 1.0, 6.0, "months lag on the tax stabiliser",
    "moderate", "OECD implementation notes", "Withholding and settlement delay.")

AUTOSTAB_BENEFIT_LAG = P(
    1.0, 0.0, 2.0, "months lag on the benefit stabiliser",
    "moderate", "OECD", "The fastest channel in the model.")

DEPRECIATION_RATE = P(
    0.065, 0.04, 0.10, "fraction of the capital stock per year",
    "moderate", "standard growth accounting",
    "K[t] = (1-delta)*K[t-1] + I[t]. Consistent with SS_DEPRECIATION (0.06) "
    "to within its range; SS_DEPRECIATION is the one used by the steady-state "
    "identities, this one by the capital law of motion. Keep them equal.")


# =====================================================================
# 10. SENTIMENT   (research question 3.1-3.2)
#
# [PASS2 — OVERTURNS THE FIRST PASS] The first pass concluded these had
# "ZERO empirical basis" and were "not really economics". That was wrong:
# they had been searched for as economics. Economic voting and consumer
# sentiment are mature, well-identified fields.
# =====================================================================

APPROVAL_MISERY_WEIGHT = P(
    1.7, 1.4, 2.0, "unemployment weight relative to inflation in voter dissatisfaction",
    "moderate", "Di Tella, MacCulloch & Oswald, 'Preferences over Inflation "
    "and Unemployment', American Economic Review 91(1):335-341 (2001)",
    "[PASS2 NEW] 12-country Eurobarometer wellbeing surveys 1975-1991. A 1pp "
    "rise in unemployment trades against ~1.7pp of inflation, and the paper "
    "STATISTICALLY REJECTS equality of the two coefficients — the misery "
    "index is not 1:1 and voter dissatisfaction is not a simple linear misery "
    "function. Unemployment hurts about 1.7x more.")

APPROVAL_INCOME_GROWTH_COEF = P(
    3.5, 2.0, 5.0, "vote-share points per 1pp of weighted real disposable income growth per capita",
    "strong", "Hibbs, 'Bread and Peace Voting in U.S. Presidential "
    "Elections', Public Choice 104:149-180 (2000)",
    "[PASS2 NEW] Postwar US presidential vote explained essentially entirely "
    "by weighted-average real disposable income growth per capita plus "
    "cumulative war deaths; robust across 22 functional-form variations.")

APPROVAL_HORIZON = P(
    0.9, 0.8, 1.0, "quarterly decay weight favouring the election-year economy",
    "strong", "Achen & Bartels, 'Democracy for Realists' (2016); Hibbs "
    "weighted-income model",
    "[PASS2 NEW — CHANGES STRATEGY] Voters weight the election-year economy "
    "far more heavily than earlier years. In a fixed-term game this makes "
    "'let it burn until year 7, then reflate' a genuinely viable and deeply "
    "cynical strategy. That is a real lesson, not an exploit to patch.")

CONFIDENCE_INDEP_PREDICTIVE = P(
    0.1, 0.0, 0.2, "incremental predictive power for consumption BEYOND fundamentals",
    "contested", "Carroll, Fuhrer & Wilcox, 'Does Consumer Sentiment Forecast "
    "Household Spending?', AER 84(5):1397-1408 (1994); Ludvigson JEP 2004; "
    "Bram & Ludvigson FRBNY 1998",
    "[PASS2 NEW] Lags of sentiment do predict consumption, but the "
    "INCREMENTAL power given other indicators is SMALL. Job-availability "
    "questions are the strongest sub-component. Wire consumption only to the "
    "fundamentals-orthogonal RESIDUAL, not to the index level.")

CONFIDENCE_FUNDAMENTAL_LOAD = P(
    0.8, 0.6, 0.95, "share of confidence variance explained by fundamentals",
    "moderate", "Carroll, Fuhrer & Wilcox 1994; Ludvigson 2004",
    "[PASS2] Confidence is mostly an ECHO of income, unemployment, rates and "
    "equity returns. Treat it as near-decoration — do NOT make it a major "
    "driver. The prototype's mood-to-demand channel is the source of the "
    "steady-state drift and is not supported.")


# =====================================================================
# 11. OTHER POLICY LEVERS (not currently dialled, kept for later)
# =====================================================================

MIN_WAGE_OWN_WAGE_ELASTICITY = P(
    -0.13, -0.40, -0.04, "employment elasticity",
    "moderate", "Dube & Zipperer 2024, NBER WP 32925, 72 published studies",
    "Median of published studies. Only ~13% of wage gains offset by job "
    "losses; post-2010 studies cluster near -0.04. Neumark & Wascher contest "
    "with larger magnitudes.")

MIN_WAGE_BITE_THRESHOLD = P(
    0.60, 0.50, 0.65, "minimum as a fraction of the median wage",
    "contested", "inferred from the literature",
    "Below this, employment effects are near-flat; above it, job losses "
    "appear. NONLINEAR — code as a kink, not a slope.")

IMMIGRATION_WAGE_EFFECT = P(
    -0.044, -0.53, 1.03, "elasticity of native wages",
    "contested", "Edo et al. meta-analysis",
    "Meta-mean is negative and tiny; the log-log subsample averages +0.053. "
    "Borjas (skill-cell) finds larger negatives for low-skilled; Card and "
    "Peri (area) find near-zero. THE SPREAD IS THE FINDING.")

IMMIGRATION_SUBSTITUTION_ELASTICITY = P(
    22.0, 13.0, 22.0, "elasticity between native and immigrant labour",
    "moderate", "CEPR DP21326 meta-analysis, 1091 estimates",
    "Correcting for selective reporting raises this from ~13 to ~22, implying "
    "~40% LESS wage pressure than uncorrected results suggest.")

TARIFF_PASSTHROUGH = P(
    1.0, 0.9, 1.0, "fraction passed to domestic prices",
    "strong", "Amiti, Redding & Weinstein 2019; USITC",
    "Near-complete. The importing country pays.")

TARIFF_TO_GDP = P(
    -0.30, -0.30, -0.10, "% GDP for a moderate tariff round",
    "moderate", "CBO 2019; Tax Foundation ~0.25%",
    "[low/high order corrected] Small in 2018 only because tariffed goods "
    "were <2% of US purchases. Scale with coverage. NET INFLATION SIGN IS "
    "CONTESTED — direct price channel (+) versus demand drag (-).")

VAT_TO_CPI = P(
    0.60, 0.50, 0.70, "pp CPI per 1pp VAT",
    "moderate", "IMF WP 18/220", "Step change, not ongoing inflation.")

GOVT_INVESTMENT_MULT_IMPACT = P(
    0.23, 0.10, 0.40, "multiplier on impact", "moderate", "IMF WP 21/272")

GOVT_INVESTMENT_MULT_MEDIUM = P(
    1.1, 0.58, 1.6, "multiplier at 2-5 years", "moderate",
    "IMF WEO 2014; World Bank",
    "Peak ~0.58% at 2 years, up to 1.6% at 5 years in recession. "
    "'Shovel-ready' is largely a myth — model long implementation lags.")

EDUCATION_RETURN = P(
    0.09, 0.07, 0.11, "return per year of schooling per year",
    "moderate", "Psacharopoulos & Patrinos 2018, 1120 estimates, 139 countries",
    "Private return. Quality beats quantity. ~20 year lag to the workforce.")

PUBLIC_RD_TO_PRODUCTIVITY = P(
    0.30, 0.20, 0.40, "% productivity gain at ~7 years",
    "moderate", "Fieldhouse & Mertens 2024",
    "Gross social return estimated 150-200%; skeptics say ~30%.")

HOUSING_SUPPLY_ELASTICITY = P(
    1.0, 0.5, 3.0, "quantity response to a demand shock",
    "strong", "Saiz 2010",
    "San Francisco ~0.66, inland metros >3. DECIDES whether a demand shock "
    "raises PRICES or QUANTITIES. Has declined in the US since the GFC.")

ENERGY_TO_CPI = P(
    0.04, 0.03, 0.05, "pp headline CPI per 10% energy price rise",
    "strong", "Bank of England", "Weight-dependent. Fast, 1-2 months.")

# Retained but UNUSED in v1 — the model is closed-economy. See decision A5 in
# docs/05-handoff.md. Wire these in only when the FX block is built.
FOREIGN_DEMAND_SHOCK_HALFLIFE = P(
    9.0, 6.0, 18.0, "months for an external demand shock to half-decay",
    "moderate", "Trading-partner recessions run 3-5 quarters (NBER/CEPR "
    "chronologies); export orders recover on a similar timescale",
    "[AUDIT docs/07 M1] v1 is closed by decision A5, so net_exports is zero "
    "at rest — but a trading partner falling into recession is still a real "
    "external demand shock, and it is the honest home for the export-slump "
    "event. It has to fade, or one event permanently reprices the economy.")

ERPT_IMPORT_PRICES = P(
    0.50, 0.30, 0.60, "pass-through of the exchange rate to import prices",
    "moderate", "Campa & Goldberg; ECB",
    "UNUSED IN V1. Incomplete and declining in advanced economies.")
ERPT_CPI = P(
    0.15, 0.10, 0.20, "pass-through to CPI", "moderate", "ECB",
    "UNUSED IN V1 — fx_change is pinned to zero.")


# =====================================================================
# 12. LAGS AND KERNELS   (research question 1.4)
#
# Months to PEAK effect. "Peak" means the maximum of the impulse response,
# i.e. the MODE of the kernel — not its mean. See the [PASS2 FIX] note in
# the module docstring, and tests/kernels, which asserts it.
# =====================================================================

LAGS_MONTHS = {
    # [PASS2] Three of these changed. Old values in brackets.
    "rate_to_asset_prices":        1,
    "rate_to_exchange_rate":       3,   # unused in v1 (closed economy)
    # [4th audit A1] The rate the economy FEELS now travels on this, a bank
    # pass-through kernel. Derived from the parameter so there is one copy.
    "rate_to_borrowing_cost": int(RATE_PASSTHROUGH_TO_BORROWERS.value),
    # NOT SCHEDULED ANY MORE, and deliberately kept. This is the published
    # impulse response of investment to a monetary shock, and it is now what
    # the model is MEASURED AGAINST rather than what it is built from
    # (test/transmission.test.js). Scheduling the transmitted rate on it was
    # the A1 defect: a reduced form used as a structural input.
    "rate_to_investment":          9,   # [was 15]
    "rate_to_output":             12,
    "rate_to_unemployment":       18,
    "rate_to_inflation":          18,   # [was 24]
    "qe_to_yield":                 2,
    "spending_to_output":          6,   # [was 3]
    "govt_investment_to_capacity": 36,
    "tax_to_consumption":          3,
    "transfers_to_consumption":    3,
    "tariff_to_prices":            1,
    "energy_to_cpi":               2,
    "autostab_tax":                3,
    "autostab_benefit":            1,
    "immigration_to_labour_force": 6,
    "births_to_labour_force":    240,
    "education_to_workforce":    240,
    "rd_to_productivity":         84,
    "credit_gap_to_crisis":       36,
    "bank_capital_to_lending":    12,
}

# Gamma SHAPE parameter k per channel, from the fitted impulse responses.
# Scale theta is DERIVED so the mode lands on LAGS_MONTHS — never hardcode it.
KERNEL_SHAPE_K = {
    "rate_to_output":      3.0,   # ECB/CEPR 2023 SVAR; Ramey 2016
    "rate_to_inflation":   4.0,   # ECB/CEPR 2023
    "rate_to_investment":  2.5,   # SVAR mediation (arXiv 2509.05284); Bauer-Swanson
    "spending_to_output":  2.0,   # fiscal multiplier consensus
    # Pass-through has a SHORT TAIL, which is the whole point of splitting it
    # off, so k is high: the gamma's mean is k*peak/(k-1), and a low k puts the
    # mean nowhere near the mode. At k=1.6 a "3-month" kernel has a mean lag of
    # 8.1 months and is not a fast channel at all. What the literature actually
    # pins is the CUMULATIVE profile, so that is what this was chosen against:
    # k=5 gives 50% of the pass-through by month 3, 93% by month 6, 100% by
    # month 12, against an ECB/BIS picture of new-business lending rates
    # repricing largely within one to two quarters.
    "rate_to_borrowing_cost": 5.0,
}
KERNEL_DEFAULT_K = 2.5   # judgement, for channels with no fitted IRF


def kernel(channel, horizon=None):
    """Normalised monthly gamma weights for `channel`.

    Returns a list where element m-1 is the SHARE of a shock's total effect
    landing in month m, summing to 1 over the horizon.

    theta is derived as peak / (k - 1) so that the mode — the peak of the
    impulse response, which is what LAGS_MONTHS documents — falls exactly on
    the documented month. The pass-2 report supplied theta = peak / k, which
    is the MEAN and put every peak roughly a third early.

    The horizon defaults to 3x the peak so the tail is captured and the
    normalisation is honest. A fixed horizon truncates the long channels
    (births and education at 240 months, R&D at 84): the weights would still
    sum to 1, but over a window that excludes the peak, silently turning a
    twenty-year lag into a six-year one.
    """
    peak = LAGS_MONTHS[channel]
    if horizon is None:
        horizon = max(48, int(peak * 3))
    k = KERNEL_SHAPE_K.get(channel, KERNEL_DEFAULT_K)
    if k <= 1.0:
        raise ValueError(f"kernel shape k must exceed 1 to have a mode: {channel}")
    theta = peak / (k - 1.0)
    w = [exp((k - 1.0) * log(m) - m / theta - k * log(theta) - lgamma(k))
         for m in range(1, horizon + 1)]
    total = sum(w)
    return [x / total for x in w]


# Labour adjustment asymmetry   (research question 1.5)
# [PASS2] These were the only two bare floats in this file — no range, no
# source. Now sourced. They matter more than the raw lag values.
HIRING_SPEED = P(
    0.25, 0.15, 0.35, "monthly fraction of the desired employment gap closed when EXPANDING",
    "moderate", "Davis & Haltiwanger 1990/1992; Davis, Faberman & "
    "Haltiwanger NBER w12167",
    "Census plant-level gross flows: job CREATION is smoother, less spiky and "
    "slower than destruction.")

FIRING_SPEED = P(
    0.60, 0.45, 0.75, "monthly fraction of the desired employment gap closed when CONTRACTING",
    "moderate", "Davis & Haltiwanger 1990/1992; Caballero & Hammour "
    "('cleansing effect of recessions')",
    "Gross job DESTRUCTION is concentrated and lumpy, spiking in recessions. "
    "Unemployment rises fast and falls slowly, so overshooting a hike takes "
    "years to undo. This asymmetry is most of why monetary policy is hard.")

HIRING_MOMENTUM = P(
    0.5, 0.3, 0.7, "AR(1) persistence of the hiring flow",
    "weak", "Blanchard, Diamond & Hall gross flows (Brookings 1990)",
    "[PASS2] CONFIRMS hiring_momentum as the correct representation, over a "
    "pure asymmetric-speed model with no persistence. Recoveries are slow "
    "because hiring rebuilds gradually.")


# =====================================================================
# 13. UNKNOWNS
# No defensible number exists. Values here are GUESSES, labelled as such.
# Do not present them to the player as facts — use them as the model's
# honesty feature: show a range and say economists disagree.
#
# [PASS2] Eight of the original fourteen entries are now RESOLVED and have
# moved into the sections above. What remains is genuinely open.
# =====================================================================

UNKNOWNS = {
    "growth_expectations":
        "Distinct from inflation expectations and currently absent. Feeds "
        "investment (via expected returns) and asset prices (via "
        "expected_earnings_growth, which the pass-2 asset equation references "
        "without ever defining). Needed before the asset-price cash-flow "
        "channel can be coded honestly. Interim: proxy with a slow moving "
        "average of realised output growth, labelled judgement.",

    "asset_price_fundamental_anchor":
        "The pass-2 mean-reversion term reverts toward `fundamental`, which "
        "was never specified. Options: a Gordon-growth value from earnings "
        "and the discount rate; a long moving average of the index; or a "
        "constant times potential output. Interim: potential output scaled to "
        "the steady-state index. This choice determines what a bubble is "
        "measured against, so it deserves a proper answer.",

    "bond_yield_panic_term":
        "The pass-2 yield equation declares `panic[t]` for self-fulfilling "
        "repricing and never specifies it. Interim: switch on when projected "
        "interest cost breaches a share of revenue, with a jump proportional "
        "to the breach. This is the debt-crisis ending's trigger, so it needs "
        "a real answer eventually.",

    "hysteresis_in_ordinary_recessions":
        "Cerra-Saxena covers CRISES. Whether a garden-variety recession "
        "permanently scars potential output is contested, and the answer "
        "changes how punishing the game feels. Interim: no scarring outside "
        "financial crises.",

    "elb_plus_unanchored_expectations":
        "The genuine nightmare: at the lower bound WITH unanchored "
        "expectations, no dial works. The model can represent it but nobody "
        "has established what actually resolves it, or what the historical "
        "precedents imply. Worth a targeted pass — it is the most interesting "
        "unwinnable state in the design.",

    "validation_target_paths":
        "Pass 2 gave scenario STARTING vectors but no target PATHS. Without "
        "'the model should reproduce roughly X over Y years', there is no way "
        "to know whether the assembled system is right — only whether it is "
        "stable. This is the largest remaining gap and it is not a "
        "coefficient, it is a test suite.",

    "reserve_requirements_advanced":
        "Effectively defunct — the US set them to 0% in 2020. Model only for "
        "an EM scenario, or drop the lever. RESOLVED: dropped.",

    "employment_protection_to_unemployment_level":
        "Essentially unidentified. EPL affects FLOWS more than the "
        "equilibrium level. RESOLVED: code as ~0 on the level.",

    "wealth_tax_macro_effects":
        "Unidentified. Model as a revenue lever with a high behavioural "
        "(realisation-timing) elasticity and a small output effect. Deferred "
        "— not a dial in v1.",

    "fertility_response_to_family_policy":
        "Unidentified elasticity. Pronatalist policy shifts the TIMING of "
        "births more than the completed total. Deferred.",

    "retirement_age_magnitude":
        "Direction clear and strong; no clean elasticity. Calibrate to your "
        "pension system and label it judgement. Deferred.",

    "union_coverage_and_regulation_effects":
        "No usable magnitudes. Direction only. Deferred.",

    "capital_controls":
        "No magnitude. Model as a volatility damper whose effectiveness "
        "decays over time. Deferred — closed economy in v1.",
}


# =====================================================================
# 14. VALIDATION
# Runs at import. Cheap, and it catches the class of error that produced
# two inverted ranges in the pass-2 report.
# =====================================================================

CONFIDENCE_LEVELS = {"strong", "moderate", "weak", "contested", "judgement"}


# =====================================================================
# DELIBERATELY UNREAD PARAMETERS
#
# [AUDIT docs/07 F1] 46 of 108 parameters were never read by any rule, with
# no way to tell "not built yet" from "quietly dropped on the floor". Every
# such parameter must now be listed here with a reason, and
# test/params.test.js enforces the register in BOTH directions:
#
#   - a parameter unread in src/ but missing from this list        -> FAIL
#   - a parameter listed here but actually read by a rule          -> FAIL
#
# So wiring one up forces you to delete its entry, and dropping one forces
# you to justify it. Categories, deliberately few:
#
#   validation target  a reduced form the assembled model is CHECKED against
#                      (test/validation.test.js), never a model term. Using
#                      it as a term alongside the structural block would
#                      count the same channel twice — decision A3.
#   consumed via START the value reaches the model through the START vector;
#                      test/params.test.js asserts the two agree.
#   deferred lever     a real mechanism the design has postponed. Named in
#                      docs, no dial yet.
#   superseded         the mechanism exists, carried by a different term.
# =====================================================================

DEFERRED = {
    # --- validation targets (decision A3; checked in test/validation.test.js)
    "FISCAL_MULT_EXPANSION": "validation target",
    "FISCAL_MULT_NORMAL": "validation target",
    "FISCAL_MULT_RECESSION": "validation target",
    "TAX_MULT_ACCOMMODATIVE": "validation target",
    "TAX_MULT_TIGHT": "validation target",
    "TRANSFER_MULT_RECESSION": "validation target",
    "TRANSFER_MULT_EXPANSION": "validation target",
    "TAX_SHOCK_TO_GDP": "validation target",
    "PERSONAL_TAX_RATE_TO_GDP": "validation target",
    "RATE_TO_OUTPUT": "validation target",
    "RATE_TO_INFLATION": "validation target",
    "AUTO_STABILISER_ABSORPTION": "validation target",
    "QE_TO_GDP":
        "validation target — QE reaches the model through QE_TO_YIELD and the "
        "portfolio-balance channel, not through a direct output coefficient",
    "BANK_CAPITAL_TO_GDP": "validation target",
    "CORPORATE_TAX_RATE_TO_GDP":
        "validation target for a deferred lever — there is one tax dial, and "
        "it is the personal rate. A corporate rate is the natural second one "
        "because it moves investment rather than consumption.",
    "GOVT_INVESTMENT_MULT_IMPACT": "validation target for a deferred lever",
    "GOVT_INVESTMENT_MULT_MEDIUM": "validation target for a deferred lever",

    # --- consumed via START
    "SS_POTENTIAL_GROWTH": "consumed via START",
    "SS_R_STAR": "consumed via START",
    "SS_NAIRU": "consumed via START",
    "SS_POLICY_RATE": "consumed via START",
    "SS_TERM_PREMIUM": "consumed via START",
    "SS_YIELD_10Y": "consumed via START",
    "SS_CREDIT_GDP": "consumed via START",
    "SS_LABOUR_SHARE": "consumed via START",
    "SS_K_OVER_Y": "consumed via START",
    "SS_DEPRECIATION": "consumed via START (DEPRECIATION_RATE is the law of motion)",

    # --- consumed via LAGS_MONTHS
    "RATE_PASSTHROUGH_TO_BORROWERS":
        "consumed via LAGS_MONTHS['rate_to_borrowing_cost'], which is built "
        "from it so there is exactly one copy of the number. The kernel it "
        "generates is scheduled by applyDialChange on every policy_rate move, "
        "so this is a live structural input, not an idle one — it is listed "
        "here for the same reason the SS_* anchors are.",

    # --- deferred levers: real mechanisms, no dial yet
    "GOVT_INVESTMENT_MULT_SPLIT_PLACEHOLDER": None,   # removed below; see cleanup
    "MIN_WAGE_OWN_WAGE_ELASTICITY": "deferred lever: minimum wage",
    "MIN_WAGE_BITE_THRESHOLD": "deferred lever: minimum wage",
    "IMMIGRATION_WAGE_EFFECT": "deferred lever: immigration",
    "IMMIGRATION_SUBSTITUTION_ELASTICITY": "deferred lever: immigration",
    "TARIFF_PASSTHROUGH": "deferred lever: tariffs (also needs the open economy)",
    "TARIFF_TO_GDP": "deferred lever: tariffs (also needs the open economy)",
    "VAT_TO_CPI": "deferred lever: indirect tax",
    "EDUCATION_RETURN": "deferred lever: education spending (20-year lag)",
    "PUBLIC_RD_TO_PRODUCTIVITY": "deferred lever: public R&D (7-year lag)",
    "HOUSING_SUPPLY_ELASTICITY": "deferred lever: housing supply",
    "ERPT_IMPORT_PRICES": "deferred: open economy, decision A5",
    "ERPT_CPI": "deferred: open economy, decision A5",

    # --- superseded
    "FINANCIAL_ACCELERATOR_STRENGTH":
        "superseded — the external finance premium enters investment once, "
        "through credit_spread in user_cost. See docs/07 section C.",

    # --- open conflict, deliberately left unwired
    "ENERGY_TO_CPI":
        "CONFLICT, see CONFLICTS below — wiring it as stated would shrink the "
        "oil shock tenfold, and which of the two numbers is wrong is a "
        "research decision, not a wiring one.",
}
DEFERRED.pop("GOVT_INVESTMENT_MULT_SPLIT_PLACEHOLDER")


# Parameters whose stated value disagrees with how the model behaves, where
# resolving the disagreement needs research rather than wiring. Never a
# licence to leave the disagreement unstated: it is surfaced in docs/07 and
# test/validation.test.js asserts each entry is still unresolved.
CONFLICTS = {
    "ENERGY_TO_CPI":
        "0.04pp of headline CPI per 10% energy rise makes the ~60% spike in "
        "the oil-shock event worth 0.24pp. events.js has always used 2.4pp — "
        "exactly 10x more. Energy is roughly 7% of an advanced-economy CPI "
        "basket, so a 60% spike is several pp of direct headline effect, "
        "which says 0.04 is a transcription error for 0.4. It is NOT "
        "corrected here, because this project's standing rule is that a "
        "parameter disagreement is a finding to surface rather than a number "
        "to adjust to fit the model. The event keeps its 2.4pp and points at "
        "this entry; resolving it needs a look at the source.",
}


def validate():
    """Check every P in this module. Returns a list of problem strings."""
    problems = []
    for name, p in sorted(globals().items()):
        if not isinstance(p, P):
            continue
        if not (p.low <= p.value <= p.high):
            problems.append(
                f"{name}: value {p.value} outside range [{p.low}, {p.high}] "
                f"— low/high may be inverted")
        if p.confidence not in CONFIDENCE_LEVELS:
            problems.append(f"{name}: unknown confidence '{p.confidence}'")
        if not p.unit.strip():
            problems.append(f"{name}: missing unit (this is always a bug)")
        if not p.source.strip():
            problems.append(f"{name}: missing source")
    for channel in KERNEL_SHAPE_K:
        if channel not in LAGS_MONTHS:
            problems.append(f"KERNEL_SHAPE_K['{channel}'] has no entry in LAGS_MONTHS")
    for name in sorted(SOLVED_FROM_MODEL):
        p = globals().get(name)
        if not isinstance(p, P):
            problems.append(f"SOLVED_FROM_MODEL lists '{name}', which is not a parameter")
            continue
        if p.confidence != "judgement":
            problems.append(
                f"{name} is solved from the model but its confidence is "
                f"'{p.confidence}'. A value defined by a solve is not an estimate "
                f"of anything; it must be labelled judgement.")
        if "DERIVED FROM THIS MODEL" not in p.source:
            problems.append(
                f"{name} is in SOLVED_FROM_MODEL but its source does not say "
                f"'DERIVED FROM THIS MODEL'. The register and the parameter have "
                f"to agree or one of them is lying.")
    # The other direction, like DEFERRED: a parameter that says it is derived
    # from the model must be in the register.
    for name, p in sorted(globals().items()):
        if isinstance(p, P) and "DERIVED FROM THIS MODEL" in p.source \
                and name not in SOLVED_FROM_MODEL:
            problems.append(
                f"{name}'s source says DERIVED FROM THIS MODEL but it is not in "
                f"SOLVED_FROM_MODEL. Anything solved from the model has to be "
                f"declared, or a test that checks it looks like validation.")
    for name in sorted(DEFERRED):
        if not isinstance(globals().get(name), P):
            problems.append(f"DEFERRED lists '{name}', which is not a parameter")
        if not (DEFERRED[name] or "").strip():
            problems.append(f"DEFERRED['{name}'] has no reason")
    for name in sorted(CONFLICTS):
        if not isinstance(globals().get(name), P):
            problems.append(f"CONFLICTS lists '{name}', which is not a parameter")
    return problems


_problems = validate()
if _problems:
    raise ValueError(
        "parameters.py failed validation:\n  " + "\n  ".join(_problems))
