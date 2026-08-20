// Placeholder crate: real implementation lands in Task 3 of
// docs/superpowers/plans/2026-08-20-avro-schema-registry-plan.md.
//
// This stub exists only so the workspace root Cargo.toml can list
// `backend/schema-registry` as a member ahead of that task without
// breaking `cargo test -p <other-crate>` in the meantime — cargo 1.96
// fails to load the workspace manifest at all if a listed member
// directory doesn't exist.
