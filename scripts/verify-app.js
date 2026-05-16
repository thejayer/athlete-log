const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const requiredFiles = [
  "index.html",
  "styles.css",
  "utils.js",
  "data.js",
  "store.js",
  "timers.js",
  "analytics.js",
  "render.js",
  "events.js",
  "app.js",
  "service-worker.js",
  "manifest.webmanifest",
  "assets/app-icon.svg",
  "assets/court-course.svg",
];

const requiredScripts = [
  "utils.js",
  "data.js",
  "store.js",
  "timers.js",
  "analytics.js",
  "render.js",
  "events.js",
  "app.js",
];

const errors = [];

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing required file: ${file}`);
}

const indexHtml = exists("index.html") ? read("index.html") : "";
let previousIndex = -1;
for (const script of requiredScripts) {
  const marker = `<script src="${script}"></script>`;
  const markerIndex = indexHtml.indexOf(marker);
  if (markerIndex === -1) {
    errors.push(`index.html does not load ${script}`);
  } else if (markerIndex < previousIndex) {
    errors.push(`index.html loads ${script} out of order`);
  }
  previousIndex = markerIndex;
}

const manifest = exists("manifest.webmanifest") ? JSON.parse(read("manifest.webmanifest")) : {};
if (manifest.name !== "Athlete Log") errors.push("manifest.webmanifest name should be Athlete Log");
if (!Array.isArray(manifest.icons) || !manifest.icons.length)
  errors.push("manifest.webmanifest must define icons");

const serviceWorker = exists("service-worker.js") ? read("service-worker.js") : "";
for (const file of requiredFiles.filter((file) => file !== "service-worker.js")) {
  const cachePath = `./${file}`;
  if (!serviceWorker.includes(cachePath))
    errors.push(`service-worker.js does not cache ${cachePath}`);
}

const appSource = requiredScripts.map((file) => read(file)).join("\n");
for (const symbol of [
  "renderGolfGps",
  "saveGpsRoundToLog",
  "normalizeGolfClubBag",
  "parseCsvRow",
]) {
  if (!appSource.includes(symbol)) errors.push(`Expected app symbol missing: ${symbol}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Athlete Log app verification passed.");
