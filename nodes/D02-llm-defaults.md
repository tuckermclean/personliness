# D02 — llm-defaults

| Track | Deps | Unlocks | Size |
|---|---|---|---|
| later | none | none | S |

**Owns:** `personliness/settings.py` (the `LLM_ACTIVE_CONFIG` and `LLM_ENABLE_REFINEMENT`
defaults), `docker-compose.yml`, `docker-compose.prod.yml`, `README.md` (LLM configuration section)

## Purpose

The default LLM profile disagrees across the repository: `.env.example` says `anthropic` with
refinement off (the latest intent, commit "Change default LLM to anthropic, no refinement"), while
`settings.py`, both compose files and the README say `openai-o3` with refinement on. The owner
settled it (Q10): `anthropic`, refinement off, everywhere. When to do it is open (OD-6, default
`later`). The four profiles and the legacy `custom` fallback are already built and keep working.

## Tests

- No test file: a pytest test under `personliness/` is not collected until H01 adds it to
  `testpaths`, and D02 does not depend on H01. The evidence is the commands of the Gate, which load
  `personliness/settings.py` (it imports only `os` and `pathlib`) with a cleared environment and make
  no network or LLM call.
- Red target: `env -i PATH="$PATH" python3 -I -c "import runpy,sys; s=runpy.run_path('personliness/settings.py'); sys.exit((s['LLM_ACTIVE_CONFIG'], s['LLM_ENABLE_REFINEMENT']) != ('anthropic', False))"`
  exits 1 on `main` today and 0 after.

## Changes

1. In `personliness/settings.py`, default `LLM_ACTIVE_CONFIG` to `anthropic` and
   `LLM_ENABLE_REFINEMENT` to False; leave the legacy `custom` fallback as it is.
   *D02-AC-1, D02-AC-2.*
2. In `docker-compose.yml` and `docker-compose.prod.yml`, default `${LLM_ACTIVE_CONFIG:-anthropic}`
   and `${LLM_ENABLE_REFINEMENT:-False}` wherever they are set. *D02-AC-3.*
3. In `README.md`, name `anthropic` as the default profile and refinement as off by default, as in
   `.env.example`; leave `.env.example` as it is. *D02-AC-4.*

## Gate

- **D02-AC-1** — With no LLM variables set, the settings give `LLM_ACTIVE_CONFIG == 'anthropic'` and `LLM_ENABLE_REFINEMENT is False`. *Verify:* `env -i PATH="$PATH" python3 -I -c "import runpy; s=runpy.run_path('personliness/settings.py'); print(s['LLM_ACTIVE_CONFIG'], s['LLM_ENABLE_REFINEMENT'])"` prints `anthropic False` (it prints `openai-o3 True` on `main`).
- **D02-AC-2** — The legacy fallback is unchanged: with `LLM_BASE_URL` set and `LLM_ACTIVE_CONFIG` unset, the active profile is `custom`. *Verify:* the command of D02-AC-1 with `LLM_BASE_URL=http://example.invalid` after `env -i PATH="$PATH"` prints `custom False`.
- **D02-AC-3** — Both compose files default the profile to `anthropic` and refinement to `False`. *Verify:* `grep -nE "openai-o3|LLM_ENABLE_REFINEMENT:-True" docker-compose.yml docker-compose.prod.yml` prints nothing, and `grep -c "LLM_ACTIVE_CONFIG:-anthropic" docker-compose.yml docker-compose.prod.yml` prints 2 for each file.
- **D02-AC-4** — README names `anthropic` as the default and refinement off by default; `.env.example` is unchanged. *Verify:* `grep -nE "LLM_ACTIVE_CONFIG=openai-o3|LLM_ENABLE_REFINEMENT=True|openai-o3. \(default\)" README.md` prints nothing, and `git diff main --stat -- .env.example` prints nothing.

## Risks

- A deployment that relied on the `openai-o3` default without setting `LLM_ACTIVE_CONFIG` switches
  to Anthropic and needs `LLM_ANTHROPIC_API_KEY`; the PR says so.
- The model names per profile are not changed.
- C01 and D01 edit other sections of `README.md`; whichever lands later rebases.
