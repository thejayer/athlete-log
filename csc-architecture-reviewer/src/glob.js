// Minimal glob matcher. Supports:
//   *      — any chars except "/"
//   **     — any chars including "/"
//   ?      — single char
//   {a,b}  — alternation
//   [...]  — char class (passed through to regex)
// No negation, no extglob. Enough for our config use.

function escapeRegex(ch) {
  return ch.replace(/[.+^$()|\\]/g, "\\$&");
}

function compile(pattern) {
  let out = "^";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        // ** or **/
        if (pattern[i + 2] === "/") {
          out += "(?:.*/)?";
          i += 3;
          continue;
        }
        out += ".*";
        i += 2;
        continue;
      }
      out += "[^/]*";
      i += 1;
      continue;
    }
    if (ch === "?") {
      out += "[^/]";
      i += 1;
      continue;
    }
    if (ch === "{") {
      const end = pattern.indexOf("}", i);
      if (end === -1) {
        out += "\\{";
        i += 1;
        continue;
      }
      const parts = pattern.slice(i + 1, end).split(",").map((p) => compileRaw(p));
      out += `(?:${parts.join("|")})`;
      i = end + 1;
      continue;
    }
    if (ch === "[") {
      const end = pattern.indexOf("]", i);
      if (end === -1) {
        out += "\\[";
        i += 1;
        continue;
      }
      out += pattern.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    out += escapeRegex(ch);
    i += 1;
  }
  out += "$";
  return new RegExp(out);
}

function compileRaw(pattern) {
  // Same as compile() but returns the body (no anchors). Used inside {a,b}.
  const re = compile(pattern).source;
  return re.slice(1, -1);
}

const cache = new Map();

export function matches(path, pattern) {
  let re = cache.get(pattern);
  if (!re) {
    re = compile(pattern);
    cache.set(pattern, re);
  }
  return re.test(path);
}

export function matchesAny(path, patterns) {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((p) => matches(path, p));
}
