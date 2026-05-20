import { CATEGORIES } from "../severity.js";

const ENV_REF_RE = /\bprocess\.env\.([A-Z][A-Z0-9_]+)\b|\bos\.environ(?:\.get)?\(["']([A-Z][A-Z0-9_]+)["']/g;

const DOC_FILES = [
  /\.env\.example$/,
  /\.env\.sample$/,
  /README\.md$/i,
  /docs\/.*\.mdx?$/i,
  /\.github\/workflows\/.*\.ya?ml$/,
  /cloudbuild\.ya?ml$/,
  /firebase\.json$/,
];

export default {
  id: "CSC-CONFIG-001",
  category: CATEGORIES.CONFIG,
  defaultSeverity: "MEDIUM",
  description: "New env var introduced without matching documentation or deployment config.",
  check({ files }) {
    const findings = [];

    const newEnvUses = new Map(); // name -> { file, line }
    const seenInDocs = new Set();

    for (const file of files) {
      if (file.status === "D") continue;
      const isDoc = DOC_FILES.some((re) => re.test(file.path));

      for (const { lineNumber, text } of file.addedLines) {
        let m;
        while ((m = ENV_REF_RE.exec(text)) !== null) {
          const name = m[1] || m[2];
          if (isDoc) {
            seenInDocs.add(name);
          } else if (!newEnvUses.has(name)) {
            newEnvUses.set(name, { file: file.path, line: lineNumber });
          }
        }
        ENV_REF_RE.lastIndex = 0;
      }

      if (isDoc) {
        for (const line of (file.newContent || "").split("\n")) {
          const m = /^\s*([A-Z][A-Z0-9_]+)\s*[:=]/.exec(line);
          if (m) seenInDocs.add(m[1]);
        }
      }
    }

    for (const [name, loc] of newEnvUses) {
      if (seenInDocs.has(name)) continue;
      findings.push({
        severity: "MEDIUM",
        category: CATEGORIES.CONFIG,
        title: `New env var introduced without documentation: ${name}`,
        file: loc.file,
        line: loc.line,
        why_it_matters:
          "Undocumented env vars cause deploy drift between local, CI, and Cloud Run; teammates discover them when production breaks.",
        recommendation:
          "Add the variable to `.env.example`, the deploy workflow (cloudbuild.yaml / GitHub Actions), and a short note in the relevant README. Confirm it's wired into Secret Manager or Firebase Functions config if sensitive.",
        rule_id: "CSC-CONFIG-001",
      });
    }

    return findings;
  },
};
