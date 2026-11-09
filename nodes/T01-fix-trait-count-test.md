# T01 — fix-trait-count-test

| Track | Deps | Unlocks | Size |
|---|---|---|---|
| now | none | C01 | S |

**Owns:** `figures/tests.py`, `personliness/traits.py` (docstrings only)

## Purpose

`figures/tests.py`'s `TraitSyncTest` asserts `len(ALL_TRAIT_NAMES) == 34`, but
`personliness/traits.py` defines 36 traits (21 core in 5 dimensions + 15 Heinlein), so the test fails
on `main`. The rubric v2 commit set the assertion to 36 and a later commit set it back to 34. The
owner settled it (Q8): 36 is correct, fix the test. The trait list itself, `RUBRIC.md` and the
fixtures already agree on 36 (principle 1) and are not changed. CI cannot run the backend tests
until this passes (C01).

## Tests

- `figures/tests.py`: `TraitSyncTest` asserts 36 traits in total, 21 in `CORE_TRAIT_NAMES` and 15 in
  `HEINLEIN_TRAIT_NAMES`, and keeps its check that every name appears in `RUBRIC_PROMPT`.
- Red target: `docker compose run --rm web pytest figures/tests.py` exits non-zero on `main` today
  (the 34 assertion) and 0 after the change.

## Changes

1. In `figures/tests.py`, assert 36 traits instead of 34 and fix the docstring. *T01-AC-1, T01-AC-3.*
2. In the same test, assert the 21 core / 15 Heinlein split. *T01-AC-2.*
3. Keep the `RUBRIC_PROMPT` check as it is. *T01-AC-4.*
4. In `personliness/traits.py`, change the two docstrings that say 34 to 36 (no code change). *T01-AC-3.*

## Gate

- **T01-AC-1** — `TraitSyncTest` asserts `len(ALL_TRAIT_NAMES) == 36` and passes. *Verify:* `docker compose run --rm web pytest figures/tests.py` exits 0 (it exits non-zero on `main` before the change).
- **T01-AC-2** — The test also asserts 21 names in `CORE_TRAIT_NAMES` and 15 in `HEINLEIN_TRAIT_NAMES`. *Verify:* the same command exits 0, and `grep -nE "CORE_TRAIT_NAMES|HEINLEIN_TRAIT_NAMES" figures/tests.py` shows both assertions.
- **T01-AC-3** — No trait count of 34 remains in the test or in the docstrings of `personliness/traits.py`. *Verify:* `grep -n "34" figures/tests.py personliness/traits.py` prints nothing.
- **T01-AC-4** — The test still fails when a trait name is missing from `RUBRIC_PROMPT`. *Verify:* `grep -n "RUBRIC_PROMPT" figures/tests.py` shows the missing-names assertion, and the command of T01-AC-1 exits 0.

## Risks

- The change is mostly in a test file, so the implementer has little to write (the `traits.py`
  docstrings). The RED is the test as it fails on `main` today; the tester's commit is the fix of the
  assertion, and the reviewer checks that no trait was added to or removed from `traits.py`.
- The test is a Django `TestCase` and needs PostgreSQL; locally that is the `db` service of
  `docker-compose.yml` (`docker compose run` starts it).
- Not done here: running the tests in CI (C01).
