#!/usr/bin/env python3
"""
GENERATE src/params.js FROM parameters.py
=========================================
`parameters.py` is the research record: ranges, confidence levels and
citations. This script projects it into JavaScript so the runtime has exactly
one source of truth for every number.

    python3 tools/gen_params.py        (or: npm run params)

DO NOT hand-edit src/params.js. It is gitignored and regenerated on every
build and every test run. Add or change a parameter in parameters.py.

Importing parameters.py runs its validate() as a side effect, so a bad range
or a missing unit fails here, before anything is built.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import parameters as K  # noqa: E402  (import after sys.path fix)

HEADER = """// GENERATED FILE — DO NOT EDIT.
// Source: parameters.py   Regenerate: npm run params
//
// Every number the model uses. Read `.value` for the central estimate; `.low`
// and `.high` are the plausible range and the UI should show them wherever
// `.confidence` is 'weak' or 'contested' rather than pretending to a point
// estimate. `.source` is the citation. `.note` is why it is what it is.
"""


def js(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


def main():
    params = {name: vars(p) for name, p in sorted(vars(K).items())
              if isinstance(p, K.P)}

    kernels = {ch: K.kernel(ch) for ch in K.LAGS_MONTHS}

    out = [HEADER]
    out.append(f"export const P = {js(params)};\n")
    out.append(f"export const START = {js(K.START)};\n")
    out.append(f"export const LAGS_MONTHS = {js(K.LAGS_MONTHS)};\n")
    out.append(f"export const KERNEL_SHAPE_K = {js(K.KERNEL_SHAPE_K)};\n")
    out.append(f"export const KERNEL_DEFAULT_K = {K.KERNEL_DEFAULT_K};\n")
    out.append(
        "// Precomputed normalised gamma weights, index m-1 = share landing in\n"
        "// month m. Theta is derived so the MODE lands on LAGS_MONTHS — see the\n"
        "// [PASS2 FIX] note in parameters.py.\n"
        f"export const KERNELS = {js(kernels)};\n")
    out.append(f"export const UNKNOWNS = {js(K.UNKNOWNS)};\n")
    out.append(
        "// Parameters deliberately not read by any rule, and why.\n"
        "// test/params.test.js enforces this register in both directions.\n"
        f"export const DEFERRED = {js(K.DEFERRED)};\n")
    out.append(
        "// Stated values that disagree with how the model behaves, where\n"
        "// resolving the disagreement needs research, not wiring.\n"
        f"export const CONFLICTS = {js(K.CONFLICTS)};\n")
    out.append(f"export const CREDIT_GAP_HP_LAMBDA = {K.CREDIT_GAP_HP_LAMBDA};\n")
    out.append(f"export const UNBALANCED_LOOPS = {js(K.UNBALANCED_LOOPS)};\n")
    out.append(
        "// Constants whose value is DEFINED by solving this model against a\n"
        "// published magnitude, rather than estimated from the world. A test\n"
        "// that checks one of them is a CONSISTENCY CHECK, not a validation:\n"
        "// it cannot fail on magnitude, because the constant is whatever makes\n"
        "// it pass. They must be re-solved whenever the model changes.\n"
        f"export const SOLVED_FROM_MODEL = {js(K.SOLVED_FROM_MODEL)};\n")

    dest = ROOT / "src" / "params.js"
    dest.write_text("\n".join(out), encoding="utf-8")

    weak = sum(1 for p in params.values()
               if p["confidence"] in ("weak", "judgement", "contested"))
    print(f"wrote {dest.relative_to(ROOT)}: {len(params)} parameters "
          f"({weak} weak/contested/judgement), {len(kernels)} kernels, "
          f"{len(K.UNKNOWNS)} unknowns")


if __name__ == "__main__":
    main()
