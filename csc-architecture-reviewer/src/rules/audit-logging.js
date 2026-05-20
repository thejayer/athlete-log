import { CATEGORIES } from "../severity.js";
import { matchesAny } from "../glob.js";

const SENSITIVE_ACTION_PATTERNS = [
  /\b(uploadDocument|downloadDocument|grantPermission|revokePermission|assignRole|approveCompliance|signNDA|sendEngagementLetter|recordVdrAccess|createDeal|updateDeal|deleteDeal|createCompany|updateCompany|deleteCompany)\b/,
  /\b(documents?\.upload|documents?\.download|permissions?\.(grant|revoke|change)|compliance\.approve|nda\.sign|engagementLetter\.send)\b/i,
];

const AUDIT_LOG_HINTS = [
  /auditLog/i,
  /audit_logs?\b/i,
  /writeAuditEntry/i,
  /createAuditEvent/i,
  /logger\.(audit|info)\s*\(/,
];

export default {
  id: "CSC-AUDIT-001",
  category: CATEGORIES.OBSERVABILITY,
  defaultSeverity: "MEDIUM",
  description: "Sensitive action added without an accompanying audit log entry.",
  check({ files, config }) {
    const findings = [];
    const surfaceGlobs = config.audit_log_surface_globs || [];

    for (const file of files) {
      if (file.status === "D") continue;
      const inSurface = matchesAny(file.path, surfaceGlobs);

      const addedSensitive = file.addedLines.filter(({ text }) =>
        SENSITIVE_ACTION_PATTERNS.some((re) => re.test(text))
      );
      if (addedSensitive.length === 0) continue;

      const auditMentioned =
        AUDIT_LOG_HINTS.some((re) => re.test(file.newContent || "")) ||
        file.addedLines.some(({ text }) => AUDIT_LOG_HINTS.some((re) => re.test(text)));
      if (auditMentioned) continue;

      const severity = inSurface ? "HIGH" : "MEDIUM";
      const first = addedSensitive[0];

      findings.push({
        severity,
        category: CATEGORIES.OBSERVABILITY,
        title: "Sensitive action without audit log",
        file: file.path,
        line: first.lineNumber,
        why_it_matters:
          "Document, permission, compliance, and CRM mutations must be reconstructable after the fact for legal, compliance, and incident review.",
        recommendation:
          "Emit an audit log entry (actor, timestamp, entity type, entity id, action, before/after, request context) at the same call site or via a shared helper.",
        suggested_fix:
          "Wrap the mutation in `withAuditLog({ actor, action, entity }, async () => { ... })` or call `writeAuditEntry(...)` after the mutation succeeds.",
        rule_id: "CSC-AUDIT-001",
      });
    }

    return findings;
  },
};
