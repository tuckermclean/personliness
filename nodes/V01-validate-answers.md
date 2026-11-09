# V01 — validate-answers

| Track | Deps | Unlocks | Size |
|---|---|---|---|
| now | none | none | S |

**Owns:** `assessments/views.py`, `assessments/serializers.py`, `assessments/tests.py`

## Purpose

`POST /api/assessments/` (`AssessmentCreateView`) passes `answers` straight to `calculate_scores`:
a value of 5 gives a normalised answer of 5/3 and a trait score above 3, and an unknown question ID
is silently skipped. The existing `test_create_assessment` even sends 5 and expects 201. The owner
settled it (Q9): reject values outside 0–3 and unknown question IDs with HTTP 400. Principle 3:
scores are 0–3. Scoring and matching themselves are already built and stay as they are.

## Tests

- `assessments/tests.py`: new tests in `TestAssessmentAPI` for an out-of-range value (5 and -1), an
  unknown question ID, each non-integer type of OD-3, a partial submission (OD-4); each rejected case
  also asserts that no `AssessmentSubmission` was stored.
- `test_create_assessment` sends an in-range value instead of 5.
- Red target: `docker compose run --rm web pytest assessments/tests.py` exits non-zero with the new
  tests before the change and 0 after.

## Changes

1. Validate `answers` before scoring, in the view or a serializer: every key names an existing
   question, every value is an integer from 0 to 3; otherwise respond 400 and store nothing.
   *V01-AC-1, V01-AC-2, V01-AC-3.*
2. Accept only JSON integers (OD-3 default): reject floats, strings, booleans and `null`. *V01-AC-3.*
3. Keep accepting partial submissions (OD-4 default). *V01-AC-5.*
4. Leave `assessments/scoring.py` as it is. *V01-AC-6.*
5. Make `test_create_assessment` send a valid value; valid submissions still return 201. *V01-AC-4.*

## Gate

- **V01-AC-1** — A submission with an answer value outside 0–3 (5, -1) returns 400 and stores no `AssessmentSubmission`. *Verify:* `docker compose run --rm web pytest assessments/tests.py` exits 0 with the tests for 5 and -1.
- **V01-AC-2** — A submission naming a question ID that does not exist returns 400 and stores nothing. *Verify:* the same command exits 0 with the unknown-ID test.
- **V01-AC-3** — Per OD-3 (default): a value that is not a JSON integer (`1.5`, `2.0`, `"2"`, `true`, `null`) returns 400 and stores nothing. *Verify:* the same command exits 0 with a test for each of these values.
- **V01-AC-4** — A valid submission (integers 0–3 for existing questions) still returns 201 with `trait_scores_0_3` and `dimension_averages_0_10`, and no test sends an out-of-range value expecting 201. *Verify:* the same command exits 0, and every line `grep -nE ":\s*5\s*\}" assessments/tests.py` prints belongs to a test that expects 400.
- **V01-AC-5** — Per OD-4 (default): a submission answering only some of the questions is still accepted with 201. *Verify:* the same command exits 0 with a partial-submission test.
- **V01-AC-6** — Scoring for valid answers is unchanged (principle 3). *Verify:* `git diff main --stat -- assessments/scoring.py` prints nothing.

## Risks

- The SPA sends only integers 0–3 (`frontend/src/pages/Assessment.jsx`), so it is unaffected; other
  clients that send strings would now get 400 (OD-3).
- The SPA shows no specific message for a 400; not changed here.
- Without C01, the evidence is the local `docker compose run` result; with C01 merged, the CI run.
