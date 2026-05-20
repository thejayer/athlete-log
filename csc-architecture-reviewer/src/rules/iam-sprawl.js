import { CATEGORIES } from "../severity.js";

const BROAD_ROLES = [
  /roles\/owner\b/i,
  /roles\/editor\b/i,
  /roles\/viewer\b/i,
  /roles\/[^/\s"']*Admin\b/i,
  /"role"\s*:\s*"roles\/(?:owner|editor)"/i,
  /\*\s*:\s*\*/, // wildcard permissions
];

const IAC_HINTS = [
  /\.tf$/,
  /cloudbuild\.ya?ml$/,
  /\.ya?ml$/,
  /\.json$/,
  /\.hcl$/,
];

export default {
  id: "CSC-IAM-001",
  category: CATEGORIES.IAM,
  defaultSeverity: "HIGH",
  description: "Overly broad IAM role grants or wildcard permissions in IaC/config.",
  check({ files }) {
    const findings = [];

    for (const file of files) {
      if (file.status === "D") continue;
      if (!IAC_HINTS.some((re) => re.test(file.path))) continue;

      for (const { lineNumber, text } of file.addedLines) {
        for (const re of BROAD_ROLES) {
          if (re.test(text)) {
            findings.push({
              severity: "HIGH",
              category: CATEGORIES.IAM,
              title: "Broad IAM grant",
              file: file.path,
              line: lineNumber,
              why_it_matters:
                "Owner/Editor/Viewer and *Admin roles grant far more than any CSC service needs and are common audit findings.",
              recommendation:
                "Use a service-specific role (or a custom role with the minimum set of verbs) bound to a service account scoped to the consumer.",
              rule_id: "CSC-IAM-001",
            });
            break;
          }
        }
      }
    }

    return findings;
  },
};
