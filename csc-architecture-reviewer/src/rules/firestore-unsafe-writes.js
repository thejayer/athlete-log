import { CATEGORIES } from "../severity.js";

const SERVER_FILE_HINTS = [
  /(^|\/)(server|backend|functions|api|services)\//,
  /\.server\.(t|j)sx?$/,
];

const CLIENT_FILE_HINTS = [
  /(^|\/)src\//,
  /(^|\/)client\//,
  /(^|\/)web\//,
  /(^|\/)apps\/[^/]+\/(?:src|app|pages|components)\//,
  /(^|\/)pages\//,
  /(^|\/)components\//,
];

const WRITE_PATTERNS = [
  /\b(setDoc|addDoc|updateDoc|deleteDoc)\s*\(/,
  /\.collection\([^)]*\)\.add\(/,
  /\.doc\([^)]*\)\.set\(/,
  /\.doc\([^)]*\)\.update\(/,
];

const COLLECTION_REF = /(?:collection|doc)\s*\(\s*(?:db\s*,\s*)?["']([a-zA-Z0-9_\-/]+)["']/g;

function isClientFile(path) {
  if (SERVER_FILE_HINTS.some((re) => re.test(path))) return false;
  return CLIENT_FILE_HINTS.some((re) => re.test(path));
}

export default {
  id: "CSC-FS-001",
  category: CATEGORIES.FIRESTORE,
  defaultSeverity: "HIGH",
  description: "Client-side Firestore writes to sensitive collections without explicit auth checks.",
  check({ files, config }) {
    const findings = [];
    const sensitive = new Set(config.sensitive_firestore_collections || []);

    for (const file of files) {
      if (file.status === "D") continue;
      if (!isClientFile(file.path)) continue;

      const newContent = file.newContent || "";

      for (const { lineNumber, text } of file.addedLines) {
        if (!WRITE_PATTERNS.some((re) => re.test(text))) continue;

        // Look at the wider context (this line + 5 above) for collection names.
        const lines = newContent.split("\n");
        const contextStart = Math.max(0, lineNumber - 6);
        const context = lines.slice(contextStart, lineNumber + 2).join("\n");

        const collections = [];
        let m;
        while ((m = COLLECTION_REF.exec(context)) !== null) {
          const top = m[1].split("/")[0];
          if (sensitive.has(top)) collections.push(top);
        }
        COLLECTION_REF.lastIndex = 0;

        if (collections.length === 0) continue;

        findings.push({
          severity: "HIGH",
          category: CATEGORIES.FIRESTORE,
          title: `Client-side write to sensitive collection: ${[...new Set(collections)].join(", ")}`,
          file: file.path,
          line: lineNumber,
          why_it_matters:
            "Sensitive collections (users, deals, documents, compliance, audit logs) need server-side authorization and audit context. Client writes bypass both.",
          recommendation:
            "Route writes through a Cloud Run / Cloud Functions endpoint that authenticates the caller, enforces RBAC, and emits an audit log entry. If the write must stay client-side, prove the operation is locked down in firestore.rules and add a matching test.",
          rule_id: "CSC-FS-001",
        });
      }
    }

    return findings;
  },
};
