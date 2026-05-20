import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, "..", "reviewer.config.yaml");

export function loadConfig(explicitPath) {
  const candidates = [];
  if (explicitPath) candidates.push(path.resolve(process.cwd(), explicitPath));
  candidates.push(path.resolve(process.cwd(), "csc-reviewer.config.yaml"));
  candidates.push(path.resolve(process.cwd(), ".csc-reviewer.yaml"));
  candidates.push(DEFAULT_CONFIG_PATH);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const raw = fs.readFileSync(candidate, "utf8");
      const parsed = yaml.load(raw) ?? {};
      parsed.__sourcePath = candidate;
      return withDefaults(parsed);
    }
  }
  return withDefaults({});
}

function withDefaults(config) {
  return {
    allowed_linear_prefixes: ["CSC", "CRM", "VDR", "PLAT"],
    allow_public_cloud_run_services: [],
    allow_public_buckets: [],
    sensitive_firestore_collections: [],
    audit_log_surface_globs: [],
    modules: {},
    risky_dependencies: {},
    severity_overrides: {},
    disabled_rules: [],
    required_tags_per_module: {},
    ...config,
  };
}
