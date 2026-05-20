import { CATEGORIES } from "../severity.js";
import { matchesAny } from "../glob.js";

const COMPLIANCE_GLOBS = [
  "**/compliance/**",
  "**/nda/**",
  "**/engagement-letter*/**",
  "**/approvals/**",
  "**/permissions/**",
  "**/roles/**",
];

const AUTH_HINTS = [
  /\brequireRole\b/,
  /\bcheckPermission\b/,
  /\bauthorize\b/,
  /\bensureRole\b/,
  /\bisComplianceOfficer\b/,
];

const AUDIT_HINTS = [/auditLog/i, /writeAuditEntry/i, /createAuditEvent/i];

export default {
  id: "CSC-COMP-001",
  category: CATEGORIES.PLATFORM,
  defaultSeverity: "HIGH",
  description: "Compliance-workflow change without authorization or audit hooks.",
  check({ files }) {
    const findings = [];

    for (const file of files) {
      if (file.status === "D") continue;
      if (!matchesAny(file.path, COMPLIANCE_GLOBS)) continue;
      if (file.addedLines.length === 0) continue;

      const content = file.newContent || "";
      const hasAuth = AUTH_HINTS.some((re) => re.test(content));
      const hasAudit = AUDIT_HINTS.some((re) => re.test(content));
      if (hasAuth && hasAudit) continue;

      findings.push({
        severity: "HIGH",
        category: CATEGORIES.PLATFORM,
        title: "Compliance-workflow change missing authorization and/or audit",
        file: file.path,
        why_it_matters:
          "NDA / engagement-letter / approval flows have legal and regulatory exposure. Each mutation needs a role check and an audit trail.",
        recommendation:
          `Confirm this code path calls a role/permission check${hasAuth ? "" : " (missing)"} and writes an audit log entry${hasAudit ? "" : " (missing)"} on success.`,
        rule_id: "CSC-COMP-001",
      });
    }

    return findings;
  },
};
