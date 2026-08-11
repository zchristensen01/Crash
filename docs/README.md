# docs/

Eleven files. Three kinds, and knowing which kind you are reading matters more
than the numbering suggests.

**LIVING** — describes the code as it is now. If it disagrees with the code,
the document is wrong and should be fixed. Two of these are enforced by
`test/docs.test.js`.

| File | |
|---|---|
| [`10-state-of-the-project.md`](10-state-of-the-project.md) | **Start here.** What exists, what works, what is known to be wrong, what is deliberately not built, and what "accurate" can mean for a model like this. |
| [`01-variables.md`](01-variables.md) | Every state variable, its kind, its starting value and its job. Tested: every field `newState()` produces must appear here, and nothing here may name a field the model no longer has. |
| [`09-interface.md`](09-interface.md) | The screen. Layout, every widget and the argument for it, the clock, the learning affordances, and the accessibility work that is genuinely undone. |

**DESIGN** — what the thing is for. Mostly durable; corrected in place when a
pass overturns something, with the correction marked rather than the original
deleted.

| File | |
|---|---|
| [`00-design-brief.md`](00-design-brief.md) | What the game is, what it must teach, and the two "Post-research revisions" sections recording what each literature pass changed. |
| [`02-causal-map.md`](02-causal-map.md) | The causal chains — every arrow, sign and lag the model is meant to contain. Carries inline corrections from research pass 2 and from the audit, plus a closing section listing what the audit changed in this document. |
| [`03-architecture.md`](03-architecture.md) | Why a browser and not a terminal, the file layout, the four extensibility rules, and the six defects found in the Python prototype. Parts are pre-implementation and marked as such. |

**RECORD** — a dated artefact of one pass. Written in the past tense on
purpose. Do not update these to match the code; they are the evidence for why
the code changed.

| File | |
|---|---|
| [`04-research-brief.md`](04-research-brief.md) | The questions put to literature pass 2. |
| [`05-handoff.md`](05-handoff.md) | What two research passes changed, and the A1–A6 implementation decisions. |
| [`06-model-audit-brief.md`](06-model-audit-brief.md) | The instruction to tear the implemented model apart, with six findings seeded from a first pass. |
| [`07-model-audit-findings.md`](07-model-audit-findings.md) | The answer: 14 findings, every one measured, with a checked-in reproduction under `tools/audit/`. Six inverted a lesson the game exists to teach. All now closed. |
| [`08-post-audit-revisions.md`](08-post-audit-revisions.md) | What the audit changed, why each shape was chosen over the alternative, what was deliberately left open, and the guards that stop the same class of defect recurring. |

---

## The two documents that are tested

`test/docs.test.js` asserts:

- every field in `newState()` is documented in `01`, and nothing in `01` names
  a field that no longer exists;
- every dial, gauge, scenario, shock and ending is named in `01`, `09` or `10`;
- every lag-pipeline target has a player-facing name, so the pipeline panel
  cannot render a raw field name;
- every file in this directory is listed above.

That exists because `01` went badly stale without anyone noticing — it listed
`transfers` as a player dial when it is automatic, gave a `neutral_rate` of
3.0% when the model has a `neutral_real_rate` of 0.5%, and documented two
variables that had been deleted. A design document that quietly stops matching
the code is worse than no design document, because people still trust it.

## The standing rules these documents keep restating

They are restated because each one has already been broken at least once.

1. **`parameters.py` is the record.** Every coefficient carries its range, how
   good the evidence is, and where it came from.
2. **Never average away a real dispute.** Mark it `contested`, give both camps,
   code one as default and say which.
3. **Never tune to a dramatic target.** Where the model disagrees with the
   literature, that is a finding to surface, not a coefficient to move. Two
   disagreements are currently recorded as failing-by-design `todo` tests.
4. **No rule may modify state without recording why.** `trace.record` throws if
   the terms do not sum to the total.
5. **The steady state must hold.** 200 ticks of no input, zero drift.
6. **A regime has to be DRIVEN, not asserted.** Setting `unemployment: 9` does
   nothing; the labour rule pulls it back within months. Three of six scenarios
   had to be rebuilt for breaking this.
7. **State dependence is checked with two measurements, never one.** Every
   defect the audit found was a statement about how a response *changes* with
   the state, and every one passed a suite that checked levels.
