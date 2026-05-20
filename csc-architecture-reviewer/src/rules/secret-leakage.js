import { CATEGORIES } from "../severity.js";

const SECRET_PATTERNS = [
  { name: "PEM private key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "Service account JSON", re: /"type"\s*:\s*"service_account"/ },
  { name: "Firebase private key field", re: /FIREBASE_PRIVATE_KEY\s*=\s*["']?-----BEGIN/i },
  { name: "Hardcoded API key", re: /\b(?:API|GCP|GOOGLE|FIREBASE|STRIPE|SENDGRID|TWILIO)_?KEY\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i },
  { name: "OAuth client secret", re: /\bclient_secret\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i },
  { name: "Bearer token literal", re: /\bAuthorization\s*[:=]\s*["']Bearer\s+[A-Za-z0-9_\-.=]{20,}["']/ },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  {
    name: "GOOGLE_APPLICATION_CREDENTIALS local path",
    re: /GOOGLE_APPLICATION_CREDENTIALS\s*=\s*["']?(?:\.\/|\.\.\/|\/[A-Za-z]|[A-Za-z]:\\)/,
  },
  { name: "Generic JWT", re: /\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b/ },
];

const SUSPICIOUS_FILE_PATTERNS = [
  { name: ".env committed", re: /(^|\/)\.env(\.|$)/, exception: /\.env\.example$/ },
  { name: "Service account key file", re: /service[-_]?account.*\.json$/i },
];

export default {
  id: "CSC-SEC-001",
  category: CATEGORIES.SECURITY,
  defaultSeverity: "BLOCKER",
  description: "Hardcoded secrets, credentials, or committed env files.",
  check({ files }) {
    const findings = [];

    for (const file of files) {
      if (file.status === "D") continue;

      for (const pattern of SUSPICIOUS_FILE_PATTERNS) {
        if (pattern.re.test(file.path) && !(pattern.exception && pattern.exception.test(file.path))) {
          findings.push({
            severity: "BLOCKER",
            category: CATEGORIES.SECURITY,
            title: `Committed secret-bearing file: ${pattern.name}`,
            file: file.path,
            why_it_matters:
              "Files of this type typically contain credentials. Even if revoked, history is forever.",
            recommendation:
              "Remove the file, rotate the credentials, add a path/glob to .gitignore, and load secrets via Secret Manager, GitHub Actions secrets, or Firebase runtime config.",
            suggested_fix: `git rm --cached ${file.path} && echo "${file.path}" >> .gitignore`,
            rule_id: "CSC-SEC-001",
          });
        }
      }

      for (const { lineNumber, text } of file.addedLines) {
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.re.test(text)) {
            findings.push({
              severity: "BLOCKER",
              category: CATEGORIES.SECURITY,
              title: `Possible hardcoded secret (${pattern.name})`,
              file: file.path,
              line: lineNumber,
              why_it_matters:
                "Secrets in source land in git history, CI logs, and any fork or mirror — assume they leak the moment they merge.",
              recommendation:
                "Move the value to Secret Manager / GitHub Actions secrets / Firebase Functions config and read it from the environment at runtime.",
              suggested_fix: "Replace the literal with `process.env.<NAME>` and document it in your deploy config.",
              rule_id: "CSC-SEC-001",
            });
            break; // one finding per added line
          }
        }
      }
    }

    return findings;
  },
};
