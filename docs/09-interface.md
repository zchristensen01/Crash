# 09 — The Interface

> **LIVING DOCUMENT.** This describes the screen as it is now. `test/docs.test.js`
> checks that every dial, gauge, shock and ending is named here or in `01`.
> `03-architecture.md` has the original layout sketch and the reasoning behind
> choosing a browser at all; that one is historical and its ASCII mock predates
> the built thing.

The whole interface is generated from data. `INDICATORS`, `DIALS`, `EVENTS`,
`ENDINGS` and `SCENARIOS` are arrays of plain objects in `src/game/`, and the
widgets render whatever is in them. Adding a gauge, a dial, a shock, a scenario
or a way to lose never touches rendering code. That property is the single
best thing about this codebase and it should survive everything.

`index.html` is one self-contained file — no CDN, no `node_modules`, no build
step at play time. `tools/build.mjs` concatenates `src/` into it; that is a
concatenation, not a bundler.

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CRASH   Mar 2028 · Yr 3 Q1   ▶ 1x 3x 10x  ▓▓▓░░ 27/96   [Bubble ▾] restart   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ⚠ HYPERINFLATION in 4 months — break the condition and the clock resets      │
├────────────────────────────┬─────────────────────┬───────────────────────────┤
│ WHERE YOU STAND            │ HISTORY             │ WHERE YOU ARE             │
│                            │                     │  ┌─────────┬─────────┐    │
│ Growth       +3.2% ▲ ▁▂▃▅▇ │  ╱╲   Inflation     │  │         │    ●    │    │
│ Inflation     5.8% ▲ ▁▂▃▅▇ │ ╱  ╲__╱             │  │         │   ╱     │    │
│ Unemployment  3.4% ▼ █▇▅▃▁ │ ······· ghost       │  ├─────────┼─────────┤    │
│ Govt debt      71% · ▃▄▅▅▅ │                     │  │         │         │    │
│ Approval         58 ▼ ▅▆▇▆ │  Unemployment       │  └─────────┴─────────┘    │
│                            │                     │  OVERHEATING — hike,      │
│ THE TWO NOBODY WATCHES     │  Credit gap         │  tighten fiscal, take     │
│ Credit gap  +11.4pp ▲      │                     │  the pain early.          │
│ Credibility    0.62 ▲      │                     │                           │
│                            │                     │ IN THE PIPELINE           │
│                            │                     │  rate +0.50pp             │
│                            │                     │  → what businesses pay    │
│                            │                     │    to borrow              │
│                            │                     │  ▓▓▓▓▓░░░ peaks in 6 mo   │
├────────────────────────────┴─────────────────────┴───────────────────────────┤
│ YOUR DIALS — drag one, then watch the pipeline                               │
│  Rate 3.00%      Tax 25.00%     Spend 22.00%    Print 0.00%    QE 0.00%      │
│  ──●───────      ────●─────     ───●──────      ●─────────     ●─────────    │
│  ← cheaper       ← keep more    ← spends less   ← borrow it    ← no buying   │
│  0.50pp above neutral                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ [space] play/pause  [1 2 3] speed  [w] why  [r] restart same world  [n] new  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Three columns on desktop, stacked on narrow screens. Dark by default. The
containers are declared structurally in `src/ui/shell.html`; nothing else in
that file knows what goes in them.

---

## The five things that carry the design

### 1. Gauges — level, direction, and a verdict in words

`src/ui/widgets/gauge.js`, one per entry in `INDICATORS`. Each is a button, and
clicking it opens the `why` panel.

Every gauge shows five things, and each of them is doing a job:

| Element | Why it is there |
|---|---|
| The number | formatted by the indicator's own `fmt`, so units are never guessed |
| A **trend arrow** ▲▼· | LEVEL IS NOT ENOUGH. A gauge in the amber band and improving is a different situation from the same gauge deteriorating. Computed over a 6-month window against the indicator's own `badness` function, with a per-gauge `trendEpsilon` so noise does not flicker it |
| A bar | position within the indicator's plausible range |
| A 60-month sparkline | shape, at a glance, coloured by band |
| A **verdict in plain English** | "on target", "running hot", "OUT OF CONTROL". A number alone tells a beginner nothing, and colour alone is unreadable to about 8% of men |

Bands are `ok` / `warn` / `danger`, and the thresholds are economics, not
taste: 9pp is the BIS credit-gap line, 0.7 is where the Phillips slope starts
steepening.

A gauge that is not meaningful yet says so. `Growth` needs a full year before
year-over-year means anything, so for the first twelve months it reads `—` and
"gathering data" instead of printing a zero and calling it a recession.

**Two tiers, and the split is the argument.** Five headline gauges — Growth,
Inflation, Unemployment, Govt debt, Approval — and then a visually separated
row headed *"The two nobody watches"*: **Credit gap** and **Credibility**.
Those two are the reason the game exists. Every other gauge tells you about
today; those two tell you about trouble that has not arrived yet.

### 2. Dials — direction, neutral, and stance

`src/ui/widgets/dial.js`, one per entry in `DIALS`. A bare slider from 0 to 20
tells a beginner nothing, so each carries:

- **Both ends in the player's language.** `← cheaper money` / `costlier money →`.
- **A neutral marker** on the track. Without it you cannot tell whether 3% is
  loose or tight, which is the first thing you need to know before touching it.
- **A live stance readout** — "0.50pp above neutral" — and a `data-stance`
  attribute of `loose` / `neutral` / `tight` that the CSS colours.
- **Commit on release, not on drag.** One drag would otherwise queue dozens of
  tiny effects into the lag pipeline. While you are dragging, the readout says
  "release to commit" and `update()` refuses to fight your hand.

The five dials are `policy_rate`, `tax_rate`, `govt_spending`, `money_printed`
and `qe`. `transfers` is deliberately **not** a dial — it moves on its own with
unemployment, and discovering that is half the point of the automatic
stabiliser block.

### 3. The pipeline panel — the most important widget on screen

`src/ui/widgets/pipeline.js`. A live queue of what you have done that has not
landed yet. Without it players conclude the model is broken; with it they learn
to plan ahead.

Each row is one scheduled effect: the label of the move that caused it
(`rate +0.50pp`), **what it is on its way to change in plain English**
(`→ what businesses pay to borrow`), a bar that fills as the kernel lands, and
a countdown to peak. Past the peak but still arriving reads "still landing" —
shown rather than hidden, because the tail is the part players consistently
underestimate and it is why overshooting a hike takes years to undo.

> The player-facing names come from `TRANSMISSION_LABELS` in `dials.js`, and
> `test/docs.test.js` asserts every pipeline target has one. This panel spent a
> while rendering `→ policy_rate_demand`, which is a field name, not an
> explanation.

### 4. The why panel — click any number, see the actual arithmetic

`src/ui/widgets/why.js`. Every rule writes its term breakdown to `Trace`, and
`trace.record` **throws** if the terms do not sum to the total. So the panel is
not a summary or an approximation — it is the numbers the model added up, and
they are guaranteed to add up.

Opening it pauses the clock and **restores your speed when you close it**. The
first version paused and never resumed, which read as the game resetting itself
every time you clicked a number.

This is the difference between a black box and a teaching tool, and it is the
reason `no rule may modify state without recording why` is rule 2 in the
README.

### 5. The regime box — a moving dot, not a label

`src/ui/widgets/regime.js`. `docs/02` Part 4 asks for a scatter with inflation
on one axis and the output gap on the other, a dot for now, and a fading trail
of the last two years. The trail is the point: it shows the **direction you are
travelling**, which is the thing that decides whether a hike is late or early.
A static label can only tell you where you are, and where you are is the less
useful of the two.

Underneath, the caption names the box and says what to do — including the one
box where the honest answer is that there isn't one:

> STAGFLATION — no good answer. The dials point in opposite directions.

---

## Time

`src/game/clock.js`. Fixed timestep, decoupled from the render frame. **Speed
changes the wall-clock rate only. It never changes the maths, and one tick is
always one month** — a model whose results depend on your frame rate is not a
model.

| Speed | Wall clock per month |
|---|---|
| 1× | 2.0 s |
| 3× | 0.7 s |
| 10× | 0.2 s |

The accumulator is **clamped** at 5 months per frame and drops any larger
backlog. Background a tab for a minute and an unclamped loop simulates thirty
months in one frame — the player comes back to a country that collapsed while
they were reading email. Dropping the backlog is correct; catching up is not.

Play/pause and speed are **separate controls**. Folding them into one row of
four buttons made the paused state look like a speed, left no visible play
button, and silently discarded your speed choice when you paused. The button
shows the action it will perform, not the current state — the media convention
everyone already knows.

**The game auto-pauses** on a shock landing, on an ending countdown starting,
and at the end of the term. You should never lose because you blinked.

---

## Learning affordances

**Hover anything.** Every gauge, dial, regime name and control has a
plain-English definition from `src/game/glossary.js`, written for someone who
has never taken an economics class. No term in the glossary is defined using
another term from the glossary without also explaining that one.

**Ghost runs.** Restart on the same seed and your previous attempt stays on
every chart as a dotted line. That converts each retry into a controlled
experiment with exactly one variable: what you did.

**Alerts, loudest first.** A model error (should never happen, and says so if
it does), then any ending countdown, then the shock that just landed with its
full explanatory text, then — on tick 0 — the scenario's description and its
trap.

**Ending countdowns are beatable clocks, not trapdoors.** Every ending is a
*sustained* condition: hyperinflation is 6 months above 25%, depression is 12
months above 14% unemployment. The banner appears the moment a countdown
starts and disappears if you break the condition. A game that ends on a single
spike teaches you to fear noise instead of trends.

**The game-over screen gets the whole screen.** Losing needs to land as a
conclusion, not as grey text in a sidebar. Every ending carries a lesson, and
the lesson is the entire reason the game exists.

## Shocks

`src/game/events.js`. At most one a month. `chance` is an ANNUAL probability
and the engine converts it once — drawing on an annual figure monthly would
make every shock about twelve times more likely than intended.

Shocks fire at the **start** of a tick, so the rules price them in the same
month. And an event may only touch state that no rule recomputes from scratch:
otherwise the shock is discarded and the accounting identity breaks between the
two. `export_slump` broke that rule for the model's whole life and killed 38.8%
of real 8-year sessions with a thrown invariant error. `test/events.test.js`
now checks every one.

| Shock | Annual chance | What it does |
|---|---|---|
| **Oil price spike** | 12% | +2.4pp of cost-push inflation, which is also a real income cut — this is the one that makes stagflation |
| **Productivity boom** | 10% | +1.5% TFP. The one free lunch: more demand without more inflation |
| **Bank wobble** | 15% | Only when the credit gap is above 5pp or banks are under 11%. Spread +0.8pp, capital −1pp |
| **FINANCIAL CRISIS** | driven by `crisis_prob` | Assets −30%, spread +3pp. The whole crash chain |
| **Export slump** | 12% | A trading partner falls into recession. External demand −1.2pp, fading |
| **Confidence slump** | 10% | −12 consumer confidence, for no reason the numbers explain |

## Ways to lose

`src/game/endings.js`. **Every ending is a sustained condition, never an
instantaneous trip.** A game that ends on a single spike teaches you to fear
noise instead of trends. The countdown is on screen the whole time it is
running and resets the moment you break the condition.

| Ending | Condition | Sustained for |
|---|---|---|
| **HYPERINFLATION** | inflation above 25% | 6 months |
| **DEPRESSION** | unemployment above 14% | 12 months |
| **DEBT CRISIS** | debt above 200% **and** yield above 12% | 3 months |
| **THROWN OUT OF OFFICE** | approval at or below 5 | 3 months |

The endings are also load-bearing for numerical sanity, which is worth writing
down: several loops in the model are deliberately unbalanced, and with endings
disabled a sustained tight policy drives `govt_debt` to `Infinity`. Any headless
analysis that turns them off is running an unbounded system.

Surviving all 96 months is scored: average approval, minus time spent in a
danger band, minus accumulated misery — with the breakdown always shown,
because a bare number teaches nothing.

## Charts

`src/ui/chart.js` — Canvas 2D, no library. Three series: **Inflation**,
**Unemployment**, **Credit gap**. Each carries a marker line at the value that
matters (target 2%, normal 5%, danger 9pp), a danger band, the ghost run, and
a device-pixel-ratio fit so it is not blurry on any laptop made since 2016.

Three series and not six, deliberately. The rest of the model is reachable
through the `why` panel, which is where a variable earns its place: it appears
as a *term* in the equation that produced a headline number, not as another
digit in a wall of digits.

---

## Accessibility, and where it is short

Done: every control has an `aria-label`, gauges are real `<button>`s, the panels
are real `<dialog>`s, band state is carried in `data-*` attributes and echoed in
a text verdict rather than by colour alone, and the trend arrow has a `title`.

Not done, and it should be:

- **No keyboard path to the dials.** They are `<input type="range">` so they
  are focusable and arrow-keys work, but there is no visible focus ring styled
  for them and no shortcut to jump between them.
- **No `prefers-reduced-motion` handling.** The clock animates continuously.
- **No contrast audit.** The dark palette in `styles.css` has never been checked
  against WCAG AA.
- **Canvas charts have no text alternative.** The sparklines and the three
  history charts are invisible to a screen reader; the underlying series are
  in `state.history` and could be exposed as a table.
- **Never tested on a real phone.** The CSS stacks, and that is all anyone
  knows.

## Known interface gaps

Listed rather than hidden, because `10-state-of-the-project.md` is the place to
decide what to do about them.

1. **The `why` panel only opens from the seven headline gauges.** Every rule
   records a trace, so `investment`, `credit_spread`, `asset price change`,
   `deficit`, `wage_growth`, `velocity`, `structural_deficit` and the rest are
   all recorded and unreachable. This is the cheapest large win available in
   the UI.
2. **Confidence levels are not shown.** `parameters.py` marks 29 of 121
   parameters `weak`, `contested` or `judgement`, and `docs/01` says the UI
   should render those as a band rather than a point. It renders point
   estimates everywhere.
3. **No dial history.** You cannot see what you did and when, which makes a
   post-mortem hard. The pipeline shows what is in flight and then forgets it.
4. **The scenario picker gives no preview.** You choose from a dropdown of six
   names with the trap text only appearing after you commit.
5. **`business_confidence`, `fiscal_space`, `misery`, `price_level` and
   `risk_premium` are computed and never displayed.** They exist for the `why`
   panel and the `why` panel cannot reach them yet — see gap 1.
