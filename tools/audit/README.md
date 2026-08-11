# Audit probes

Reproductions for every finding in `docs/07-model-audit-findings.md`. Each is a
standalone script — no arguments, no state, no dependencies.

**Every finding is now fixed** (`docs/08-post-audit-revisions.md`), and these
probes have been updated to run against the current code — so they print the
fixed behaviour where `07` quotes the broken numbers. They are kept because
exploration is not the same job as regression testing: a probe sweeps and
prints, a test asserts. The durable guarantees live in `test/`
(`lags`, `events`, `transmission`, `crisis`, `validation`); these are for the
next person who needs to go looking.

```
npm run params          # once, if src/params.js is missing
node tools/audit/10-state-dependence.mjs
```

`h.mjs` is the shared harness. It exposes `ctx(overrides, seed)` →
`{s, trace, pipeline, rng}` and `step(c, n, opts)`, defaulting to
`{events:false, assertEveryTick:false, endings:false}` so a probe measures the
mechanism rather than the ending.

Two conventions used throughout:

- **`net_exports` is the gap instrument.** It is additive in `aggregate.js` and
  read by nothing else in `src/rules/`, so setting it moves the output gap
  without touching the deficit, the tax base, disposable income or the policy
  rate. Setting the gap with the policy rate instead — which the existing tests
  do — confounds the gap with the lever being measured.
- **Off the exact steady state the model has no resting point.** A "settled"
  state at any non-neutral rate is a waypoint on a drifting path. Where a probe
  needs a stationary comparison it clones one common state into both arms and
  steps them together.

| Probe | Findings |
|---|---|
| `01-pipeline.mjs` | L1 — a rate move via `applyDialChange` vs the same move with no scheduling |
| `02-asymmetry-income-events-money.mjs` | L8 cut/hike ratio, L4 constant market income, the vacuous stabiliser test, M1 `export_slump`, M3 dead money block |
| `03-sign-matrix-zlb-austerity.mjs` | F4 sign matrix, F5 first pass, F6 first pass, L4 austerity |
| `04-crisis-invariants.mjs` | L7 crisis, M1 across seeds, the stale collateral read (M12 #17) |
| `05-crash-rate-zlb-doublecount.mjs` | M1 frequency over 1200 sessions, M2 the decisive ZLB test, `MAX_OVERHEAT`, section C double counting |
| `06-stabilisers-scenarios-sweep.mjs` | L4 absorption, M6 scenario arcs, M13 identity coverage, section E sweep |
| `07-producer-consumer-graph.mjs` | M12 — static producer/consumer graph over the 24 rules |
| `08-lazy-fields-bubble-print.mjs` | M11 lazy fields, endings under extreme dials, M6 bubble, L3 print as financing |
| `09-print-cliff-firesale.mjs` | L3 crowding-out decomposition, the rate cliff, Taylor benchmark, M4 fire sale, M5 doom loop |
| `10-state-dependence.mjs` | L2, L3, F5 — clean state dependence via `net_exports`; the +4 cap; the bubble under Taylor |
| `11-okun-switch-peaks-credibility.mjs` | L6 Okun switch, L5 hiring/firing, M9 no peaks, credibility (the one that works) |
| `12-pipeline-direct-validation.mjs` | L1 decisive, M8 validation targets, L3 print decomposition |
| `13-tax-decomposition.mjs` | M8 — 1pp tax cut, component by component |
| `14-tax-sign-by-gap.mjs` | M8 — tax-cut sign by starting gap and horizon |
