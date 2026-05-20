import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Returns the list of changed files between base..head with parsed unified diff
// hunks. `head` defaults to the working tree (HEAD).
export function getChangedFiles({ base = "origin/main", head = "HEAD", cwd = process.cwd() } = {}) {
  const range = `${base}...${head}`;
  let rawDiff;
  try {
    rawDiff = execFileSync("git", ["diff", "--unified=0", "--no-color", range], {
      cwd,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (err) {
    throw new Error(
      `git diff ${range} failed. Ensure the base ref is fetched and reachable. ` +
        `Original error: ${err.message}`
    );
  }

  const files = parseUnifiedDiff(rawDiff);
  for (const file of files) {
    file.newContent = readNewContent(cwd, file);
  }
  return files;
}

function readNewContent(cwd, file) {
  if (file.status === "D") return null;
  const abs = path.resolve(cwd, file.path);
  if (!fs.existsSync(abs)) return null;
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

// Parse the output of `git diff --unified=0 --no-color base...head` into a
// structured list of files with added lines and patch hunks.
export function parseUnifiedDiff(diffText) {
  const files = [];
  if (!diffText) return files;

  const lines = diffText.split("\n");
  let current = null;
  let inHunk = false;
  let newLineNumber = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (line.startsWith("diff --git ")) {
      if (current) files.push(current);
      const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
      current = {
        path: match ? match[2] : null,
        oldPath: match ? match[1] : null,
        status: "M",
        patch: line + "\n",
        addedLines: [],
        removedLines: [],
      };
      inHunk = false;
      continue;
    }

    if (!current) continue;
    current.patch += line + "\n";

    if (line.startsWith("new file mode")) current.status = "A";
    else if (line.startsWith("deleted file mode")) current.status = "D";
    else if (line.startsWith("rename from")) current.status = "R";

    if (line.startsWith("@@")) {
      const m = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      newLineNumber = m ? parseInt(m[1], 10) : 0;
      inHunk = true;
      continue;
    }

    if (!inHunk) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      current.addedLines.push({ lineNumber: newLineNumber, text: line.slice(1) });
      newLineNumber += 1;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      current.removedLines.push({ text: line.slice(1) });
    } else if (line.startsWith(" ")) {
      newLineNumber += 1;
    }
  }

  if (current) files.push(current);
  return files;
}

export function getCommitMessages({ base = "origin/main", head = "HEAD", cwd = process.cwd() } = {}) {
  const range = `${base}..${head}`;
  try {
    const out = execFileSync("git", ["log", "--pretty=%s%n%b%n---", range], {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return out.split("\n---\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function getCurrentBranch(cwd = process.cwd()) {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}
