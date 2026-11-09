# C01 — ci-backend-tests

| Track | Deps | Unlocks | Size |
|---|---|---|---|
| now | T01 | none | S |

**Owns:** `.github/workflows/tests.yml` (new), the testing sections of `README.md` ("Development
Workflow") and `DEVELOPMENT.md` ("Testing")

## Purpose

CI (`.github/workflows/docker-publish.yml`) builds and publishes the images but runs no tests. The
owner wants a test job on pull requests (Q7), `pytest` as the test command (Q5) and a PostgreSQL
service container, the production engine, with no SQLite switch (Q6). No linter for now (Q7). The
documented `docker compose run --rm web python manage.py test` misses the 4 pytest-style tests in
`assessments/tests.py`; `pytest` (configured by `pytest.ini`) collects all of them. Depends on T01:
until `TraitSyncTest` passes, the new job would be red.

## Tests

- No new test files: the node's evidence is the workflow file and its runs on the node's PR.
- Red target: `test -f .github/workflows/tests.yml` exits non-zero on `main` and 0 after; the PR's
  checks show the new job green.

## Changes

1. Add `.github/workflows/tests.yml`: on `pull_request` and `push` to `main`, one job on
   `ubuntu-24.04` with a `postgres:15` service container (the compose file's version), Python 3.12
   (the `Dockerfile`'s version), `pip install -r requirements.txt`, then `pytest`. *C01-AC-1, C01-AC-2.*
2. Pass the database through the existing environment variables (`POSTGRES_HOST`, `POSTGRES_PORT`,
   `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`); do not change `personliness/settings.py`.
   *C01-AC-2.*
3. Let a failing test fail the job: no `continue-on-error`, no `|| true`. *C01-AC-4.*
4. Use no secrets and no LLM keys in the job. *C01-AC-5.*
5. In `README.md` and `DEVELOPMENT.md`, document `docker compose run --rm web pytest` (and plain
   `pytest` in a local venv with PostgreSQL reachable) instead of `manage.py test` and
   `pytest --cov=…` (OD-5 default: no coverage tool). *C01-AC-6.*
6. Run the job on the node's PR and record the run. *C01-AC-3.*

## Gate

- **C01-AC-1** — A workflow `.github/workflows/tests.yml` runs on every pull request to `main` and every push to `main`. *Verify:* `grep -nE "pull_request|push|main" .github/workflows/tests.yml` shows both triggers on `main`, and the node's PR lists the job among its checks.
- **C01-AC-2** — The job installs `requirements.txt` on Python 3.12 and runs `pytest` against a `postgres:15` service container, reached through the `POSTGRES_*` variables; `personliness/settings.py` is unchanged. *Verify:* `grep -nE "postgres:15|3\.12|requirements.txt|pytest|POSTGRES_HOST" .github/workflows/tests.yml` shows each, and `git diff main --stat -- personliness/settings.py` prints nothing.
- **C01-AC-3** — On the node's PR the job passes and runs every test on `main` (at least 5 tests) with none failed or erroring. *Verify:* the PR's run URL; its log's pytest summary reads `N passed` with N ≥ 5 and no `failed` or `error`.
- **C01-AC-4** — A failing test fails the job. *Verify:* `grep -nE "continue-on-error|\|\| *true" .github/workflows/tests.yml` prints nothing.
- **C01-AC-5** — The job uses no secrets and no LLM API keys (principle 5). *Verify:* `grep -nE "secrets\.|API_KEY" .github/workflows/tests.yml` prints nothing.
- **C01-AC-6** — `README.md` and `DEVELOPMENT.md` name `docker compose run --rm web pytest` as the test command and no longer document `manage.py test` or `--cov`. *Verify:* `grep -nE "manage.py test|--cov" README.md DEVELOPMENT.md` prints nothing, and `grep -n "docker compose run --rm web pytest" README.md DEVELOPMENT.md` shows a line in each file.

## Risks

- The image-publishing workflow is not touched; the frontend's only check stays its image build.
- `pytest-django` creates a test database; the service container's user must be allowed to (the
  official image's `POSTGRES_USER` is a superuser).
- D01 and D02 also edit `README.md`, in other sections; a later node rebases on this one.
- Not done here: a linter (Q7), coverage (OD-5), frontend tests.
