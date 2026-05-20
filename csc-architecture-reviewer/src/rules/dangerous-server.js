import { CATEGORIES } from "../severity.js";

const RULES = [
  {
    severity: "BLOCKER",
    title: "eval() on dynamic input",
    re: /\beval\s*\([^)]*\b(?:req\.|request\.|input|userInput|body|params|query)/,
    why: "eval on user-controlled data is remote code execution.",
    rec: "Replace with explicit parsing/dispatch; never eval untrusted strings.",
  },
  {
    severity: "BLOCKER",
    title: "shell execution with user input",
    re: /\b(exec|execSync|spawn|spawnSync)\s*\([^)]*\b(?:req\.|request\.|body|params|query|input|userInput)/,
    why: "Shell calls with user input enable command injection.",
    rec: "Use execFile with an array argv and an allowlist of values; never interpolate user data into a shell string.",
  },
  {
    severity: "HIGH",
    title: "Python shell=True",
    re: /subprocess\.(?:run|Popen|call|check_output)\s*\([^)]*shell\s*=\s*True/,
    why: "shell=True turns subprocess into a command-injection vector.",
    rec: "Pass arguments as a list and omit shell=True. Validate user-supplied components.",
  },
  {
    severity: "HIGH",
    title: "Unsafe deserialization",
    re: /\b(pickle\.loads?|yaml\.load\s*\([^,)]*\)|node-serialize|unserialize)\s*\(/,
    why: "Unsafe deserialization of untrusted data is a known RCE class.",
    rec: "Use yaml.safe_load, JSON.parse, or schema-validated parsers (zod, pydantic).",
  },
  {
    severity: "HIGH",
    title: "Path traversal risk",
    re: /\b(fs\.(?:readFile|createReadStream|writeFile)|open)\s*\([^)]*\b(?:req\.|request\.|body|params|query|input|userInput)/,
    why: "Building file paths from user input enables path traversal (../etc/passwd).",
    rec: "Normalize and validate against an allowlist directory: `path.resolve(BASE, name)` then assert `result.startsWith(BASE)`.",
  },
  {
    severity: "HIGH",
    title: "CORS wildcard",
    re: /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*["']|cors\s*\(\s*\{\s*origin\s*:\s*['"]?\*['"]?/,
    why: "`*` CORS on an authenticated API lets any site read responses your users authorize.",
    rec: "Allowlist specific origins; never combine `*` with credentials.",
  },
  {
    severity: "HIGH",
    title: "TLS verification disabled",
    re: /rejectUnauthorized\s*:\s*false|verify\s*=\s*False\b|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/,
    why: "Disabling TLS verification opens the door to MITM on any upstream call.",
    rec: "Fix the certificate chain; only disable verification in tests behind a wrapper that errors in production.",
  },
  {
    severity: "MEDIUM",
    title: "Overly permissive CSP",
    re: /Content-Security-Policy.*['"](?:default|script)-src[^'";]*\*/,
    why: "Wildcard CSP defeats XSS protection.",
    rec: "Use a strict allowlist of trusted origins and 'self'.",
  },
  {
    severity: "HIGH",
    title: "Unrestricted file upload",
    re: /multer\s*\(\s*\{\s*\}\s*\)|multer\.diskStorage\([^)]*\)\s*\)\s*$|formidable\s*\(\s*\)/,
    why: "File upload middleware with no size/type limit is a classic DoS + upload-of-evil vector.",
    rec: "Set limits ({ fileSize, files }) and validate MIME type / extension against an allowlist.",
  },
];

export default {
  id: "CSC-SERVER-001",
  category: CATEGORIES.SECURITY,
  defaultSeverity: "HIGH",
  description: "Dangerous server-side patterns (RCE, injection, traversal, CORS *, disabled TLS, unrestricted upload).",
  check({ files }) {
    const findings = [];

    for (const file of files) {
      if (file.status === "D") continue;

      for (const { lineNumber, text } of file.addedLines) {
        for (const rule of RULES) {
          if (rule.re.test(text)) {
            findings.push({
              severity: rule.severity,
              category: CATEGORIES.SECURITY,
              title: rule.title,
              file: file.path,
              line: lineNumber,
              why_it_matters: rule.why,
              recommendation: rule.rec,
              rule_id: "CSC-SERVER-001",
            });
          }
        }
      }
    }

    return findings;
  },
};
