// Optional GitHub adapter. Posts (or updates) a single PR comment with the
// reviewer's Markdown output. Activated only when GITHUB_TOKEN and the standard
// pull_request env vars are present. Safe no-op otherwise.

const MARKER = "<!-- csc-architecture-reviewer -->";

function env(name) {
  return process.env[name];
}

export function isGithubActionsContext() {
  return Boolean(env("GITHUB_ACTIONS") && env("GITHUB_TOKEN") && env("GITHUB_REPOSITORY"));
}

export function readPrContext() {
  const ref = env("GITHUB_REF") || "";
  const prMatch = /refs\/pull\/(\d+)\//.exec(ref);
  return {
    repo: env("GITHUB_REPOSITORY"),
    prNumber: prMatch ? Number(prMatch[1]) : null,
    headSha: env("GITHUB_SHA"),
    branch: env("GITHUB_HEAD_REF") || env("GITHUB_REF_NAME") || "",
    prTitle: env("GITHUB_PR_TITLE") || "",
  };
}

async function api(path, init = {}) {
  const token = env("GITHUB_TOKEN");
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "csc-architecture-reviewer",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${init.method || "GET"} ${path} failed: ${res.status} ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function upsertPrComment({ repo, prNumber, body }) {
  const decorated = `${MARKER}\n${body}`;
  const comments = await api(`/repos/${repo}/issues/${prNumber}/comments?per_page=100`);
  const existing = (comments || []).find((c) => c.body && c.body.includes(MARKER));
  if (existing) {
    return api(`/repos/${repo}/issues/comments/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ body: decorated }),
    });
  }
  return api(`/repos/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: decorated }),
  });
}
