# Troubleshooting and recovery

### The sync says unchanged

This is the expected fast path. Source heads match `generated/sources.lock.json`,
so no generated file is rewritten. Use `--from-lock` to rebuild deliberately.

### A sync failed

The generated directory is replaced only after the build and integrity checks
pass. Inspect the structured error, fix the source or policy violation, and rerun
the command. The previous catalog remains the last known good snapshot.

### A source moved or was deleted

Do not edit generated SHAs by hand. Run a live dry run, inspect the source and
plugin change report, and rerun a complete-content build once the upstream source
is valid. A revoked or unavailable release should be blocked by Control Plane.

### Reproduce a release

Check out the marketplace commit, install the locked Bun dependencies, and run
the synchronization command with the exact `sources.lock.json`. Compare all
files under `generated/` and run `validate` plus `verify-integrity`.
