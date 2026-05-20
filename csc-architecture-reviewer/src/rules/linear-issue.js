import { CATEGORIES } from "../severity.js";
import { detectLinearReferences } from "../linear.js";

export default {
  id: "CSC-LINEAR-001",
  category: CATEGORIES.PROCESS,
  defaultSeverity: "MEDIUM",
  description: "PR is missing a Linear issue reference.",
  check({ env, config }) {
    const refs = detectLinearReferences({
      prefixes: config.allowed_linear_prefixes || [],
      branch: env.branch,
      prTitle: env.prTitle,
      commitMessages: env.commitMessages,
    });
    if (refs.anyDetected) return [];

    return [
      {
        severity: "MEDIUM",
        category: CATEGORIES.PROCESS,
        title: "No Linear issue reference found",
        why_it_matters:
          "Without a Linear key in the branch, PR title, or commits, this change can't be traced to an issue, acceptance criteria, or product context.",
        recommendation: `Add a Linear key (one of ${(config.allowed_linear_prefixes || []).map((p) => `\`${p}-###\``).join(", ") || "your project prefixes"}) to the branch name, PR title, or a commit subject.`,
        suggested_fix: "Example PR title: `feat(crm): add deal pipeline filters (CRM-142)`",
        rule_id: "CSC-LINEAR-001",
      },
    ];
  },
};
