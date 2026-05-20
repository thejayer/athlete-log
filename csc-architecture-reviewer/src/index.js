#!/usr/bin/env node
import { parseArgs } from "node:util";
import fs from "node:fs";
import path from "node:path";

import { loadConfig } from "./config.js";
import { runReview, shouldFail } from "./runner.js";
import { formatMarkdown } from "./formatters/markdown.js";
import { formatJson } from "./formatters/json.js";
import { isGithubActionsContext, readPrContext, upsertPrComment } from "./github.js";

const USAGE = `csc-review — CSC architecture & security PR reviewer

Usage: csc-review [options]

Options:
  --base <ref>         Base git ref (default: origin/main)
  --head <ref>         Head git ref (default: HEAD)
  --config <path>      Path to reviewer.config.yaml
  --format <md|json>   Print to stdout in this format (repeatable). Default: md
  --output <path>      Write Markdown to this path
  --json-output <path> Write JSON to this path
  --fail-on <sev>      Exit non-zero on findings >= severity (BLOCKER|HIGH|MEDIUM|LOW)
  --pr-title <str>     Override PR title (for Linear detection)
  --branch <str>       Override branch name (for Linear detection)
  --post-comment       Post/update a PR comment when run inside GitHub Actions
  --quiet              Suppress non-essential stdout
  --help               Show this help
`;

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: false,
      options: {
        base: { type: "string", default: "origin/main" },
        head: { type: "string", default: "HEAD" },
        config: { type: "string" },
        format: { type: "string", multiple: true },
        output: { type: "string" },
        "json-output": { type: "string" },
        "fail-on": { type: "string" },
        "pr-title": { type: "string" },
        branch: { type: "string" },
        "post-comment": { type: "boolean", default: false },
        quiet: { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
    });
  } catch (err) {
    process.stderr.write(`Error parsing arguments: ${err.message}\n\n${USAGE}`);
    process.exit(2);
  }

  const { values } = parsed;
  if (values.help) {
    process.stdout.write(USAGE);
    return;
  }

  const config = loadConfig(values.config);

  const result = await runReview({
    base: values.base,
    head: values.head,
    config,
    env: {
      prTitle: values["pr-title"] || process.env.GITHUB_PR_TITLE || "",
      branch: values.branch || process.env.GITHUB_HEAD_REF || "",
    },
  });

  const formats = values.format && values.format.length > 0 ? values.format : ["md"];
  const md = formatMarkdown(result);
  const json = formatJson(result);

  if (!values.quiet) {
    for (const fmt of formats) {
      if (fmt === "md" || fmt === "markdown") process.stdout.write(md);
      else if (fmt === "json") process.stdout.write(json);
      else process.stderr.write(`Unknown --format: ${fmt}\n`);
    }
  }

  if (values.output) {
    fs.mkdirSync(path.dirname(path.resolve(values.output)), { recursive: true });
    fs.writeFileSync(values.output, md);
  }
  if (values["json-output"]) {
    fs.mkdirSync(path.dirname(path.resolve(values["json-output"])), { recursive: true });
    fs.writeFileSync(values["json-output"], json);
  }

  if (values["post-comment"] && isGithubActionsContext()) {
    try {
      const ctx = readPrContext();
      if (ctx.prNumber) {
        await upsertPrComment({ repo: ctx.repo, prNumber: ctx.prNumber, body: md });
      } else if (!values.quiet) {
        process.stderr.write("post-comment: no PR number in GITHUB_REF; skipping.\n");
      }
    } catch (err) {
      process.stderr.write(`post-comment failed: ${err.message}\n`);
    }
  }

  if (shouldFail({ findings: result.findings, failOn: values["fail-on"] })) {
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`csc-review crashed: ${err.stack || err.message}\n`);
  process.exit(2);
});
