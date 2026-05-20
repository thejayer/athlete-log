import { describe, it, expect } from "vitest";
import { buildSuppressionsIndex } from "../src/suppressions.js";

describe("buildSuppressionsIndex", () => {
  it("suppresses the line immediately following a next-line directive", () => {
    const file = {
      path: "src/storage.js",
      addedLines: [],
      newContent: [
        "// regular line",
        "// csc-reviewer-disable-next-line CSC-GCS-001 -- public marketing asset",
        "bucket.makePublic();",
        "bucket.file('other').makePublic();",
      ].join("\n"),
    };
    const idx = buildSuppressionsIndex([file]);
    expect(idx.isSuppressed("src/storage.js", "CSC-GCS-001", 3)).toBe(true);
    expect(idx.isSuppressed("src/storage.js", "CSC-GCS-001", 4)).toBe(false);
  });

  it("suppresses the whole file with the file-level directive", () => {
    const file = {
      path: "scripts/migrate.js",
      addedLines: [],
      newContent: "// csc-reviewer-disable CSC-DATA-001 -- migration script\n// rest",
    };
    const idx = buildSuppressionsIndex([file]);
    expect(idx.isSuppressed("scripts/migrate.js", "CSC-DATA-001", 7)).toBe(true);
    expect(idx.isSuppressed("scripts/migrate.js", "CSC-DATA-001", null)).toBe(true);
  });

  it("supports comma-separated rule IDs", () => {
    const file = {
      path: "src/x.js",
      addedLines: [],
      newContent: "// csc-reviewer-disable-next-line CSC-GCS-001, CSC-FS-001 -- one-off\nstuff",
    };
    const idx = buildSuppressionsIndex([file]);
    expect(idx.isSuppressed("src/x.js", "CSC-GCS-001", 2)).toBe(true);
    expect(idx.isSuppressed("src/x.js", "CSC-FS-001", 2)).toBe(true);
    expect(idx.isSuppressed("src/x.js", "CSC-OTHER", 2)).toBe(false);
  });
});
