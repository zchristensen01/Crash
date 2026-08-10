# Retired prototype

`econ_sandbox.py` is the original single-file, quarterly, turn-based
prototype. It is kept for its UI shape and its plain-English explanatory
copy, both of which are good.

**Do not use it as a model reference.** Six defects were found by running it
against the design docs, three of which invert the lesson they were built to
teach — most importantly, printing money raises inflation unconditionally,
which is the opposite of what the design intends. The defects table is in
`docs/03-architecture.md`.

It is superseded by `src/`, not ported from.
