import { CATEGORIES } from "../severity.js";

const PUBLIC_INGRESS_PATTERNS = [
  /--allow-unauthenticated\b/,
  /"ingress"\s*:\s*"all"/i,
  /ingress:\s*all\b/i,
  /serviceAccount\s*:\s*"allUsers"/,
  /member\s*=\s*"allUsers"/,
  /"role"\s*:\s*"roles\/run\.invoker"[\s\S]{0,200}"allUsers"/,
];

const CLOUD_RUN_HINTS = [
  /cloudbuild\.ya?ml$/,
  /service\.ya?ml$/i,
  /\.tf$/,
  /deploy.*cloud-?run/i,
  /Dockerfile/,
  /\.github\/workflows\//,
];

function inferServiceName(file, text) {
  const deployMatch = /gcloud\s+(?:beta\s+|alpha\s+)?run\s+(?:deploy|services\s+update)\s+([a-z][a-z0-9-]+)/i.exec(text);
  if (deployMatch) return deployMatch[1];
  const explicit = /(?:--service[= ]|service:\s*|name:\s*)["']?([a-z][a-z0-9-]+)["']?/i.exec(text);
  if (explicit) return explicit[1];
  const fromPath = /([a-z0-9-]+)(?:\.ya?ml|\/cloudbuild)/i.exec(file);
  return fromPath ? fromPath[1] : null;
}

export default {
  id: "CSC-RUN-001",
  category: CATEGORIES.CLOUD_RUN,
  defaultSeverity: "HIGH",
  description: "Cloud Run service exposed to unauthenticated/public traffic.",
  check({ files, config }) {
    const findings = [];
    const allowed = new Set(config.allow_public_cloud_run_services || []);

    for (const file of files) {
      if (file.status === "D") continue;
      if (!CLOUD_RUN_HINTS.some((re) => re.test(file.path))) continue;

      for (const { lineNumber, text } of file.addedLines) {
        if (!PUBLIC_INGRESS_PATTERNS.some((re) => re.test(text))) continue;

        const service = inferServiceName(file.path, text);
        if (service && allowed.has(service)) continue;

        findings.push({
          severity: "HIGH",
          category: CATEGORIES.CLOUD_RUN,
          title: service
            ? `Public Cloud Run service: ${service}`
            : "Public Cloud Run ingress",
          file: file.path,
          line: lineNumber,
          why_it_matters:
            "Internal CSC services (CRM, VDR, Portal, Compliance) should require an authenticated identity. Public ingress turns an app into an open API.",
          recommendation:
            "Require auth (IAP, ID tokens, or run.invoker bound to a specific SA). Add the service to `allow_public_cloud_run_services` only if it is intentionally public (e.g. About site).",
          suggested_fix:
            "Replace `--allow-unauthenticated` with `--no-allow-unauthenticated` and grant `roles/run.invoker` to the calling service account or IAP-protected user group.",
          rule_id: "CSC-RUN-001",
        });
      }
    }

    return findings;
  },
};
