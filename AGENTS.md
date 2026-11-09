# AGENTS.md

Guidance for coding agents in this repository. The architecture, principles and open decisions are
in `SPEC.md`; the planned work is in `docs/graph.yaml` and `nodes/<ID>-<name>.md`.

## Building a node

- **Build a node** with `/noodlebot:node <ID>` (for example `/noodlebot:node T01`), on a branch
  `node/<ID>-<name>`. Pick a node whose deps are merged; `track: now` before `track: later`.
- **Authority order:** `SPEC.md`, then `docs/graph.yaml`, then the node spec
  `nodes/<ID>-<name>.md`, then this file. A conflict between them is a spec change
  (`spec/<topic>` branch), not something a node settles.
- **Role agents:** the plugin's tester, implementer and reviewer; this repository has none of its
  own. The tester writes only test paths, the implementer no test or spec paths, the reviewer
  nothing.
- **Spec checker:** `python3 -I <plugin dir>/skills/node/check-regime.py --root .` must print
  `PROBLEMS 0` after any change to `SPEC.md`, `docs/graph.yaml` or `nodes/`.
- **Commands that exist:**
  - Backend tests: `docker compose run --rm web pytest` (starts the `db` service; `pytest.ini`
    sets the settings module and collects `assessments/` and `figures/`). In a local venv:
    `pip install -r requirements.txt`, PostgreSQL reachable through `POSTGRES_HOST` etc., then
    `pytest`. Use `pytest`, not `manage.py test`: the latter misses the pytest-style tests.
    Tests need PostgreSQL; there is no SQLite switch.
  - Frontend build: `cd frontend && npm install && npm run build` (no frontend tests, no lint).
  - Lint: none.
  - CI: `.github/workflows/docker-publish.yml` builds the `web` and `frontend` images (the latter
    runs `npm run build`) on every pull request; it runs no tests until node C01 adds
    `.github/workflows/tests.yml`.
- **Red target:** a command that exits non-zero before the node's change and 0 after, usually
  `docker compose run --rm web pytest <file>::<test>`; a node spec may name another (for example a
  `python3 -I -c …` check on `personliness/settings.py`, which imports only `os` and `pathlib`).
- **Test paths** (`.noodlebot/roles.yaml`): `**/tests.py`, `**/test_*.py`, `**/tests/**`.
  `conftest.py` is not a test path under this config; add it to `tests:` in a spec change if a node
  needs one.
- **Fixture paths:** `fixtures/questions.json` and `fixtures/figures/<slug>.json` are application
  data loaded by `entrypoint.sh`, not test fixtures: writing them is implementation work and must
  follow `SPEC.md` principles 1, 2 and 4. Test data lives in the test files.
- **Tests make no network or LLM calls** (mock them) and use no real secrets.
- **Porting rules:** none.
- **CI evidence to record** in the node's PR: the run URL and result of the image build workflow
  (both images build) and, once C01 is merged, of the test job with its pytest summary line
  (`N passed`). A criterion verified locally records the command and its exit status.
