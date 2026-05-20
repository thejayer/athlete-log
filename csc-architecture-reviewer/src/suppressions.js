// Inline suppression syntax (works in any comment style):
//
//   csc-reviewer-disable-next-line CSC-GCS-001 -- public marketing asset, approved
//   csc-reviewer-disable CSC-UI-001 -- whole-file suppression with reason
//
// `--` reason is encouraged. Rules can require a reason via config (future).

const NEXT_LINE_RE = /csc-reviewer-disable-next-line\s+([A-Z0-9-]+(?:\s*,\s*[A-Z0-9-]+)*)(?:\s*--\s*(.*))?/;
const FILE_RE = /csc-reviewer-disable\s+([A-Z0-9-]+(?:\s*,\s*[A-Z0-9-]+)*)(?:\s*--\s*(.*))?/;

export function buildSuppressionsIndex(files) {
  const byFile = new Map();

  for (const file of files) {
    if (!file.newContent) continue;
    const lines = file.newContent.split("\n");
    const fileLevel = new Set();
    const nextLine = new Map();

    for (let i = 0; i < lines.length; i += 1) {
      const text = lines[i];
      const fileMatch = FILE_RE.exec(text);
      if (fileMatch && !NEXT_LINE_RE.test(text)) {
        for (const id of splitIds(fileMatch[1])) fileLevel.add(id);
      }
      const nextMatch = NEXT_LINE_RE.exec(text);
      if (nextMatch) {
        const target = i + 2; // suppression is on line i+1, target is i+2 (1-indexed)
        const ids = splitIds(nextMatch[1]);
        const existing = nextLine.get(target) ?? new Set();
        for (const id of ids) existing.add(id);
        nextLine.set(target, existing);
      }
    }

    byFile.set(file.path, { fileLevel, nextLine });
  }

  return {
    isSuppressed(filePath, ruleId, lineNumber) {
      const entry = byFile.get(filePath);
      if (!entry) return false;
      if (entry.fileLevel.has(ruleId)) return true;
      if (lineNumber == null) return false;
      const ids = entry.nextLine.get(lineNumber);
      return Boolean(ids && ids.has(ruleId));
    },
  };
}

function splitIds(raw) {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
