import { describe, it, expect } from "vitest";
import { formatMarkdown } from "../src/formatters/markdown.js";
import { formatJson } from "../src/formatters/json.js";

const RESULT = {
  verdict: "PASS_WITH_WARNINGS",
  summary: "Reviewed 2 changed files. Verdict: PASS_WITH_WARNINGS.",
  findings: [
    {
      severity: "HIGH",
      category: "Security",
      title: "Hardcoded API key",
      file: "src/x.js",
      line: 12,
      why_it_matters: "Secrets in source leak.",
      recommendation: "Use Secret Manager.",
      suggested_fix: "process.env.API_KEY",
      rule_id: "CSC-SEC-001",
    },
    {
      severity: "INFO",
      category: "Platform consistency",
      title: "PR touches 1 module: CRM",
      why_it_matters: "Reviewers should keep CRM in mind.",
      recommendation: "Tag CRM reviewers.",
      rule_id: "CSC-BLAST-001",
    },
  ],
  linear: {
    issue_detected: true,
    issue_key: "CRM-142",
    references_in_branch: true,
    references_in_pr_title: false,
    references_in_commits: false,
    all_keys: ["CRM-142"],
  },
  architecture_fit: { fits_platform: true, notes: [] },
  blast_radius: ["CRM"],
  meta: { base: "origin/main", head: "HEAD", branch: "x", changed_files: 2, rules_run: ["CSC-SEC-001"] },
};

describe("formatMarkdown", () => {
  it("renders verdict, summary, and findings", () => {
    const md = formatMarkdown(RESULT);
    expect(md).toMatch(/# CSC Architecture Review/);
    expect(md).toMatch(/## Verdict\nPASS_WITH_WARNINGS/);
    expect(md).toMatch(/### HIGH/);
    expect(md).toMatch(/CSC-SEC-001/);
    expect(md).toMatch(/Issue key: CRM-142/);
    expect(md).toMatch(/## Blast Radius/);
  });

  it("hides empty severity sections", () => {
    const md = formatMarkdown(RESULT);
    expect(md).not.toMatch(/### BLOCKER/);
  });
});

describe("formatJson", () => {
  it("emits stable parseable JSON", () => {
    const out = formatJson(RESULT);
    const parsed = JSON.parse(out);
    expect(parsed.verdict).toBe("PASS_WITH_WARNINGS");
    expect(parsed.findings).toHaveLength(2);
    expect(parsed.linear.issue_key).toBe("CRM-142");
  });
});
