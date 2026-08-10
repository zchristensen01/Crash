# Crash

A real-time economy simulator that runs in a browser. Time runs continuously,
you hold a handful of policy dials, and numbers move according to equations you
can open up and inspect. You either survive your term or you break the country.

The point is not to win. The point is that after twenty failed runs you
understand why central bankers look tired.

## Run it

```
npm run build     # writes index.html
npm test          # node --test, no framework
npm run check     # params + build + tests
```

No dependencies. No `node_modules`. Node 20+ and Python 3 are all you need,
and Python only to regenerate parameters.

## Where things are

| Path | What |
|---|---|
| `docs/` | The design. Read `00-design-brief.md` first, then `03-architecture.md`. |
| `parameters.py` | **The research record.** 108 parameters, each with a range, a confidence level and a citation. The authority for every number. |
| `src/` | Source, authored as ES modules. |
| `tools/` | `gen_params.py` projects parameters into JS; `build.mjs` concatenates `src/` into `index.html`. |
| `test/` | Tests. `params.test.js` passes today; the rest fail until their module exists. |
| `reference/` | The retired prototype, kept to read, not to run. |

Two files are **generated and gitignored** — never edit them:
`index.html` (from `src/`) and `src/params.js` (from `parameters.py`).

## The rules that keep it honest

1. **`parameters.py` is the record.** Every coefficient carries its range, how
   good the evidence is, and where it came from. Where confidence is `weak` or
   `contested`, the UI shows the range rather than pretending to a point
   estimate.
2. **No rule may modify state without recording why.** The `why` panel is not
   a feature, it is the difference between a black box and a teaching tool.
3. **Never average away a real dispute.** Mark it `contested`, give both camps,
   code one as default and say which. Economists disagreeing is a feature.
4. **The steady state must hold.** 200 ticks of no input and nothing drifts.
   A model that will not sit still is unplayable, and every bug you find later
   will be that bug.
5. **Randomness is seeded.** Ghost runs and same-seed restarts are how anyone
   learns from a failed run. One `Math.random()` destroys them silently.
6. **Time conversion lives in `units.js`.** Nowhere else.

## Status

**The model is complete and tested — 28 tests pass.** 200 ticks of no input
produce exactly zero drift in every variable. All six scenarios run a full
term without absurd numbers, and the two that should lose, lose.

What remains is the game and interface layer, which contains no economics:
`src/game/{dials,events,indicators,clock,session}.js` and everything under
`src/ui/`. Each is stubbed with its contract. See the build order at the end
of `docs/03-architecture.md`.

Next milestone: gauges and dials on screen.
