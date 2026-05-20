// Linear issue key detection. v1 reads from branch, PR title, commit messages.
// A future LinearApiAdapter can be slotted in via fetchIssueMetadata().

function buildKeyRegex(prefixes) {
  if (!prefixes || prefixes.length === 0) return /\b([A-Z]{2,6})-(\d{1,6})\b/g;
  const alts = prefixes.map((p) => p.replace(/[^A-Z0-9]/gi, "")).join("|");
  return new RegExp(`\\b(${alts})-(\\d{1,6})\\b`, "g");
}

function findKeys(text, re) {
  if (!text) return [];
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) matches.push(`${m[1]}-${m[2]}`);
  re.lastIndex = 0;
  return matches;
}

export function detectLinearReferences({ prefixes, branch, prTitle, commitMessages }) {
  const re = buildKeyRegex(prefixes);
  const inBranch = findKeys(branch || "", re);
  const inTitle = findKeys(prTitle || "", re);
  const inCommits = (commitMessages || []).flatMap((msg) => findKeys(msg, re));

  const all = new Set([...inBranch, ...inTitle, ...inCommits]);

  return {
    anyDetected: all.size > 0,
    primaryKey: inTitle[0] || inBranch[0] || inCommits[0] || null,
    references_in_branch: inBranch.length > 0,
    references_in_pr_title: inTitle.length > 0,
    references_in_commits: inCommits.length > 0,
    allKeys: [...all],
  };
}

// Placeholder for v2: pull issue metadata from Linear's GraphQL API.
// Returns null when no token is configured — never throws.
export async function fetchIssueMetadata(_key, { token } = {}) {
  if (!token) return null;
  return null;
}
