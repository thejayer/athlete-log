import { CATEGORIES } from "../severity.js";
import { matchesAny } from "../glob.js";

const PUBLIC_ACL_PATTERNS = [
  /makePublic\s*\(/,
  /acl\s*\.\s*add\s*\(\s*\{[^}]*allUsers/,
  /\ballAuthenticatedUsers\b/,
  /predefinedAcl\s*:\s*['"]publicRead['"]/,
  /\ballUsers\b/, // YAML `entity: allUsers`, terraform `member = "allUsers"`, IAM bindings, etc.
];

const SIGNED_URL_BROAD = /getSignedUrl\s*\(\s*\{[^}]*expires\s*:\s*[^,}]*(?:60\s*\*\s*60\s*\*\s*24\s*\*\s*\d{2,}|2\d{12,})/;

export default {
  id: "CSC-GCS-001",
  category: CATEGORIES.GCS,
  defaultSeverity: "HIGH",
  description: "Public bucket / public file / overly broad signed URL.",
  check({ files, config }) {
    const findings = [];
    const allowedBuckets = config.allow_public_buckets || [];

    for (const file of files) {
      if (file.status === "D") continue;

      for (const { lineNumber, text } of file.addedLines) {
        const isPublicAcl = PUBLIC_ACL_PATTERNS.some((re) => re.test(text));
        if (isPublicAcl) {
          // Try to grab a bucket name from context if obvious.
          const bucketMatch = /bucket\s*\(\s*["']([^"']+)["']\s*\)/.exec(text);
          const bucket = bucketMatch ? bucketMatch[1] : null;
          if (bucket && matchesAny(bucket, allowedBuckets.map((b) => b.replace(/[*?]/g, "*")))) {
            continue;
          }
          findings.push({
            severity: "HIGH",
            category: CATEGORIES.GCS,
            title: "Public GCS access detected",
            file: file.path,
            line: lineNumber,
            why_it_matters:
              "CSC document storage holds deal, NDA, compliance, and engagement artifacts. Public ACLs leak them to anyone with the URL — including search crawlers.",
            recommendation:
              "Serve documents through an authenticated Cloud Run/Functions endpoint and short-lived signed URLs scoped to the requesting user/deal.",
            suggested_fix:
              "Replace makePublic()/allUsers with short-TTL signed URLs (<= 15 min) and add an authorization check before issuing them.",
            rule_id: "CSC-GCS-001",
          });
        }

        if (SIGNED_URL_BROAD.test(text)) {
          findings.push({
            severity: "MEDIUM",
            category: CATEGORIES.GCS,
            title: "Overly long signed-URL expiry",
            file: file.path,
            line: lineNumber,
            why_it_matters:
              "Long-lived signed URLs survive credential rotation and become de-facto public links.",
            recommendation: "Keep signed URLs <= 15 minutes; for longer access, re-issue on demand behind auth.",
            rule_id: "CSC-GCS-001",
          });
        }
      }
    }

    return findings;
  },
};
