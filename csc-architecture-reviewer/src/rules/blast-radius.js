import { CATEGORIES } from "../severity.js";
import { matchesAny } from "../glob.js";

export default {
  id: "CSC-BLAST-001",
  category: CATEGORIES.PLATFORM,
  defaultSeverity: "INFO",
  description: "Summarize which modules this PR touches.",
  check({ files, config }) {
    const taxonomy = config.modules || {};
    const touched = new Set();

    for (const file of files) {
      for (const [module, globs] of Object.entries(taxonomy)) {
        if (matchesAny(file.path, globs)) touched.add(module);
      }
    }

    if (touched.size === 0) return [];

    const list = [...touched].sort();
    const severity = list.length >= 3 ? "MEDIUM" : "INFO";

    return [
      {
        severity,
        category: CATEGORIES.PLATFORM,
        title: `PR touches ${list.length} module${list.length === 1 ? "" : "s"}: ${list.join(", ")}`,
        why_it_matters:
          list.length >= 3
            ? "Multi-module PRs are harder to review, revert, and reason about. Consider splitting."
            : "Reviewers should keep the listed module(s) in mind.",
        recommendation:
          list.length >= 3
            ? "Where possible, split into per-module PRs so each can be reviewed and rolled back independently."
            : "Tag reviewers familiar with the listed module(s).",
        rule_id: "CSC-BLAST-001",
      },
    ];
  },
};
