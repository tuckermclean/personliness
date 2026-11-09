# H01 — harden-secret-key

| Track | Deps | Unlocks | Size |
|---|---|---|---|
| later | none | none | S |

**Owns:** `personliness/settings.py` (the `SECRET_KEY` block), `personliness/tests.py` (new),
`pytest.ini` (`testpaths`), `README.md` (production section)

## Purpose

`personliness/settings.py` falls back to a hard-coded `SECRET_KEY` when `DJANGO_SECRET_KEY` is
unset, so a production deployment that forgets the variable runs with a public key. `DEBUG`
defaults to True and `entrypoint.sh` creates `admin`/`admin` unless told otherwise. The owner left
this open (Q11, OD-1); this node follows the default: when `DEBUG` is off, the app refuses to start
without a real `DJANGO_SECRET_KEY`. The `DEBUG` default, the superuser default and the development
compose file stay as they are until the owner decides otherwise. `docker-compose.prod.yml` already
sets `DEBUG: "False"` and passes `DJANGO_SECRET_KEY` from the environment.

## Tests

- `personliness/tests.py` (new): load the settings in a subprocess (`python -c "import
  personliness.settings"`) under each environment of the Gate and check the exit status and the
  message; no database, no network.
- Red target: `docker compose run --rm web pytest personliness/tests.py` exits non-zero before the
  change (settings load with `DEBUG=False` and no key) and 0 after.

## Changes

1. In `personliness/settings.py`, when `DEBUG` is off and `DJANGO_SECRET_KEY` is unset, empty or
   the built-in fallback, raise `django.core.exceptions.ImproperlyConfigured` naming
   `DJANGO_SECRET_KEY`. *H01-AC-1, H01-AC-2.*
2. Keep the fallback key when `DEBUG` is on. *H01-AC-3.*
3. Add `personliness` to `testpaths` in `pytest.ini`. *H01-AC-4.*
4. Leave `entrypoint.sh` and `docker-compose.yml` as they are (OD-1 default). *H01-AC-5.*
5. In README's production section, state that `DJANGO_SECRET_KEY` must be set. *H01-AC-6.*

## Gate

- **H01-AC-1** — Per OD-1 (default): with `DEBUG=False` and `DJANGO_SECRET_KEY` unset, empty, or equal to the built-in fallback, loading the settings fails with `ImproperlyConfigured` naming `DJANGO_SECRET_KEY`. *Verify:* `docker compose run --rm web pytest personliness/tests.py` exits 0 with a test for each of the three cases.
- **H01-AC-2** — With `DEBUG=False` and a non-empty key other than the fallback, the settings load. *Verify:* the same command exits 0 with that test.
- **H01-AC-3** — With `DEBUG` unset or `True`, the settings load without `DJANGO_SECRET_KEY` (development unchanged). *Verify:* the same command exits 0 with that test.
- **H01-AC-4** — `pytest` with no arguments collects the new tests. *Verify:* `docker compose run --rm web pytest --collect-only -q` lists `personliness/tests.py`.
- **H01-AC-5** — The superuser default and the development compose file are unchanged (OD-1). *Verify:* `git diff main --stat -- entrypoint.sh docker-compose.yml` prints nothing.
- **H01-AC-6** — README's production section says `DJANGO_SECRET_KEY` must be set and that the app will not start without it. *Verify:* `grep -n "DJANGO_SECRET_KEY" README.md` shows that statement in the production section.

## Risks

- A production deployment without `DJANGO_SECRET_KEY` that works today stops starting; that is the
  point, and the PR says so.
- The test command used in the subprocess must run with `DJANGO_SETTINGS_MODULE` unset or pointing at
  `personliness.settings` and with a cleaned environment, or the container's `DEBUG=True` leaks in.
- Not done here: the `DEBUG` default, the `admin`/`admin` superuser, the fixed `ADMIN_API_KEY` in
  `docker-compose.yml` (OD-1).
