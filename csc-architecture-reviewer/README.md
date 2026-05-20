# csc-architecture-reviewer

An opinionated, plug-in style PR reviewer for the **Commerce Street Capital** platform.

Reviews pull requests against CSC-specific GCP / Firebase / Cloud Run / Firestore / GCS / Linear conventions, classifies findings by severity and category, and emits both human-readable Markdown and machine-readable JSON. Designed to drop in as a GitHub Action and to also run locally before pushing.

This is **not** a generic code-review bot. It encodes our platform rules — sensitive Firestore collections, the unified Firebase identity model, public-vs-internal Cloud Run conventions, audit-log expectations on compliance flows, etc.

## What it checks (initial rule set)

| Rule ID | Severity | What |
|---|---|---|
| `CSC-SEC-001` | BLOCKER | Hardcoded secrets, committed `.env`, service account JSON |
| `CSC-GCS-001` | HIGH | Public bucket / public file / overly broad signed URLs |
| `CSC-FS-001` | HIGH | Client-side Firestore writes to sensitive collections |
| `CSC-AUDIT-001` | MEDIUM/HIGH | Sensitive action without an audit log entry |
| `CSC-IAM-001` | HIGH | Broad IAM grants (Owner / Editor / `*Admin` / wildcards) |
| `CSC-RUN-001` | HIGH | Public/unauthenticated Cloud Run ingress |
| `CSC-CONFIG-001` | MEDIUM | Env var introduced without docs/deploy wiring |
| `CSC-AUTH-001` | HIGH | Parallel auth system bypassing Firebase Auth |
| `CSC-UI-001` | LOW | Duplicate of a shared UI component |
| `CSC-LINEAR-001` | MEDIUM | PR is missing a Linear issue reference |
| `CSC-DEPS-001` | MEDIUM/HIGH | New risky / loosely pinned dependency |
| `CSC-SERVER-001` | BLOCKER/HIGH | eval, shell injection, traversal, CORS *, disabled TLS, unrestricted uploads |
| `CSC-COMP-001` | HIGH | Compliance / NDA / approval flow without auth + audit |
| `CSC-DATA-001` | MEDIUM | New Firestore collection without schema/config docs |
| `CSC-BLAST-001` | INFO/MEDIUM | Multi-module PR — surfaces blast radius |

## Quick start (local)

```bash
cd csc-architecture-reviewer
npm install

# Review the current branch against origin/main
node src/index.js \
  --base origin/main \
  --head HEAD \
  --output ../csc-review.md \
  --json-output ../csc-review.json \
  --fail-on BLOCKER
```

Or via the npm script from anywhere inside this subdir:

```bash
npm run csc:review -- --base origin/main --head HEAD --output review.md
```

## GitHub Actions

See [`.github/workflows/csc-review.yml`](.github/workflows/csc-review.yml) for a copy-paste reusable workflow. The Action:

1. Checks out the PR with full history.
2. Fetches the base branch so `git diff base...head` works.
3. Installs deps and runs the reviewer.
4. Posts (or updates) a single PR comment with the Markdown summary.
5. Uploads `csc-review.md` and `csc-review.json` as artifacts.
6. Fails CI **only on BLOCKER findings** by default (configurable via `--fail-on`).

The reviewer never sends code outside GitHub — `--post-comment` writes back through the standard GitHub REST API using the action's own `GITHUB_TOKEN`.

## Verdicts

- **PASS** — no findings, or only INFO findings.
- **PASS_WITH_WARNINGS** — HIGH/MEDIUM/LOW findings present but no BLOCKERs. Safe to merge after either fixing them or explicitly suppressing with a reason.
- **FAIL** — at least one BLOCKER. CI exits 1 with the default `--fail-on BLOCKER`.

## Configuration

The reviewer loads the first config file it finds, in this order:

1. `--config <path>` argument
2. `csc-reviewer.config.yaml` in the working directory
3. `.csc-reviewer.yaml` in the working directory
4. The bundled [`reviewer.config.yaml`](reviewer.config.yaml) defaults

Notable knobs:

```yaml
allowed_linear_prefixes: [CSC, CRM, VDR, PLAT]
allow_public_cloud_run_services: [about-site]
allow_public_buckets: []
sensitive_firestore_collections: [users, deals, documents, ...]
audit_log_surface_globs: ["**/vdr/**", "**/compliance/**", ...]
modules: { CRM: ["**/crm/**"], VDR: ["**/vdr/**"], ... }
risky_dependencies: { auth: ["jsonwebtoken", ...], crypto: [...] }
severity_overrides: { CSC-UI-001: LOW }
disabled_rules: []
```

## Suppressing false positives

Inline (works in any source file because rules scan added lines):

```js
// csc-reviewer-disable-next-line CSC-GCS-001 -- public marketing asset, approved
bucket.file("hero.jpg").makePublic();
```

Or whole-file:

```yaml
# csc-reviewer-disable CSC-DATA-001 -- migration script, schema doc lives in PR #423
```

A reason after `--` is encouraged for any suppression. The reviewer keeps the reason in the audit trail (JSON `meta.suppressions` is planned for v0.2).

You can also disable a rule globally via `disabled_rules: [CSC-UI-001]` in the config.

## Linear / GitHub workflow checks

v1 detects Linear keys from:

- the **branch name** (`feature/CRM-142-pipeline-filters`)
- the **PR title** (passed via `--pr-title` or `GITHUB_PR_TITLE`)
- **commit messages** in the diff range

A future v2 adapter (`src/linear.js` → `fetchIssueMetadata`) can pull issue title, status, labels, project, priority, acceptance criteria, and linked PRs when `LINEAR_API_KEY` is configured — designed to be additive, not required.

## How it fits the CSC architecture

The reviewer evaluates each PR against the platform model:

- **Unified Firebase identity** — flags parallel auth systems (CSC-AUTH-001).
- **Cloud Run standardization** — flags public ingress except on allow-listed surfaces (CSC-RUN-001).
- **Shared Firestore/GCS patterns** — flags client writes to sensitive collections and public storage (CSC-FS-001, CSC-GCS-001).
- **Auditability of sensitive workflows** — flags compliance/permission/document changes lacking audit hooks (CSC-AUDIT-001, CSC-COMP-001).
- **Module boundaries (CRM / VDR / Portal / About / Compliance)** — surfaces PR blast radius (CSC-BLAST-001).
- **Shared UI consistency** — flags likely duplicate components (CSC-UI-001).
- **Public vs internal surfaces** — separates the About site from internal services in policy (CSC-RUN-001).
- **Data-model hygiene** — flags new collections without owner/schema docs (CSC-DATA-001).

## Extending it

Add a new rule:

1. Create `src/rules/your-rule.js` exporting `{ id, category, defaultSeverity, description, check(ctx) }`.
2. Register it in `src/rules/index.js`.
3. Add a test in `tests/rules.test.js` using the synthetic file helper.

`check(ctx)` receives:

```js
{
  files: [ { path, status, addedLines: [{lineNumber, text}], newContent, patch } ],
  env:   { branch, prTitle, commitMessages, base, head },
  config,
  suppressions, // already applied for you by the runner — no need to consult it
}
```

Return an array of findings; the runner sorts, dedupes via suppression, and routes severities through `config.severity_overrides`.

## Limitations (v1)

- **No Linear API call** — v1 only detects keys from branch/title/commits. Metadata enrichment is stubbed.
- **No LLM stage** — every check is deterministic regex + glob + structural diff parsing. An optional LLM adapter is planned for v0.2 as a separate rule category.
- **No firestore.rules semantic check** — rule-file diffs are flagged for review but not parsed.
- **No cross-PR audit trail** yet — each run is independent. v0.3 will persist results to GCS / Firestore for an audit log.
- **Glob matcher is minimal** — supports `*`, `**`, `?`, `{a,b}`, `[...]`. No negation.
- **Rules are advisory in noisy areas** (UI duplication, env config) and BLOCKER only when we're highly confident (secrets, eval-with-user-input).

## Roadmap

- v0.2 — LLM adapter (`src/rules/llm-*.js`) for architecture-shape review on flagged hunks; suppression audit trail in JSON output.
- v0.3 — Persist review history to GCS/Firestore for compliance traceability.
- v0.4 — Linear API enrichment: acceptance-criteria check, label/risk consistency, linked-PR detection.
- v0.5 — `firestore.rules` & `storage.rules` semantic diffing.
- v0.6 — Pre-commit hook variant for the most common rules.

## Project layout

```
csc-architecture-reviewer/
├── package.json
├── reviewer.config.yaml          # default config — override per-repo
├── README.md
├── src/
│   ├── index.js                  # CLI entry
│   ├── runner.js                 # orchestrator
│   ├── config.js                 # config loader
│   ├── git-diff.js               # unified-diff parser + git invocations
│   ├── glob.js                   # minimal glob matcher
│   ├── severity.js               # severity ranking + category constants
│   ├── suppressions.js           # inline suppression scanner
│   ├── linear.js                 # Linear key detection + future API adapter
│   ├── github.js                 # PR comment upsert
│   ├── formatters/
│   │   ├── markdown.js
│   │   └── json.js
│   └── rules/
│       ├── index.js
│       ├── secret-leakage.js     # CSC-SEC-001
│       ├── public-gcs.js         # CSC-GCS-001
│       ├── firestore-unsafe-writes.js  # CSC-FS-001
│       ├── audit-logging.js      # CSC-AUDIT-001
│       ├── iam-sprawl.js         # CSC-IAM-001
│       ├── cloud-run-public.js   # CSC-RUN-001
│       ├── env-config-drift.js   # CSC-CONFIG-001
│       ├── firebase-auth-consistency.js  # CSC-AUTH-001
│       ├── shared-ui.js          # CSC-UI-001
│       ├── linear-issue.js       # CSC-LINEAR-001
│       ├── risky-deps.js         # CSC-DEPS-001
│       ├── dangerous-server.js   # CSC-SERVER-001
│       ├── compliance-workflow.js # CSC-COMP-001
│       ├── data-model-drift.js   # CSC-DATA-001
│       └── blast-radius.js       # CSC-BLAST-001
├── test-fixtures/                # synthetic file/diff fixtures for tests
├── tests/
│   ├── rules.test.js
│   ├── linear.test.js
│   ├── suppressions.test.js
│   ├── diff.test.js
│   └── formatters.test.js
└── .github/workflows/csc-review.yml  # example reusable Action
```

## License

Internal CSC tooling. Not for external distribution.
