export const SEVERITIES = ["BLOCKER", "HIGH", "MEDIUM", "LOW", "INFO"];

const RANK = Object.fromEntries(SEVERITIES.map((s, i) => [s, i]));

export function severityRank(severity) {
  return RANK[severity] ?? Number.MAX_SAFE_INTEGER;
}

export function atLeast(severity, threshold) {
  return severityRank(severity) <= severityRank(threshold);
}

export const CATEGORIES = {
  SECURITY: "Security",
  GCP: "GCP architecture",
  FIRESTORE: "Firebase/Auth/Firestore rules",
  CLOUD_RUN: "Cloud Run/deployment",
  GCS: "GCS/document storage",
  CONFIG: "Secrets/configuration",
  IAM: "IAM/service accounts",
  DATA_MODEL: "Data model/shared collections",
  BOUNDARY: "Frontend/backend boundary",
  PROCESS: "Linear/GitHub process compliance",
  OBSERVABILITY: "Observability/logging/audit trail",
  PLATFORM: "Platform consistency",
};
