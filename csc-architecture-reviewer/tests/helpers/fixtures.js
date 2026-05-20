// Synthetic file helper. Builds the same shape the diff parser produces, but
// without needing a real git repo. Each rule's check() takes `{ files, env,
// config, suppressions }` so this is enough for unit tests.

export function makeFile({ path, status = "M", addedLines = [], removedLines = [], newContent = null }) {
  const added = addedLines.map((entry, i) =>
    typeof entry === "string" ? { lineNumber: i + 1, text: entry } : entry
  );
  return {
    path,
    oldPath: path,
    status,
    patch: "",
    addedLines: added,
    removedLines: removedLines.map((t) => ({ text: t })),
    newContent: newContent ?? added.map((l) => l.text).join("\n"),
  };
}

export const emptyEnv = {
  branch: "",
  prTitle: "",
  commitMessages: [],
  base: "main",
  head: "HEAD",
};

export function emptyConfig(overrides = {}) {
  return {
    allowed_linear_prefixes: ["CSC", "CRM", "VDR", "PLAT"],
    allow_public_cloud_run_services: [],
    allow_public_buckets: [],
    sensitive_firestore_collections: [
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
    ],
    audit_log_surface_globs: ["**/vdr/**", "**/compliance/**", "**/documents/**", "**/permissions/**"],
    modules: {
      CRM: ["**/crm/**"],
      VDR: ["**/vdr/**"],
      "About Site": ["**/about-site/**"],
      Deployment: [".github/workflows/**", "**/cloudbuild.yaml"],
      Tests: ["tests/**", "**/*.test.*"],
    },
    risky_dependencies: {
      auth: ["jsonwebtoken", "passport", "next-auth"],
      crypto: ["crypto-js", "bcrypt"],
      shell: ["shelljs", "execa"],
      pdf: ["pdf-parse"],
    },
    severity_overrides: {},
    disabled_rules: [],
    required_tags_per_module: {},
    ...overrides,
  };
}
