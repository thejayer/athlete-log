import { CATEGORIES } from "../severity.js";

const COLLECTION_REF = /(?:collection|doc)\s*\(\s*(?:db\s*,\s*)?["']([a-zA-Z][a-zA-Z0-9_]*)["']/g;

// Existing collections — extend via config later. Anything not in this set that
// appears in an added line counts as a new collection.
const KNOWN_COLLECTIONS = new Set([
  "users",
  "companies",
  "deals",
  "documents",
  "compliance",
  "auditLogs",
  "permissions",
  "roles",
  "profiles",
  "vdr",
  "crm",
  "engagementLetters",
  "ndas",
  "sessions",
  "notifications",
]);

const SCHEMA_HINTS = [/schema\b/i, /collections?\.md$/i, /data-model\.md$/i, /firestore\.rules$/];

export default {
  id: "CSC-DATA-001",
  category: CATEGORIES.DATA_MODEL,
  defaultSeverity: "MEDIUM",
  description: "New Firestore collection introduced without schema/config documentation.",
  check({ files, config }) {
    const findings = [];
    const known = new Set([...(config.sensitive_firestore_collections || []), ...KNOWN_COLLECTIONS]);

    const introduced = new Map(); // name -> { file, line }
    const schemaTouched = files.some((f) => SCHEMA_HINTS.some((re) => re.test(f.path)));

    for (const file of files) {
      if (file.status === "D") continue;
      for (const { lineNumber, text } of file.addedLines) {
        let m;
        while ((m = COLLECTION_REF.exec(text)) !== null) {
          const name = m[1];
          if (known.has(name)) continue;
          if (!introduced.has(name)) introduced.set(name, { file: file.path, line: lineNumber });
        }
        COLLECTION_REF.lastIndex = 0;
      }
    }

    for (const [name, loc] of introduced) {
      findings.push({
        severity: schemaTouched ? "LOW" : "MEDIUM",
        category: CATEGORIES.DATA_MODEL,
        title: `New Firestore collection: ${name}`,
        file: loc.file,
        line: loc.line,
        why_it_matters:
          "New collections need an owner, a documented purpose, a security-rule entry, and a known place in the data model — otherwise they become orphans.",
        recommendation:
          "Document the collection (purpose, owner, ACL, downstream dependencies) and add the corresponding firestore.rules entry in the same PR.",
        rule_id: "CSC-DATA-001",
      });
    }

    return findings;
  },
};
