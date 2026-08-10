# What's left for you

The economics is done and tested. **28 tests pass**, and 200 ticks of no input
produce exactly zero drift. Everything below is plain application code — DOM,
canvas, timing, state plumbing. No economics anywhere in it.

Before you start:

```
npm test          # 28 pass — keep it that way
npm run demo      # watch the economy run in your terminal
npm run demo bubble
npm run demo stagflation taylor
npm run build     # writes index.html
```

`npm run demo` is the important one. The model works *now* — you are building
a window onto something that already runs, not building the thing itself.

---

## The nine files

In dependency order. Each is stubbed with a docstring saying what it takes,
what it returns and what it must do. Every one throws `not implemented` until
you write it, so you always know exactly where you are.

### 1. `src/game/clock.js` — start here
The fixed-timestep accumulator. ~40 lines and it makes everything else
visible.

The one trap: **clamp the accumulator** to ~5 ticks per frame. Background a
tab for a minute and an unclamped loop runs 30 ticks in one frame — the player
comes back to a country that collapsed while they read their email.

### 2. `src/ui/widgets/gauge.js`
One indicator row: label, value, bar, sparkline, plain-English verdict.
Generated from `INDICATORS` in `src/game/indicators.js` — which is already
written, with the bands and verdict strings in it. You read that array; you
never hardcode a gauge.

### 3. `src/ui/widgets/dial.js`
A draggable slider per entry in `DIALS` (also already written). On release,
call `applyDialChange(state, pipeline, key, value)` from `src/game/dials.js` —
that function already handles scheduling the consequence into the lag
pipeline. You do not need to know what it schedules or why.

Show the **neutral marker**. Without it a player cannot tell whether 3% is
loose or tight, which is the first thing they need to know.

### 4. `src/ui/app.js`
Mount everything, bind keys (space pause, +/- speed, `w` why, `r` restart),
own the render loop. This is where the app becomes real.

### 5. `src/ui/chart.js`
Canvas 2D. Three functions: `drawLine`, `drawSparkline`, `drawRegimeScatter`.
No library — the whole need is a few line series and one scatter, ~120 lines.

Handle `devicePixelRatio` or it is blurry on every laptop made since 2016.

### 6. `src/ui/widgets/pipeline.js`
**The most important widget on screen.** Call `pipeline.pending(tick)` and
render one row per queued effect with a fill bar and a countdown. Without it
players conclude the model is broken; with it they learn to plan ahead.

### 7. `src/ui/widgets/why.js`
Click a number → open `trace.get(key)` and render the terms as a waterfall.
The terms are guaranteed to sum to the total — `trace.record` throws if they
don't, so if it ever looks wrong on screen, it's your rendering, not the model.

### 8. `src/ui/widgets/regime.js`
A scatter of inflation vs output gap, a dot for now, a fading 24-month trail.
`regime(state)` in `src/state.js` returns which quadrant you're in.

### 9. `src/game/session.js`
Run state, restart, seeds, and **ghost runs** — keep the previous run's
history and hand it to the charts as a faint second line. Same seed by
default, so every restart is a controlled experiment with one variable: what
you did.

---

## Rules that will keep you out of trouble

1. **Never call `Math.random()`.** Use `makeRng(seed)` from `src/rng.js`. A
   test greps for this, because a single stray call silently breaks ghost runs
   and seed sharing.
2. **Never write a bare `/12` or `/4`.** Route every time conversion through
   `src/units.js`. Also grep-enforced.
3. **Never edit `index.html` or `src/params.js`** — both are generated and
   gitignored.
4. **Don't touch `src/rules/`, `src/engine.js`, `src/state.js`,
   `src/invariants.js` or `parameters.py`.** That's the model. If you think it
   is wrong, run `npm test` first — and if the tests pass and it still looks
   wrong, that's worth a conversation rather than an edit.
5. **Add new files to `BUILD_ORDER`** in `tools/build.mjs`, or they are
   silently absent from the bundle.
6. **One scope in the bundle.** Top-level names must be unique across all of
   `src/`. The build fails loudly if not.

## How to know it works

`npm test` stays at 28 passing. Then open `index.html` and check the three
things the design actually rests on:

- a dial change appears in the pipeline panel and lands *months* later
- clicking a number opens terms that visibly sum to it
- restarting on the same seed draws your previous run as a ghost

If those three work, the rest is decoration.
