# D01 — docs-match-code

| Track | Deps | Unlocks | Size |
|---|---|---|---|
| later | none | none | S |

**Owns:** `README.md` (project tree, fixture and entrypoint descriptions, "Via Fixture"),
`DEVELOPMENT.md` (fixture commands), `start.sh`

## Purpose

The docs have drifted from the code (Q13, Q3 d). README's project tree lists
`fixtures/historical_figures.json`, `fixtures/sample_figures.json` and a root `nginx.prod.conf`;
the files are `fixtures/figures/<slug>.json` and `frontend/nginx.prod.conf`. README says the
entrypoint loads a `historical_figures` fixture; `entrypoint.sh` loads `questions` and each
`fixtures/figures/*.json`. README's "Via Fixture" command loads the missing
`fixtures/sample_figures.json`. `start.sh` calls `docker-compose` (v1) and asks for
`OPENAI_API_KEY`, while `.env.example` uses `LLM_OPENAI_API_KEY` / `LLM_ANTHROPIC_API_KEY`.
`LICENSE` names directories that do not exist, but its paths are the owner's (OD-2): not changed.
The test command is C01's, the LLM defaults D02's; the Kubernetes notes stay (Q14).

## Tests

- No test files: documentation and a shell script. The evidence is the commands below.
- Red target: `grep -nE "historical_figures|sample_figures" README.md` prints lines on `main`
  (grep exits 0); after the change it prints nothing (`! grep -nE … README.md` exits 0).

## Changes

1. Correct README's project tree: `fixtures/figures/<slug>.json`, `frontend/nginx.prod.conf`.
   *D01-AC-1.*
2. Correct README's description of what the entrypoint loads. *D01-AC-1.*
3. Make README's "Via Fixture" command, and any `loaddata` in `DEVELOPMENT.md`, load files that
   exist. *D01-AC-2.*
4. In `start.sh`, use `docker compose` and name `LLM_OPENAI_API_KEY` / `LLM_ANTHROPIC_API_KEY`.
   *D01-AC-3.*
5. Leave `LICENSE` as it is (OD-2 default). *D01-AC-4.*

## Gate

- **D01-AC-1** — README names no `historical_figures` or `sample_figures` fixture, and its tree shows `nginx.prod.conf` under `frontend/`. *Verify:* `grep -nE "historical_figures|sample_figures" README.md` prints nothing, and in README's "Project Structure" block `nginx.prod.conf` appears only indented under `frontend/`.
- **D01-AC-2** — Every `loaddata` argument in `README.md` and `DEVELOPMENT.md` names a fixture that exists. *Verify:* `grep -ohE "loaddata [^ ]+" README.md DEVELOPMENT.md` lists them, and each is `questions` (`fixtures/questions.json`) or a path or glob under `fixtures/` that `ls` finds.
- **D01-AC-3** — `start.sh` uses `docker compose` and the LLM key names of `.env.example`. *Verify:* `grep -n "docker-compose" start.sh` and `grep -nE "(^|[^_])OPENAI_API_KEY" start.sh` print nothing, and `bash -n start.sh` exits 0.
- **D01-AC-4** — `LICENSE` is unchanged (OD-2). *Verify:* `git diff main --stat -- LICENSE` prints nothing.

## Risks

- C01 and D02 edit other sections of `README.md`; whichever lands later rebases.
- `start.sh` is not run here (it starts the Docker stack); `bash -n` checks only its syntax.
- Not done here: `LICENSE` (OD-2), the test command (C01), the LLM defaults (D02), Kubernetes (Q14).
