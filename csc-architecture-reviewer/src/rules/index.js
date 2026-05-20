import secretLeakage from "./secret-leakage.js";
import publicGcs from "./public-gcs.js";
import firestoreUnsafeWrites from "./firestore-unsafe-writes.js";
import auditLogging from "./audit-logging.js";
import iamSprawl from "./iam-sprawl.js";
import cloudRunPublic from "./cloud-run-public.js";
import envConfigDrift from "./env-config-drift.js";
import firebaseAuthConsistency from "./firebase-auth-consistency.js";
import sharedUi from "./shared-ui.js";
import linearIssue from "./linear-issue.js";
import riskyDeps from "./risky-deps.js";
import dangerousServer from "./dangerous-server.js";
import complianceWorkflow from "./compliance-workflow.js";
import dataModelDrift from "./data-model-drift.js";
import blastRadius from "./blast-radius.js";

export const ALL_RULES = [
  secretLeakage,
  publicGcs,
  firestoreUnsafeWrites,
  auditLogging,
  iamSprawl,
  cloudRunPublic,
  envConfigDrift,
  firebaseAuthConsistency,
  sharedUi,
  linearIssue,
  riskyDeps,
  dangerousServer,
  complianceWorkflow,
  dataModelDrift,
  blastRadius,
];

export function loadEnabledRules(config) {
  const disabled = new Set(config.disabled_rules || []);
  return ALL_RULES.filter((rule) => !disabled.has(rule.id));
}
