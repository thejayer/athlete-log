import { describe, it, expect } from "vitest";
import { parseUnifiedDiff } from "../src/git-diff.js";

const SAMPLE_DIFF = `diff --git a/src/a.js b/src/a.js
index 1111111..2222222 100644
--- a/src/a.js
+++ b/src/a.js
@@ -10,0 +11,2 @@
+const x = 1;
+const y = 2;
diff --git a/src/b.js b/src/b.js
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/b.js
@@ -0,0 +1,1 @@
+console.log("hello");
diff --git a/src/c.js b/src/c.js
deleted file mode 100644
index 4444444..0000000
--- a/src/c.js
+++ /dev/null
@@ -1,1 +0,0 @@
-const gone = true;
`;

describe("parseUnifiedDiff", () => {
  it("extracts files, statuses, and added lines", () => {
    const files = parseUnifiedDiff(SAMPLE_DIFF);
    expect(files).toHaveLength(3);

    const [a, b, c] = files;
    expect(a.path).toBe("src/a.js");
    expect(a.status).toBe("M");
    expect(a.addedLines).toEqual([
      { lineNumber: 11, text: "const x = 1;" },
      { lineNumber: 12, text: "const y = 2;" },
    ]);

    expect(b.path).toBe("src/b.js");
    expect(b.status).toBe("A");
    expect(b.addedLines[0]).toEqual({ lineNumber: 1, text: 'console.log("hello");' });

    expect(c.path).toBe("src/c.js");
    expect(c.status).toBe("D");
    expect(c.addedLines).toEqual([]);
    expect(c.removedLines[0].text).toBe("const gone = true;");
  });

  it("returns empty array for empty input", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
  });
});
