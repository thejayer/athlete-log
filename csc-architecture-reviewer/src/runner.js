import { getChangedFiles, getCommitMessages, getCurrentBranch } from "./git-diff.js";
import { buildSuppressionsIndex } from "./suppressions.js";
import { loadEnabledRules } from "./rules/index.js";
import { detectLinearReferences } from "./linear.js";
import { severityRank, atLeast } from "./severity.js";
import { matchesAny } from "./glob.js";

export async function runReview({ base, head, config, env: extraEnv = {}, cwd = process.cwd() }) {
  const files = getChangedFiles({ base, head, cwd });
  const commitMessages = getCommitMessages({ base, head, cwd });
  const branch = extraEnv.branch || getCurrentBranch(cwd);
  const prTitle = extraEnv.prTitle || "";

  const env = { branch, prTitle, commitMessages, base, head };
  const suppressions = buildSuppressionsIndex(files);
  const rules = loadEnabledRules(config);

  const findings = [];
  for (const rule of rules) {
    const raw = await rule.check({ files, env, config, suppressions });
    for (const finding of raw || []) {
      const finalSeverity = config.severity_overrides?.[rule.id] || finding.severity || rule.defaultSeverity;
      if (suppressions.isSuppressed(finding.file, rule.id, finding.line)) continue;
      findings.push({ ...finding, severity: finalSeverity, rule_id: rule.id });
    }
  }

  findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const linear = detectLinearReferences({
    prefixes: config.allowed_linear_prefixes,
    branch,
    prTitle,
    commitMessages,
  });

  const blastRadius = computeBlastRadius(files, config);
  const verdict = computeVerdict(findings);
  const summary = buildSummary({ files, findings, blastRadius, verdict });
  const architecture_fit = buildArchitectureFit({ findings, blastRadius });

  return {
    verdict,
    summary,
    findings,
    linear: {
      issue_detected: linear.anyDetected,
      issue_key: linear.primaryKey,
      references_in_branch: linear.references_in_branch,
      references_in_pr_title: linear.references_in_pr_title,
      references_in_commits: linear.references_in_commits,
      all_keys: linear.allKeys,
    },
    architecture_fit,
    blast_radius: blastRadius,
    meta: {
      base,
      head,
      branch,
      changed_files: files.length,
      rules_run: rules.map((r) => r.id),
      config_path: config.__sourcePath || null,
    },
  };
}

function computeVerdict(findings) {
  if (findings.some((f) => f.severity === "BLOCKER")) return "FAIL";
  if (findings.some((f) => ["HIGH", "MEDIUM", "LOW"].includes(f.severity))) return "PASS_WITH_WARNINGS";
  return "PASS";
}

function computeBlastRadius(files, config) {
  const taxonomy = config.modules || {};
  const touched = new Set();
  for (const file of files) {
    for (const [module, globs] of Object.entries(taxonomy)) {
      if (matchesAny(file.path, globs)) touched.add(module);
    }
  }
  return [...touched].sort();
}

function buildSummary({ files, findings, blastRadius, verdict }) {
  const counts = { BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
  const moduleList = blastRadius.length ? blastRadius.join(", ") : "no recognized modules";
  return (
    `Reviewed ${files.length} changed file${files.length === 1 ? "" : "s"} across ${moduleList}. ` +
    `Verdict: ${verdict}. Findings — BLOCKER: ${counts.BLOCKER}, HIGH: ${counts.HIGH}, ` +
    `MEDIUM: ${counts.MEDIUM}, LOW: ${counts.LOW}, INFO: ${counts.INFO}.`
  );
}

function buildArchitectureFit({ findings, blastRadius }) {
  const notes = [];
  const has = (predicate) => findings.some(predicate);

  if (has((f) => f.rule_id === "CSC-AUTH-001")) {
    notes.push("Parallel auth pattern detected — confirm this is intentional or refactor onto Firebase Auth.");
  }
  if (has((f) => f.rule_id === "CSC-RUN-001")) {
    notes.push("Cloud Run ingress is public — ensure it's the about-site or an explicitly approved public surface.");
  }
  if (has((f) => f.rule_id === "CSC-FS-001")) {
    notes.push("Client-side write to a sensitive Firestore collection — move through a backend layer.");
  }
  if (has((f) => f.rule_id === "CSC-GCS-001")) {
    notes.push("GCS access pattern is broader than CSC's document-storage model expects.");
  }
  if (has((f) => f.rule_id === "CSC-AUDIT-001")) {
    notes.push("Sensitive workflow change without an audit log breaks our compliance baseline.");
  }
  if (has((f) => f.rule_id === "CSC-DATA-001")) {
    notes.push("New Firestore collection introduced — document owner, ACL, and downstream consumers.");
  }
  if (has((f) => f.rule_id === "CSC-UI-001")) {
    notes.push("Possible UI duplication — prefer the shared component library.");
  }
  if (blastRadius.length >= 3) {
    notes.push(`PR spans ${blastRadius.length} modules — consider splitting for safer review and rollback.`);
  }

  const fits = !findings.some((f) => f.severity === "BLOCKER" || f.severity === "HIGH");
  return { fits_platform: fits, notes };
}

export function shouldFail({ findings, failOn }) {
  if (!failOn) return false;
  return findings.some((f) => atLeast(f.severity, failOn));
}
