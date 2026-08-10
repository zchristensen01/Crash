#!/usr/bin/env python3
"""
ECON SANDBOX
============
A tiny economy you run for 10 years. Four dials, five gauges, one crash meter.
Push it too hard in any direction and the whole thing falls over.

Run:  python3 econ_sandbox.py
No installs needed.

HOW THIS FILE IS ORGANISED (read this before adding anything)
------------------------------------------------------------
  1. CONFIG      - every assumption is a number here. Nothing is hardcoded below.
  2. INDICATORS  - the gauges on screen. Add a dict -> new gauge appears.
  3. DIALS       - the things you control. Add a dict -> new command works.
  4. RULES       - the economy itself, one small function per idea, run in order.
  5. EVENTS      - random shocks. Add a dict -> it can now happen.
  6. GAME_OVERS  - ways to lose. Add a dict -> new way to lose.
  7. The screen + game loop. You almost never need to touch this.

To add a feature you edit ONE list. That's the whole design.
"""

import random

# =====================================================================
# 1. CONFIG
# Every number that makes the economy behave the way it does.
# Change these and the economy changes its personality. This is a
# feature: economists genuinely argue about most of these values.
# =====================================================================

CONFIG = {
    # --- what "normal" looks like ---
    "neutral_rate": 3.0,          # interest rate that neither helps nor hurts
    "target_inflation": 2.0,      # what central banks aim for
    "natural_unemployment": 5.0,  # unemployment when the economy is balanced
    "base_tax": 25.0,             # starting tax take, % of the economy
    "base_spend": 25.0,           # starting govt spending, % of the economy

    # --- how strongly each dial moves demand (in % of the economy) ---
    "k_rate": 1.2,     # per 1 point the rate sits BELOW neutral
    "k_tax": 0.50,     # per 1 point of tax ABOVE base (negative effect)
    "k_spend": 0.70,   # per 1 point of spending ABOVE base
    "k_print": 1.00,   # per 1% of GDP printed
    "k_mood": 0.05,    # per 1 point of public mood above 60

    # --- how demand turns into inflation ---
    # TWO slopes, not one. Which applies depends on whether people still
    # believe you'll hit target. Anchored ~0.05 (Cleveland Fed time-varying
    # estimates); unanchored ~0.20 (Hazell et al.; IMF WP 2023/100).
    # This switch is the most important thing in the model.
    "kappa_anchored": 0.05,     # pp inflation per 1% output gap, credible CB
    "kappa_unanchored": 0.20,   # ...once nobody believes the target any more
    "k_print_inflation": 1.50,  # printing money hits prices directly too

    # --- credibility ---
    "credibility_decay": 0.02,    # per quarter, per pp of inflation miss > 2
    "credibility_repair": 0.010,  # per quarter when inflation is near target
    "expectation_speed": 0.30,    # how fast expectations move at all

    # --- how demand turns into jobs (Okun's law) ---
    "k_okun": 50.0,

    # --- speed limits ---
    "rate_lag": 3,               # quarters before a rate change is felt
    "capacity_growth": 0.005,    # ~2%/year of real growth potential
    "max_overheat": 0.04,        # you can only exceed capacity by so much

    # --- danger ---
    # Crash risk is driven by the credit-to-GDP gap: private credit as a
    # share of GDP, minus its own slow trend. This is the BIS early-warning
    # indicator (Borio & Lowe 2002; Aldasoro/Borio/Drehmann 2018), not
    # something invented for the game.
    "credit_gap_warn": 3.0,       # pp above trend — catches ~76% of crises
    "credit_gap_danger": 9.0,     # pp — BIS optimal threshold, ~66% of crises
    "credit_gap_1sd": 6.0,        # pp, roughly one standard deviation
    "crisis_prob_per_sd": 3.5,    # pp of annual crisis probability per 1 SD
                                  # (Schularick & Taylor 2012)
    "credit_trend_speed": 0.02,   # slow one-sided trend, approximates the
                                  # HP filter with lambda = 400,000
    "quarters_to_survive": 40,    # 10 years
}


# =====================================================================
# 2. INDICATORS  -- the gauges
# Add a dict here and it shows up on screen automatically.
# =====================================================================

INDICATORS = [
    {
        "label": "Growth",
        "get": lambda s: s["growth"],
        "fmt": "{:+.1f}%",
        "range": (-8, 8),
        "verdict": lambda v: ("booming" if v > 4 else "healthy" if v > 1
                              else "sluggish" if v > 0 else "SHRINKING"),
        "help": "How much more stuff the country made this year than last.",
    },
    {
        "label": "Inflation",
        "get": lambda s: s["inflation"],
        "fmt": "{:.1f}%",
        "range": (-3, 15),
        "verdict": lambda v: ("DEFLATION" if v < 0 else "cold" if v < 1
                              else "on target" if v < 3 else "running hot"
                              if v < 6 else "OUT OF CONTROL"),
        "help": "How fast prices are rising. 2% is the goal. Above 6% people panic.",
    },
    {
        "label": "Unemployment",
        "get": lambda s: s["unemployment"],
        "fmt": "{:.1f}%",
        "range": (0, 18),
        "verdict": lambda v: ("very tight" if v < 4 else "healthy" if v < 6.5
                              else "painful" if v < 9 else "CRISIS"),
        "help": "Share of people who want a job and can't get one.",
    },
    {
        "label": "Govt debt",
        "get": lambda s: s["debt"],
        "fmt": "{:.0f}%",
        "range": (0, 250),
        "verdict": lambda v: ("low" if v < 60 else "fine" if v < 100
                              else "heavy" if v < 160 else "DANGEROUS"),
        "help": "Everything the government owes, as a % of one year's economy.",
    },
    {
        "label": "Public mood",
        "get": lambda s: s["mood"],
        "fmt": "{:.0f}",
        "range": (0, 100),
        "verdict": lambda v: ("thrilled" if v > 80 else "content" if v > 55
                              else "grumbling" if v > 30 else "FURIOUS"),
        "help": "How people feel. Hits zero and you're out of a job.",
    },
]


# =====================================================================
# 3. DIALS  -- what the player controls
# Add a dict here and the command works immediately.
# =====================================================================

DIALS = [
    {
        "key": "rate", "cmd": "rate", "min": 0.0, "max": 20.0, "unit": "%",
        "help": "Interest rate. LOW = cheap loans, more spending, more inflation.\n"
                "         HIGH = expensive loans, cools everything down, costs jobs.\n"
                "         Takes about 3 quarters to actually bite.",
    },
    {
        "key": "tax", "cmd": "tax", "min": 0.0, "max": 70.0, "unit": "%",
        "help": "Tax rate. HIGH = less money in people's pockets, but pays down debt.\n"
                "         LOW = people spend more, but the deficit grows.",
    },
    {
        "key": "spend", "cmd": "spend", "min": 0.0, "max": 70.0, "unit": "%",
        "help": "Government spending. Directly adds demand. Paid for by tax,\n"
                "         debt, or printing - you choose which.",
    },
    {
        "key": "printing", "cmd": "print", "min": 0.0, "max": 15.0, "unit": "%",
        "help": "Print money to pay for spending. Free money, no debt!\n"
                "         Try it. Watch what happens. This is the lesson.",
    },
]


# =====================================================================
# 4. RULES  -- the economy
# Each function reads the state and updates it. They run in this order,
# once per quarter. Add a function, add it to the list, done.
# Each one logs its own breakdown so the `why` command can explain it.
# =====================================================================

def rule_demand(s):
    """How much stuff people WANT to buy, vs how much we CAN make."""
    c = CONFIG
    lagged_rate = s["rate_history"][-c["rate_lag"]]
    terms = {
        "cheap money (rate below neutral)": c["k_rate"] * (c["neutral_rate"] - lagged_rate),
        "tax level": -c["k_tax"] * (s["tax"] - c["base_tax"]),
        "government spending": c["k_spend"] * (s["spend"] - c["base_spend"]),
        "money printing": c["k_print"] * s["printing"],
        "public confidence": c["k_mood"] * (s["mood"] - 60),
    }
    s["gap"] = sum(terms.values()) / 100.0
    s["log"]["Demand vs. capacity"] = dict(terms, **{
        "= TOTAL (% above what we can make)": sum(terms.values())})


def rule_capacity(s):
    """How much the country COULD make. Grows slowly. This is the real limit."""
    c = CONFIG
    lagged_rate = s["rate_history"][-c["rate_lag"]]
    g = (c["capacity_growth"]
         + 0.0008 * (c["neutral_rate"] - lagged_rate)   # cheap money -> investment
         - 0.0006 * max(0, s["inflation"] - 4))         # chaos -> nobody invests
    s["capacity"] *= (1 + g)


def rule_output(s):
    """Actual production. Can't exceed capacity by much, no matter the demand."""
    realized = min(s["gap"], CONFIG["max_overheat"])
    new_output = s["capacity"] * (1 + realized)
    s["output"] = new_output
    # Year-over-year, the way real GDP figures are actually reported.
    # Annualising a single quarter makes one-off shocks look like 10% booms.
    s["output_history"].append(new_output)
    if len(s["output_history"]) > 5:
        s["output_history"].pop(0)
    s["growth"] = (new_output / s["output_history"][0] - 1) * 100


def rule_inflation(s):
    """
    Too much money chasing too few goods -- but the demand channel is far
    weaker than most people assume, UNLESS credibility has broken.
    """
    c = CONFIG
    # The slope itself depends on whether the target is still believed.
    kappa = (c["kappa_anchored"]
             + (c["kappa_unanchored"] - c["kappa_anchored"]) * (1 - s["credibility"]))
    terms = {
        "what people already expect": s["expected_inflation"],
        "demand beyond what we can make": kappa * s["gap"] * 100,
        "money printing": c["k_print_inflation"] * s["printing"],
    }
    s["inflation"] = max(-4.0, sum(terms.values()))
    s["log"]["Inflation"] = dict(terms, **{
        "(slope in use)": kappa,
        "= TOTAL": s["inflation"]})


def rule_expectations(s):
    """
    Where expectations settle. With a credible central bank they drift back
    to target on their own. Without one they chase whatever inflation just
    did -- and that is the spiral.
    """
    c = CONFIG
    to_target = c["expectation_speed"] * s["credibility"]
    to_actual = c["expectation_speed"] * (1 - s["credibility"])
    s["expected_inflation"] = (
        (1 - to_target - to_actual) * s["expected_inflation"]
        + to_target * c["target_inflation"]
        + to_actual * s["inflation"])
    s["log"]["Where expectations are heading"] = {
        "pulled toward the 2% target": to_target,
        "pulled toward actual inflation": to_actual,
    }


def rule_credibility(s):
    """
    Credibility is slow to build and quick to lose. It is the only thing
    that makes inflation cheap to control.
    """
    c = CONFIG
    miss = abs(s["inflation"] - c["target_inflation"])
    if miss > 2.0:
        s["credibility"] -= c["credibility_decay"] * (miss - 2.0)
    else:
        s["credibility"] += c["credibility_repair"] * (1 - s["credibility"])
    s["credibility"] = clamp(s["credibility"], 0.0, 1.0)


def rule_credit(s):
    """
    Private borrowing as a share of GDP, and how far it has run above its
    own trend. Cheap money and confidence push it up; it does not pull
    itself back down. That is exactly the problem.
    """
    c = CONFIG
    lagged_rate = s["rate_history"][-c["rate_lag"]]
    growth = (0.45 * (c["neutral_rate"] - lagged_rate)
              + 0.02 * (s["mood"] - 60)
              - 0.10 * max(0, s["inflation"] - 4))
    s["credit"] = max(50.0, s["credit"] + growth)
    s["credit_trend"] += c["credit_trend_speed"] * (s["credit"] - s["credit_trend"])
    s["credit_gap"] = s["credit"] - s["credit_trend"]
    s["log"]["Credit gap"] = {
        "borrowing this quarter": growth,
        "credit (% of GDP)": s["credit"],
        "its slow trend": s["credit_trend"],
        "= GAP above trend (pp)": s["credit_gap"],
    }


def rule_unemployment(s):
    """Weak demand means fewer jobs. Moves slowly."""
    target = CONFIG["natural_unemployment"] - CONFIG["k_okun"] * s["gap"]
    target = max(1.5, target)
    s["unemployment"] = 0.6 * s["unemployment"] + 0.4 * target


def rule_debt(s):
    """Government books. Note: inflation quietly shrinks old debt."""
    revenue = s["tax"] * (s["output"] / s["capacity"]) / 4
    interest = s["debt"] * (s["rate"] / 100) / 4
    spending = s["spend"] / 4
    printed = s["printing"] / 4
    deficit = spending + interest - revenue - printed
    nominal_growth = (s["growth"] + s["inflation"]) / 400
    s["debt"] = max(0.0, s["debt"] * (1 - nominal_growth) + deficit)
    s["log"]["Debt change"] = {
        "spending": spending,
        "interest on existing debt": interest,
        "tax revenue": -revenue,
        "paid by printing": -printed,
        "eroded by growth + inflation": -s["debt"] * nominal_growth,
    }


def rule_mood(s):
    """How people feel about you. Your health bar."""
    terms = {
        "growth": 0.6 * s["growth"],
        "inflation pain": -1.3 * max(0, s["inflation"] - 3),
        "unemployment pain": -1.6 * max(0, s["unemployment"] - 6),
        "tax resentment": -0.08 * (s["tax"] - CONFIG["base_tax"]),
        "drift back to normal": 0.10 * (60 - s["mood"]),
    }
    s["mood"] = clamp(s["mood"] + sum(terms.values()), 0, 100)
    s["log"]["Public mood change"] = terms


def rule_crash_risk(s):
    """
    Crashes come from credit running above its own trend -- not from
    inflation or unemployment, which are symptoms rather than causes.
    The credit-to-GDP gap is the BIS early-warning indicator, and the
    probability below is Schularick & Taylor's, not one I made up.
    """
    c = CONFIG
    if s["rate"] < c["neutral_rate"] - 1:
        s["cheap_money"] += 1
    else:
        s["cheap_money"] = max(0, s["cheap_money"] - 2)

    excess = max(0.0, s["credit_gap"] - c["credit_gap_warn"])
    annual_prob = c["crisis_prob_per_sd"] * (excess / c["credit_gap_1sd"])
    s["crash_risk"] = clamp(annual_prob, 0, 60)
    s["log"]["Crash risk"] = {
        "credit gap above trend (pp)": s["credit_gap"],
        "of which counts as excess": excess,
        "= annual crisis probability (%)": s["crash_risk"],
    }

    if random.random() < s["crash_risk"] / 100 / 4:
        s["over"] = {
            "title": "FINANCIAL CRASH",
            "lesson": ("Borrowing had run far above trend for years. Nothing in\n"
                       "  that loop pulls itself back -- rising asset values let people\n"
                       "  borrow more, which raises asset values again. Growth, jobs and\n"
                       "  inflation all looked fine the whole time. The credit gap was\n"
                       "  the only gauge that was warning you."),
        }


RULES = [
    rule_demand,
    rule_capacity,
    rule_output,
    rule_inflation,
    rule_expectations,
    rule_credibility,
    rule_unemployment,
    rule_debt,
    rule_mood,
    rule_credit,
    rule_crash_risk,
]


# =====================================================================
# 5. EVENTS  -- random shocks
# `when` decides if it's possible, `chance` how likely, `apply` what it does.
# =====================================================================

EVENTS = [
    {
        "name": "Oil price spike",
        "chance": 0.05,
        "when": lambda s: True,
        "apply": lambda s: (s.__setitem__("expected_inflation", s["expected_inflation"] + 2.5),
                            s.__setitem__("mood", s["mood"] - 5)),
        "text": "Oil prices jump. Everything that moves costs more. Inflation up, and\n"
                "  cooling it with rates would cost jobs. There's no clean answer here.",
    },
    {
        "name": "Tech boom",
        "chance": 0.04,
        "when": lambda s: True,
        "apply": lambda s: (s.__setitem__("capacity", s["capacity"] * 1.02),
                            s.__setitem__("mood", s["mood"] + 4)),
        "text": "A wave of new tech lands. The country can genuinely make more now -\n"
                "  which means more demand WITHOUT more inflation. This is free real estate.",
    },
    {
        "name": "Bank wobble",
        "chance": 0.05,
        "when": lambda s: s["crash_risk"] > 30,
        "apply": lambda s: (s.__setitem__("mood", s["mood"] - 12),
                            s.__setitem__("crash_risk", s["crash_risk"] + 10)),
        "text": "A mid-sized bank nearly fails. Nothing broke yet, but confidence took\n"
                "  a hit and everyone is now looking for the next weak spot.",
    },
    {
        "name": "Export slump",
        "chance": 0.05,
        "when": lambda s: True,
        "apply": lambda s: (s.__setitem__("mood", s["mood"] - 6),
                            s.__setitem__("capacity", s["capacity"] * 0.995)),
        "text": "Your biggest trading partner hits a recession and stops buying.",
    },
    {
        "name": "Workers arrive",
        "chance": 0.04,
        "when": lambda s: s["unemployment"] < 5,
        "apply": lambda s: s.__setitem__("capacity", s["capacity"] * 1.015),
        "text": "Word gets out that there's work here. More workers means the country\n"
                "  can make more - capacity up, and inflation pressure eases.",
    },
]


# =====================================================================
# 6. GAME_OVERS  -- ways to lose
# =====================================================================

GAME_OVERS = [
    {
        "test": lambda s: s["inflation"] > 20,
        "title": "HYPERINFLATION",
        "lesson": ("Money stopped meaning anything. Once people EXPECT high inflation\n"
                   "  they price it in ahead of time, and it feeds itself. You have to\n"
                   "  break expectations early, and it always hurts to do it."),
    },
    {
        "test": lambda s: s["unemployment"] > 15,
        "title": "DEPRESSION",
        "lesson": ("You squeezed demand so hard the jobs went with it. Unemployment is\n"
                   "  slow to rise and slow to fall - by the time you see it, you're\n"
                   "  already three quarters late."),
    },
    {
        "test": lambda s: s["debt"] > 250,
        "title": "DEBT CRISIS",
        "lesson": ("Nobody will lend to you any more. Watch the interest line in `why` -\n"
                   "  high debt plus high rates means the debt grows on its own, and\n"
                   "  raising rates to fight inflation makes it worse."),
    },
    {
        "test": lambda s: s["mood"] <= 3,
        "title": "THROWN OUT OF OFFICE",
        "lesson": ("The numbers may have been recovering. People vote on how the last\n"
                   "  year FELT, not on your five-year plan. That constraint is real and\n"
                   "  it's why good policy often doesn't happen."),
    },
]


# =====================================================================
# 7. SCREEN + GAME LOOP  (you rarely need to touch anything below)
# =====================================================================

def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def bar(value, lo, hi, width=22):
    frac = clamp((value - lo) / (hi - lo), 0, 1)
    filled = int(round(frac * width))
    return "█" * filled + "░" * (width - filled)


def new_game():
    return {
        "quarter": 0,
        "capacity": 100.0, "output": 100.0,
        "output_history": [100.0] * 5,
        "rate": CONFIG["neutral_rate"],
        "tax": CONFIG["base_tax"],
        "spend": CONFIG["base_spend"],
        "printing": 0.0,
        "inflation": 2.0, "expected_inflation": 2.0,
        "credibility": 0.85,
        "credit": 150.0, "credit_trend": 150.0, "credit_gap": 0.0,
        "unemployment": CONFIG["natural_unemployment"],
        "debt": 60.0, "mood": 70.0, "crash_risk": 0.0,
        "growth": 2.0, "gap": 0.0,
        "rate_history": [CONFIG["neutral_rate"]] * (CONFIG["rate_lag"] + 1),
        "cheap_money": 0,
        "log": {}, "over": None,
        "message": "You've just been handed the economy. Survive 10 years.\n"
                   "  Type `help` if you have no idea what any of this means.",
    }


def step(s):
    s["quarter"] += 1
    s["rate_history"].append(s["rate"])
    s["log"] = {}
    s["message"] = ""

    for rule in RULES:
        rule(s)

    for ev in EVENTS:
        if ev["when"](s) and random.random() < ev["chance"]:
            ev["apply"](s)
            s["message"] = f"[ {ev['name']} ]\n  {ev['text']}"
            break

    if s["over"] is None:
        for go in GAME_OVERS:
            if go["test"](s):
                s["over"] = go
                break


def draw(s):
    print("\033[2J\033[H", end="")
    year, q = divmod(s["quarter"], 4)
    print("=" * 62)
    print(f"  ECON SANDBOX        Year {year + 1}, Q{q + 1}"
          f"        quarter {s['quarter']}/{CONFIG['quarters_to_survive']}")
    print("=" * 62 + "\n")

    for ind in INDICATORS:
        v = ind["get"](s)
        lo, hi = ind["range"]
        print(f"  {ind['label']:<14}{ind['fmt'].format(v):>7}  "
              f"{bar(v, lo, hi)}  {ind['verdict'](v)}")

    print()
    gap = s["credit_gap"]
    risk = s["crash_risk"]
    if gap < CONFIG["credit_gap_warn"]:
        verdict = "borrowing near trend"
    elif gap < CONFIG["credit_gap_danger"]:
        verdict = f"above trend — ~{risk:.0f}% crisis chance/yr"
    else:
        verdict = f"PAST THE 9pp DANGER LINE — ~{risk:.0f}%/yr"
    print(f"  {'Credit gap':<14}{gap:>6.1f}pp  {bar(gap, -5, 15)}  {verdict}")
    print(f"  {'Credibility':<14}{s['credibility']:>7.2f}  "
          f"{bar(s['credibility'], 0, 1)}  "
          f"{'anchored' if s['credibility'] > 0.7 else 'SLIPPING' if s['credibility'] > 0.4 else 'LOST'}")

    print("\n  " + "-" * 58)
    dials = "   ".join(
        f"{d['cmd']} {s[d['key']]:.4g}{d['unit']}" for d in DIALS)
    print(f"  YOUR DIALS:  {dials}")
    print("  " + "-" * 58)

    if s["message"]:
        print(f"\n  {s['message']}")

    print("\n  [Enter] next quarter   `why`   `help`   `quit`")


def show_why(s):
    print("\n  WHY THINGS MOVED LAST QUARTER")
    print("  " + "=" * 56)
    for section, terms in s["log"].items():
        print(f"\n  {section}:")
        for name, val in terms.items():
            print(f"     {name:<42}{val:>+8.2f}")
    print("\n  (These are the actual numbers the model added up. Nothing hidden.)")
    input("\n  [Enter] to go back ")


def show_help():
    print("\033[2J\033[H", end="")
    print("  HOW TO PLAY")
    print("  " + "=" * 56)
    print("\n  You run the economy for 10 years. Type a command, press Enter.")
    print("  Press Enter on its own to advance one quarter.\n")
    for d in DIALS:
        print(f"  {d['cmd']} <number>   ({d['min']}-{d['max']}{d['unit']})")
        print(f"         {d['help']}\n")
    print("  WHAT THE GAUGES MEAN")
    print("  " + "-" * 56)
    for ind in INDICATORS:
        print(f"  {ind['label']:<14} {ind['help']}")
    print(f"\n  {'Credit gap':<14} How far private borrowing has run above its own")
    print(f"  {'':<14} trend. Above 3pp is a warning, above 9pp is the BIS")
    print(f"  {'':<14} danger line. This is the ONLY gauge that sees a")
    print(f"  {'':<14} crash coming - the others all look fine until it hits.")
    print(f"  {'Credibility':<14} Whether people still believe you'll hit 2%. While")
    print(f"  {'':<14} it holds, inflation barely responds to demand. Once")
    print(f"  {'':<14} it goes, expectations chase actual inflation and the")
    print(f"  {'':<14} whole thing spirals. Slow to rebuild.")
    print("\n  TRY THIS FIRST: set `print 5` and advance a few quarters.")
    print("  Then read `why`. That is the whole 'why can't we just print money'")
    print("  question, answered in numbers you can watch move.")
    print("\n  THEN TRY: set `rate 0.5` and leave it there for eight years while")
    print("  everything looks healthy. Watch the credit gap only.")
    input("\n  [Enter] to go back ")


def handle(s, raw):
    parts = raw.strip().lower().split()
    if not parts:
        return "step"
    cmd = parts[0]
    if cmd in ("quit", "q", "exit"):
        return "quit"
    if cmd in ("why", "w"):
        show_why(s)
        return "redraw"
    if cmd in ("help", "h", "?"):
        show_help()
        return "redraw"
    for d in DIALS:
        if cmd == d["cmd"]:
            try:
                val = clamp(float(parts[1]), d["min"], d["max"])
            except (IndexError, ValueError):
                s["message"] = f"Usage: {d['cmd']} <number>"
                return "redraw"
            s[d["key"]] = val
            s["message"] = f"{d['cmd']} set to {val:g}{d['unit']}."
            return "redraw"
    s["message"] = f"Don't know `{cmd}`. Try `help`."
    return "redraw"


def game_over(s, won=False):
    print("\033[2J\033[H", end="")
    if won:
        print("\n  " + "=" * 56)
        print("  YOU MADE IT. Ten years, no collapse.")
        print("  " + "=" * 56)
        print(f"\n  Final mood: {s['mood']:.0f}    Debt: {s['debt']:.0f}%"
              f"    Inflation: {s['inflation']:.1f}%")
    else:
        print("\n  " + "=" * 56)
        print(f"  GAME OVER - {s['over']['title']}")
        print("  " + "=" * 56)
        print(f"\n  Year {s['quarter'] // 4 + 1}, quarter {s['quarter']}.\n")
        print(f"  {s['over']['lesson']}")
    return input("\n  Play again? (y/n) ").strip().lower().startswith("y")


def main():
    while True:
        s = new_game()
        while True:
            draw(s)
            try:
                raw = input("\n  > ")
            except (EOFError, KeyboardInterrupt):
                print("\n  Bye.")
                return
            action = handle(s, raw)
            if action == "quit":
                return
            if action == "redraw":
                continue
            step(s)
            if s["over"]:
                draw(s)
                if game_over(s):
                    break
                return
            if s["quarter"] >= CONFIG["quarters_to_survive"]:
                if game_over(s, won=True):
                    break
                return


if __name__ == "__main__":
    main()
