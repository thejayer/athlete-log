import { CATEGORIES } from "../severity.js";

const PARALLEL_AUTH_HINTS = [
  /\bbcrypt\.(hash|compare)\b/,
  /\bjsonwebtoken\b/,
  /\bnew\s+OAuth2Client\b/,
  /\bpassport\.use\b/,
  /\bnext-auth\b/,
  /\bclerk[A-Z]/,
  /\bsupabase\.auth\b/,
  /\bauth0\b/i,
  /\bcustom(?:User|Session)Store\b/,
];

const ROUTE_HINTS = [/\/login\b/, /\/signup\b/, /\/register\b/, /\/password\b/, /\/session\b/];

export default {
  id: "CSC-AUTH-001",
  category: CATEGORIES.FIRESTORE,
  defaultSeverity: "HIGH",
  description: "New auth logic that bypasses the unified Firebase Auth identity model.",
  check({ files }) {
    const findings = [];

    for (const file of files) {
      if (file.status === "D") continue;

      for (const { lineNumber, text } of file.addedLines) {
        const parallel = PARALLEL_AUTH_HINTS.some((re) => re.test(text));
        const route = ROUTE_HINTS.some((re) => re.test(text));
        if (parallel || (route && /(?:router|app|express|fastify)\.(?:post|get|use)\s*\(/.test(text))) {
          findings.push({
            severity: parallel ? "HIGH" : "MEDIUM",
            category: CATEGORIES.FIRESTORE,
            title: parallel
              ? "Parallel auth system being introduced"
              : "New auth route — confirm it delegates to Firebase Auth",
            file: file.path,
            line: lineNumber,
            why_it_matters:
              "CSC apps share one Firebase identity. A second identity system fragments user records, breaks audit trails, and creates two attack surfaces.",
            recommendation:
              "Use Firebase Auth (custom tokens, ID-token verification on the server). If a third-party IdP is needed, federate it through Firebase, don't run a parallel one.",
            rule_id: "CSC-AUTH-001",
          });
        }
      }
    }

    return findings;
  },
};
