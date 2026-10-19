"use strict";

const fs = require("fs");
const path = require("path");
const { STATIC_APP_FILES } = require("./static-app-files");

const root = path.resolve(__dirname, "..");
const dest = path.join(root, "dist");

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const file of STATIC_APP_FILES) {
  const from = path.join(root, file);
  const to = path.join(dest, file);
  if (!fs.existsSync(from)) {
    throw new Error(`Missing static app file: ${file}`);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

// Pages artifacts skip Jekyll; keep this marker so future `_` files stay public.
fs.writeFileSync(path.join(dest, ".nojekyll"), "");

console.log(`Prepared ${STATIC_APP_FILES.length} static files in dist/`);
