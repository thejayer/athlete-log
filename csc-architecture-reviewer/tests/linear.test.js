import { describe, it, expect } from "vitest";
import { detectLinearReferences } from "../src/linear.js";
import linearIssue from "../src/rules/linear-issue.js";
import { emptyConfig } from "./helpers/fixtures.js";

describe("detectLinearReferences", () => {
  it("finds key in branch", () => {
    const out = detectLinearReferences({
      prefixes: ["CSC", "CRM", "VDR"],
      branch: "feature/CRM-142-pipeline-filters",
      prTitle: "",
      commitMessages: [],
    });
    expect(out.anyDetected).toBe(true);
    expect(out.primaryKey).toBe("CRM-142");
    expect(out.references_in_branch).toBe(true);
  });

  it("prefers PR title key as primary", () => {
    const out = detectLinearReferences({
      prefixes: ["CSC", "CRM", "VDR"],
      branch: "feature/CRM-142",
      prTitle: "feat(vdr): add document upload (VDR-77)",
      commitMessages: ["misc work"],
    });
    expect(out.primaryKey).toBe("VDR-77");
    expect(out.references_in_pr_title).toBe(true);
  });

  it("returns no match when no prefixes hit", () => {
    const out = detectLinearReferences({
      prefixes: ["CSC", "CRM", "VDR"],
      branch: "feature/random-branch",
      prTitle: "Cleanup",
      commitMessages: ["fix typo"],
    });
    expect(out.anyDetected).toBe(false);
    expect(out.primaryKey).toBeNull();
  });
});

describe("CSC-LINEAR-001 rule", () => {
  it("flags PR without any Linear reference", () => {
    const findings = linearIssue.check({
      files: [],
      env: { branch: "fix/typo", prTitle: "Fix typo", commitMessages: ["fix typo"] },
      config: emptyConfig(),
    });
    expect(findings[0].rule_id).toBe("CSC-LINEAR-001");
  });

  it("passes when a key is present", () => {
    const findings = linearIssue.check({
      files: [],
      env: { branch: "feat/CRM-9-foo", prTitle: "feat: add foo", commitMessages: [] },
      config: emptyConfig(),
    });
    expect(findings).toEqual([]);
  });
});
