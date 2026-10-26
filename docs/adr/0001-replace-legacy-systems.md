# Build our own ERP to replace Accurate and gaji.id

We are building an in-house ERP that fully replaces Accurate (accounting) and gaji.id (payroll), rather than an integration hub on top of them. We want all data in one database we control, an end to two subscriptions, and a foundation that an AI agent can later operate on. This means we take on PPh 21, BPJS and (where a Company is PKP) PPN compliance ourselves.

## Considered Options

- **Integration hub** (keep both systems, sync via their APIs): cheaper and lower risk, rejected because data would stay split across two vendors and the AI agent would depend on third-party APIs.
- **Staged replacement starting from a hub**: rejected in favour of building directly, since the hub code would be thrown away.

## Consequences

- Scope is driven by the Usage Audit: Legacy System features that are not actually used are not rebuilt.
- Tax and payroll calculations are the highest-risk code and must be verified by Parallel Run before Cutover (see ADR-0004).
