import { CATEGORIES } from "../severity.js";

const MANIFEST_FILES = ["package.json", "requirements.txt", "pyproject.toml", "Pipfile"];

function isManifest(path) {
  const base = path.split("/").pop();
  return MANIFEST_FILES.includes(base);
}

function patternMatches(packageName, pattern) {
  if (pattern.endsWith("/*")) {
    return packageName.startsWith(pattern.slice(0, -1));
  }
  if (pattern.includes("*")) {
    const re = new RegExp("^" + pattern.replace(/[.+^$()|\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    return re.test(packageName);
  }
  return packageName === pattern;
}

function classify(packageName, taxonomy) {
  const matches = [];
  for (const [category, patterns] of Object.entries(taxonomy)) {
    if (patterns.some((p) => patternMatches(packageName, p))) {
      matches.push(category);
    }
  }
  return matches;
}

function extractAddedPackages(file) {
  const added = [];
  if (file.path.endsWith("package.json")) {
    for (const { text } of file.addedLines) {
      const m = /^\s*"([^"]+)"\s*:\s*"([^"]+)"/.exec(text);
      if (m) added.push({ name: m[1], version: m[2] });
    }
  } else if (file.path.endsWith("requirements.txt") || file.path.endsWith("Pipfile")) {
    for (const { text } of file.addedLines) {
      const m = /^\s*([A-Za-z0-9_.\-]+)\s*([=~><!].*)?$/.exec(text.trim());
      if (m) added.push({ name: m[1], version: (m[2] || "").trim() });
    }
  } else if (file.path.endsWith("pyproject.toml")) {
    for (const { text } of file.addedLines) {
      const m = /^\s*([A-Za-z0-9_.\-]+)\s*=\s*["']([^"']+)["']/.exec(text);
      if (m) added.push({ name: m[1], version: m[2] });
    }
  }
  return added;
}

export default {
  id: "CSC-DEPS-001",
  category: CATEGORIES.SECURITY,
  defaultSeverity: "MEDIUM",
  description: "New dependency in a security-sensitive category, or loosely pinned.",
  check({ files, config }) {
    const findings = [];
    const taxonomy = config.risky_dependencies || {};

    for (const file of files) {
      if (file.status === "D") continue;
      if (!isManifest(file.path)) continue;

      const added = extractAddedPackages(file);
      for (const pkg of added) {
        const categories = classify(pkg.name, taxonomy);
        const loose = pkg.version.startsWith("^") || pkg.version.startsWith("~") || pkg.version === "*";

        if (categories.length === 0 && !loose) continue;

        let severity;
        if (categories.some((c) => ["auth", "crypto", "shell"].includes(c))) {
          severity = "HIGH";
        } else if (categories.length > 0) {
          severity = "MEDIUM";
        } else {
          // Loosely pinned but not in a sensitive category — quiet signal only.
          severity = "LOW";
        }

        findings.push({
          severity,
          category: CATEGORIES.SECURITY,
          title: `New dependency: ${pkg.name}${pkg.version ? ` ${pkg.version}` : ""}${
            categories.length ? ` (${categories.join(", ")})` : " (loosely pinned)"
          }`,
          file: file.path,
          why_it_matters:
            "Security-sensitive packages expand the supply-chain attack surface. Loose pins mean an upstream change can ship to production without review.",
          recommendation:
            "Pin to an exact version, document why the dependency is needed in the PR description, and verify package provenance (maintainer, weekly downloads, recent CVEs).",
          rule_id: "CSC-DEPS-001",
        });
      }
    }

    return findings;
  },
};
