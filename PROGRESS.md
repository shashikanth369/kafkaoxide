# kafkaoxide Phase 0 — Progress

Working branch: `worktree-phase0-foundation`
Worktree path: `.claude/worktrees/phase0-foundation`
Plan: `docs/superpowers/plans/2026-08-18-phase0-foundation.md`
Executing via: superpowers:subagent-driven-development (implementer → spec review → code-quality review per task)

## Status: Task 9 fixed and approved. Proceeding through Task 10-12.

## Done (implemented, spec-reviewed ✅, code-quality reviewed)

- **Task 1** — Workspace scaffold + `kafkaoxide-core`. Approved (fixed: redacted `sasl_password` from `NewConnection`'s `Debug` output).
- **Task 2** — `kafkaoxide-db`. Approved (fixed: `tabs::delete` not-found consistency, `tabs::create` TOCTOU race wrapped in a transaction).
- **Task 3** — `kafkaoxide-secrets`. Approved with minor notes (no fixes needed).
- **Task 4** — `kafkaoxide-kafka`. Approved (hardened the `rdkafka-sys` vendored-C build workaround: `.build-stubs/curl/curl.h` uses an `#include_next` forwarding shim instead of a plain empty stub, so it can't shadow a real `curl.h` on a future machine with libcurl installed — independently verified with a `gcc -E` reproduction).
- **Task 5** — `kafkaoxide-app` (Tauri wiring). Approved with minor notes. Build not verified in this sandbox — no `pkg-config`/webkit2gtk-dev/libdbus-dev installed, no passwordless sudo. Confirmed via independent review that every build failure traces to `failed to run custom build command for <gtk/dbus sys-crate>`, zero actual Rust compile errors. **To verify for real: install `pkg-config libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev libayatana-appindicator3-dev librsvg2-dev`, then `cargo build -p kafkaoxide-app`.**
- **Task 6** — Frontend scaffold (Vite/React/TS/Vitest). Approved (added `src/lib/testInvoke.test.ts` to actually exercise `setInvokeHandlers`, which was previously unverified).
- **Task 7** — Theme system (hover-preview switcher). Approved with minor notes. Not yet wired into `App.tsx` — expected, that's Task 11.
- **Task 8** — Tabs feature (`useTabsStore`, `TabBar`). Approved with minor notes, but reviewer flagged two **Important, deferred-not-fixed** items to revisit at Task 11 wiring time:
  - No error handling on `addTab`/`renameTab`/`loadTabs` — a failed mutation closes the rename box / does nothing on the "+" button with zero user feedback.
  - `role="tab"` divs have no keyboard operability (no `tabIndex`, no Enter/Space handler) — breaks the implicit ARIA tab-role contract.
- **Task 9** — Connections feature (`ConnectionForm`, `ConnectionTree`, `useConnections`). Spec-compliant ✅. Code-quality review initially returned "Needs changes" (4 findings); fixed in commit `3100e02` (submit try/catch + pending/disabled state + visible error alert, `saslPassword` cleared only on success, `role="tree"`/`role="treeitem"` dropped in favor of plain `ul`/`li` + `data-testid`, added `useUpdateConnection` mirroring `useCreateConnection`). Independent re-review: **Approved** (verified `npm run test` 21/21 and `npx tsc --noEmit` clean independently, confirmed no leftover ARIA role dependencies, confirmed password preserved on failure/cleared on success).

## Not started

- **Task 10** — Bottom panel (Logs tool): `useLogsStore`, `useLogsListener` (Tauri `listen("log", ...)`), `LogsPanel`, `BottomPanel`.
- **Task 11** — Wire the full app shell (`App.tsx`, `global.css`): assemble tabs + sidebar (form/tree) + main + bottom panel. **This is also the natural point to fix the two deferred Task 8 (tabs) accessibility/error-surfacing notes**, since that's where they become user-facing.
- **Task 12** — Full workspace verification: `cargo test --workspace`, `npm run test`/`build`, and (only if system packages get installed) a live `cargo build -p kafkaoxide-app` + manual `npm run tauri dev` smoke test.

## Environment notes carried forward

- This sandbox lacks `pkg-config` and Linux GTK/dbus/webkit2gtk dev packages — `kafkaoxide-app` (and only that crate) can't fully build/link here. All library crates (core/db/secrets/kafka) and the frontend build/test fine.
- `rdkafka`'s vendored librdkafka build works (cmake/gcc/libclang all present) but needed the `.build-stubs/curl/curl.h` + `.cargo/config.toml` CPATH workaround for a genuine upstream `rdkafka-sys` bug (`#ifdef` vs `#if` around `WITH_OAUTHBEARER_OIDC`).
