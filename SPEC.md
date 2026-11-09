# SPEC

The architecture, principles and conventions of this repository. The work is planned as nodes in
`docs/graph.yaml`, each specified in `nodes/<ID>-<name>.md`. Authority order: this file,
`docs/graph.yaml`, the node spec, then `AGENTS.md`.

## What this is

A web app that scores a user's 62 answers (Likert, 0–3) into 36 trait scores and matches the user
to historical figures whose trait scores an LLM produced. It includes the figure-ingestion pipeline
(LLM scoring against `RUBRIC.md`, Wikipedia name resolution and images) and the Docker deploy stack
(`docker-compose.yml` for development, `docker-compose.prod.yml` for production).

**Non-goals** (owner answers Q1, Q14):
- a clinically validated psychometric test;
- native mobile apps;
- payments;
- deployment beyond the two compose files (no Kubernetes manifests; the Kubernetes notes in
  `DEVELOPMENT.md` are not planned work).

## Already built (owner answer Q2)

Everything on `main` when this plan was adopted is done and is not a node: the assessment and its
scoring, matching against all figures with stored results, 140 scored figures, the ingestion
pipeline with confidence refinement, the four LLM profiles (`openai-o3`, `openai-gpt4`, `anthropic`,
`ollama`) plus the legacy `custom` profile, the React SPA, and the production stack. Nodes build on
it; they do not rebuild it.

## Principles (owner answer Q4)

Every change respects these:
1. `personliness/traits.py` is the only list of traits. `RUBRIC.md`, the questions and the frontend
   agree with it.
2. `QUESTIONNAIRE.md` is the source for questions; `fixtures/questions.json` matches it.
3. Scores are 0–3. Matching is mean absolute difference; overall = (core×5 + heinlein)/6. Stored
   matches are not recomputed.
4. One fixture file per figure: `fixtures/figures/<slug>.json`.
5. Tests make no network or LLM calls (mock them). Secrets come only from the environment.
   (The hard-coded development fallback `SECRET_KEY` and the development compose file's fixed keys
   predate this plan; what to do about them is open decision OD-1.)

Testing constraints (owner answers Q5–Q7):
- `pytest` is the test command (it collects the pytest-style and the `TestCase` tests;
  `manage.py test` misses the former).
- Tests run against PostgreSQL, the production engine; there is no SQLite switch.
- CI runs the backend tests on pull requests (node C01). There is no linter for now; the frontend's
  only check is its image build (`npm run build` inside `frontend/Dockerfile`).

## Architecture

- **Backend:** Django + Django REST Framework + simplejwt. Project package `personliness/`
  (`settings.py`, `traits.py`, `celery.py`, `urls.py`). App `assessments/` (questions, submissions,
  `scoring.py`, API views). App `figures/` (historical figures, ingestion requests, `tasks.py` with
  the Celery LLM scoring task, `llm_utils.py`, `wikipedia_utils.py`, management commands
  `export_figures` and `fetch_missing_images`).
- **Scoring:** `assessments/scoring.py` turns answers into 21 core traits in 5 dimensions plus 15
  Heinlein traits, and ranks figures by mean absolute difference. Results are stored with the
  submission.
- **API auth:** assessment endpoints require a JWT; the question and figure lists are public;
  ingestion needs the `X-Admin-API-Key` header.
- **Workers:** Celery with Redis runs figure ingestion; `RUBRIC.md` is read at runtime as the
  LLM prompt.
- **Data:** `fixtures/questions.json` and `fixtures/figures/<slug>.json` are application data that
  `entrypoint.sh` loads on first boot. They are not test fixtures.
- **Frontend:** `frontend/`, React + Vite + Tailwind SPA, no tests.
- **Deploy:** `Dockerfile` (web and worker image), `frontend/Dockerfile` (dev, build, prod nginx),
  `entrypoint.sh` (wait for PostgreSQL, migrate, collectstatic, load fixtures, optional superuser,
  gunicorn). CI (`.github/workflows/docker-publish.yml`) builds both images for amd64 and arm64 and
  publishes them from `main`; it runs no tests until C01.
- **Tests today:** `assessments/tests.py` (4 pytest-style tests) and `figures/tests.py`
  (`TraitSyncTest`, which fails on `main`: it expects 34 traits, the code has 36; T01 fixes it).

## Node spec template

Each `nodes/<ID>-<name>.md` has:
- the title `# <ID> — <name>`;
- a header row `| Track | Deps | Unlocks | Size |` matching `docs/graph.yaml` (`none` when empty;
  Unlocks are the nodes that depend on this one);
- **Owns:** the paths the node creates or changes;
- these headings, in order:
  - `## Purpose`: why the node exists and what it builds on;
  - `## Tests`: the tests the tester writes, by file, and the red target;
  - `## Changes`: numbered changes, each naming the criterion it produces (*<ID>-AC-n.*);
  - `## Gate`: criteria, one line each, `- **<ID>-AC-<n>** — … *Verify:* …`, numbered from 1;
  - `## Risks`: what could go wrong and what the node does not do.

## Open decisions

Each has a default the nodes follow until the owner decides otherwise.

- **OD-1 Insecure defaults** (Q11; node H01). The settings fall back to a hard-coded `SECRET_KEY`,
  `DEBUG` defaults to True, and `entrypoint.sh` creates superuser `admin`/`admin` unless told
  otherwise. *Default:* `later` track; when `DEBUG` is off the app refuses to start without a real
  `DJANGO_SECRET_KEY` (unset, empty, or the built-in fallback). The `DEBUG` default and the superuser
  default stay as they are.
- **OD-2 LICENSE paths** (Q13; node D01). `LICENSE` names `rubric/`, `evaluations/`, `content/` and
  `config/`, which do not exist. *Default:* `LICENSE` is unchanged; no node edits it.
- **OD-3 Accepted answer types** (node V01). The owner settled the range (0–3) and unknown question
  IDs (HTTP 400), not the types. *Default:* only JSON integers 0, 1, 2, 3 are accepted; floats
  (`1.5`, `2.0`), strings (`"2"`), booleans and `null` are rejected with 400. The SPA already sends
  integers.
- **OD-4 Partial submissions** (node V01). *Default:* accepted as today: any subset of question IDs,
  including none, is scored; V01 does not require all 62 answers.
- **OD-5 Coverage** (node C01). `DEVELOPMENT.md` documents `pytest --cov=…`, but `pytest-cov` is not
  in `requirements.txt`. *Default:* no coverage tool; the documented command becomes plain `pytest`.
- **OD-6 Track of the LLM-default change** (Q10; node D02). The owner settled the default
  (`anthropic`, refinement off, everywhere), not when. *Default:* `later`, with the other drift work
  (Q3 d).

## Conventions

- Branches: `node/<ID>-<name>` for a node, `spec/<topic>` for a change to the plan.
- Build a node with `/noodlebot:node <ID>`; see `AGENTS.md`, "Building a node".
- Sizes: S under a day, M two or three days, L more.
- Tracks: `now` is built first; `later` waits until the owner moves it.
- A node is done when its PR is merged with every criterion's evidence (command and result, or the
  CI run) in the PR, and `python3 -I <plugin dir>/skills/node/check-regime.py --root .` prints
  `PROBLEMS 0`.
- A change to the plan (a new node, a moved track, a settled open decision) is a `spec/<topic>` PR
  that edits this file, `docs/graph.yaml` and the node specs together.
