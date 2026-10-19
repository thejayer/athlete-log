import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

describe("prepare-pages", () => {
  it("copies only the static app into dist/", () => {
    execFileSync(process.execPath, [path.join(root, "scripts/prepare-pages.js")], {
      cwd: root,
    });

    expect(fs.existsSync(path.join(dist, "index.html"))).toBe(true);
    expect(fs.existsSync(path.join(dist, "app.js"))).toBe(true);
    expect(fs.existsSync(path.join(dist, "styles.css"))).toBe(true);
    expect(fs.existsSync(path.join(dist, "manifest.webmanifest"))).toBe(true);
    expect(fs.existsSync(path.join(dist, "assets/app-icon.svg"))).toBe(true);
    expect(fs.existsSync(path.join(dist, ".nojekyll"))).toBe(true);

    expect(fs.existsSync(path.join(dist, "package.json"))).toBe(false);
    expect(fs.existsSync(path.join(dist, "package-lock.json"))).toBe(false);
    expect(fs.existsSync(path.join(dist, "README.md"))).toBe(false);
    expect(fs.existsSync(path.join(dist, "tests"))).toBe(false);
    expect(fs.existsSync(path.join(dist, ".github"))).toBe(false);
    expect(fs.existsSync(path.join(dist, "docs"))).toBe(false);
    expect(fs.existsSync(path.join(dist, "LICENSE"))).toBe(false);
  });
});
