@AGENTS.md

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`myogin/erp`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Dependencies

After adding or removing a dependency, regenerate the lockfile from scratch (`rm -rf node_modules package-lock.json && npm install`) and run `npm run check:docker` (a full image build, as Easypanel does it, with no database configured). An incremental `npm install` on macOS can drop Linux-only optional packages (e.g. `@emnapi/*`), which makes `npm ci` fail in the Easypanel build.
