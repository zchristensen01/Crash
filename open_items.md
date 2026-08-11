# OPEN ITEMS

Things found during the fourth audit that are **not fixed**, **not finished**,
or **not understood**. Kept separate from `TASKS.md`, which tracks the plan:
this is the list of things that would otherwise only exist in my head.

Ranked by severity within each section. Every entry states how to reproduce it.
Where a number is quoted it was measured, not read.

**Status key:** `OPEN` nobody has looked · `PARTIAL` started, not finished ·
`DELIBERATE` decided against, reason given · `WATCH` fine now, will break later

---

## A. Things that invert or weaken a lesson the game exists to teach

### A1. `bubble` no longer produces its designed regime — `OPEN`
The scenario `docs/00` calls the best teaching tool in the set. Its credit gap
used to climb monotonically for eight years while every visible gauge stayed
healthy. It now **peaks at 9.82pp around month 48 and unwinds to 3.37 by month
96**, with crisis probability falling from 6.35% to 0.22%.

```
node --test test/scenarios.test.js    # the todo carries both paths
```

| credit gap, no player input | m24 | m48 | m72 | m96 | crisis_prob m96 |
|---|---|---|---|---|---|
| before Phase 3 | 8.77 | 11.63 | 13.34 | **14.10** | 10.36% |
| now | 8.39 | 9.80 | 7.99 | **3.37** | 0.22% |

The scenario was **calibrated against the asset-price unit error** that 3.1
fixed. Nothing about the fix is wrong. A hidden danger that resolves itself
teaches that ignoring it works, which is the inverse of the point.

**DIAGNOSED IN 4.3, and it is not the vector.** The cause is **D2**, an
already-known sourced defect: `updateCreditTrend` chases the stock at 0.20/year
(41.6-month half-life) while its stated source is a one-sided HP filter at
λ = 400,000, whose trend constant is **10–15 years**. The gauge mean-reverts
3–4× faster than the indicator it approximates, so it under-reads persistent
booms — the exact situation it exists for. Measured, bubble's credit gap by
trend catch-up speed:

| annual speed | m24 | m48 | m72 | m96 |
|---|---|---|---|---|
| 0.20 (as built) | 8.39 | 9.80 | 7.99 | **3.37** |
| 0.06 (sourced) | 10.29 | 13.99 | 14.20 | **10.34** |
| 0.05 (sourced) | 10.44 | 14.37 | 14.82 | **11.14** |

**Phase 5.4 is the fix**, and the plan already required it to come after Phase 3
— which is now done. Must not be closed by re-inflating the wealth channel
(rule 3, and the channel matches its literature) **nor by retuning the starting
vector**, which is what this entry previously recommended. Phase 6.1 is the
other half: a bubble the player cannot act on is a spectacle, not a decision.

### A2. The demand block moves too little, and it is one finding seen four ways — `OPEN`
The most important thing in this audit and it is not in the original brief.

| | model | literature |
|---|---|---|
| UK 1979-83 sacrifice ratio | 0.38 | Ball 1994: 2–4 |
| `TAX_SHOCK_TO_GDP` | 0.46 | Romer-Romer: 2–3 |
| austerity paradox | absent at every playable gap | — |
| endogenous crisis propagation | 3.65% | was 8.4% of Cerra-Saxena's 10% |

**Every real quantity moves too little for the price change that caused it.**
These are not four findings; they are one, in the demand block, and it is not a
calibration problem. It is why `CRISIS_SCAR_AMPLIFICATION` could not be
re-solved (see C2), and it is the strongest candidate for the next pass's
central task.

### A3. A rate cut buys LESS inflation the hotter the economy — `OPEN`, undiagnosed
Below the capacity ceiling, the inflation response to a 1pp cut **falls** as the
output gap rises, then jumps at the ceiling:

```
node -e "…" # see the sweep in test/transmission.test.js's capacity-cliff test
```

| starting gap | 0.00 | 0.97 | 1.98 | 3.02 | **4.08** | 4.74 | 5.27 |
|---|---|---|---|---|---|---|---|
| Δinflation from a 1pp cut | 0.105 | 0.085 | 0.061 | 0.033 | **0.055** | 0.058 | 0.066 |

**Verified pre-existing** — the shape is identical before and after Phase 3, so
it is not something this pass introduced. But it is backwards on its face: a cut
into a hotter economy should buy more inflation, and between a zero gap and +3
it buys a third as much. Nobody has explained it. It also made the capacity-cliff
test a coin toss for as long as it has existed — that test passed by 0.004 and
failed by 0.006 across an unrelated change.

---

## B. Things I found and did not chase

### B1. `docs/11`'s prose is only verified for section 2 — `PARTIAL`
4.3 regenerated all six dial tables and updated the numbers quoted in **§2's**
rate-cut chain. The prose in **§1, §3, §4, §5, §6 and §7 was not checked
number-by-number.**

The fingerprint stamped on the document asserts that it was generated against a
model producing these measurements — it does **not** assert that every sentence
was re-read. Anyone quoting a number from those sections should re-measure it
first:

```
node tools/cause-effect.mjs          # prints every table
node tools/cause-effect.mjs --check  # only says whether the MODEL has moved
```

### B2. `debt_trap` overflows `govt_debt` to Infinity at month 191 — `DELIBERATE`
After reaching 7.27e+189. Verified identical before and after Phase 3, so it is
not new. It is the *declared* `debt_service_spiral` plus double precision giving
out, 117 months after the debt-crisis ending would have ended a real game at
month 74. Skipped explicitly in the conservation sweep with the reason attached.
Only worth attention if endings are ever disabled in a shipped configuration.

### B3. Unemployment does not follow output down in a crash — `OPEN`
The crash trough is now **exactly** on target (−9.0000% against
`CRISIS_OUTPUT_TROUGH`) while unemployment peaks at **+1.86pp against a
published 2–5**. So the output hole is the right depth and the labour market
does not follow it into it. That is Okun, and it is probably the same finding as
A2 seen from the labour side. `TEST-RESULTS.md` OPEN on the output→employment
lag is related.

### B4. One mean-reversion speed cannot satisfy both asset legs — `OPEN`
`ASSET_PRICE_MEANREVERSION` is one number serving two sourced horizons: equity
is *"cumulative ~1yr"*, housing *"2–5yr"*. Equity implies ~0.08 (outside the
published [0.01, 0.05]); housing implies 0.028–0.038 (inside it). Left at the
published 0.02 and recorded rather than tuned. Consequence: the model delivers
**0.94% of a 4.60% level response at 12 months** — correct in the long run,
slow to get there. Phase 6.3 (separate housing from equities) is the real fix.

---

## C. Deliberate omissions — decided against, with reasons

### C1. Forward guidance / expectations — `DELIBERATE`, and the case has changed
Still deferred per the plan, **but the reason it was deferred is gone.**
`docs/12` deferred it as "decoration on a defect"; Phase 2 removed that defect.
Two of the four historical episodes now point at this same missing mechanism
**from opposite directions** — US 2021-23's credibility collapsing to 0.000 on
realised misses, and Japan's inability to de-anchor *downward*. That agreement
is new. It is now the largest single thing missing from the monetary block.

### C2. `CRISIS_SCAR_AMPLIFICATION` not re-solved — `DELIBERATE`
It re-solves to 1.06–1.26, outside its published [2.0, 4.5]. Forcing it there
would make the exogenous capacity cut supply 9.5 of Cerra-Saxena's 10 while the
model supplies almost nothing — destroying the deconvolution the constant exists
to be, and imposing the observed reduced form as a structural input. **The
refusal is the finding**, and it is A2. Re-solve when the demand block is fixed,
not before.

---

## D. Things I changed that a later phase must re-verify

### D1. The rate ceiling of 50 predates the Phase 3 fix — `WATCH`
2.4 derived `max: 50` as a fixed point over 360 runs with events on. That was
measured **before** 3.1 removed the wealth-channel overshoot, and the model is
now much less explosive: at a ceiling of 20 the Taylor rule *survives*
stagflation (5.49% at m96) where it used to reach 1020.91%. The A2 finding
survives — the threshold moved from 20–25 to **18–20**, and the rule is still
refused 39/96 months at 20 against 0/96 at 50 — but **the derivation itself
should be re-run.** Noted in `test/autopilot.test.js`.

### D2. Two bounds are stated twice — `WATCH`
`updateConsumption` clamps to `[10, 95]` and `invariants.js` check 8 asserts the
same band; `updateInvestment` clamps to `[2, 45]` and check 8 asserts that too.
Deliberate belt-and-braces, and the numbers were deliberately taken from the
invariant so there is one source. But they are still two copies: **move one and
the other must move.** A candidate for Phase 5.3's literal sweep.

### D3. The trace tolerance is now relative above 1e6 — `WATCH`
Was an absolute 1e-6, which fired on floating-point cancellation rather than on
a bug when terms reach ~1e17. Now `max(1e-6, 1e-12 × scale)` — identical below
1e6, so no strictness is lost anywhere real. Verified against six cases
including three genuine mismatches. Flagged only because relaxing a guard is the
kind of change that deserves a second reader.

---

## E. Process and tooling hazards

### E1. `npm run params` could emit a `params.js` that did not match `parameters.py` — `FIXED`
The worst thing found in this pass, and it was found by accident. Python
validates its bytecode cache on the source's mtime **in whole seconds**, so two
edits to `parameters.py` inside one second leave a stale `.pyc` that looks
valid. Measured: a parameter restored from a backup one second after being
edited produced a `params.js` still carrying the *edited* value, and the entire
suite ran green against numbers that existed in no source file.

Fixed with `sys.dont_write_bytecode` in `tools/gen_params.py` and verified
against the repro. **Recorded because the class matters**: this project's whole
claim is that `parameters.py` is the authority, and for an unknown period any
generated artefact could silently disagree with it. Earlier passes' measurements
were taken on a tree with this hazard live.

### E2. `npm run check` and `npm test` had drifted apart — `FIXED`
`test` gained `build --check` and `cause-effect --check`; `check` did not, so
the command whose name promises the most was checking the least. Now aligned.

### E3. Generated artefacts are gitignored, so staleness is local-only — `WATCH`
`index.html` and `src/params.js` are both generated and both gitignored. That is
the right call, but it means every clone regenerates them and no reviewer ever
sees them in a diff. The two `--check` tripwires exist for this reason; if a
third generated artefact appears, it needs one too.

---

## F. Not started

- **4.3 is now complete.** All six vectors re-measured; five are fine or
  improved (`overheating` and `stagflation` give the player longer — m34→m51 and
  m17→m23 — and `recession`'s spurious end-of-term boom shrank from OVERHEATING
  at a +8.30 credit gap to GOLDILOCKS at +3.15). Only `bubble` regressed, and
  its cause is now diagnosed as D2 rather than the vector. Guarded by a new
  full-term characterisation test in `test/scenarios.test.js`.
- **4.4** — OPEN #1 and #9. #9 is already measured and **the plan's expectation
  for it is wrong**: A1 did not move the 24-month figure (0.1227 against 0.122),
  but the response is slow rather than absent — 0.0586 at 12m, 0.1227 at 24m,
  0.1756 at 36m, **0.2192 at 48m, inside the published 0.2–0.4.** Its `todo`
  message still carries the old text.
- **Phases 5–10** — untouched.
- **Two claims flagged READ-NOT-MEASURED in `docs/13` Phase 0:** the
  `credit.js:218` EMA comment was checked in 3.2 and **the brief was right**.
  **D3's numeric-literal counts have still never been checked** — Phase 5.3
  must count against the tree, not quote the brief.
