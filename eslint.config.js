const fs = require("node:fs");
const path = require("node:path");

const js = require("@eslint/js");
const globals = require("globals");
const prettierConfig = require("eslint-config-prettier");

const browserScripts = [
  "utils.js",
  "data.js",
  "timers.js",
  "analytics.js",
  "render.js",
  "events.js",
  "app.js",
];

// Athlete Log loads each browser script via its own <script> tag and shares
// helpers and state through the global scope. Auto-discover top-level
// declarations from those files so `no-undef` does not flag intentional
// cross-file references. When COM-150 moves state into a `store` module and
// COM-153 introduces a real bundle, this can be replaced with explicit
// imports.
function discoverSharedGlobals() {
  const declRegex = /^(?:async\s+)?(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  const found = {};
  for (const file of browserScripts) {
    const source = fs.readFileSync(path.join(__dirname, file), "utf8");
    let match;
    while ((match = declRegex.exec(source)) !== null) {
      found[match[1]] = "writable";
    }
  }
  return found;
}

const sharedBrowserGlobals = discoverSharedGlobals();

const sharedRules = {
  "no-undef": "error",
  "no-unused-vars": [
    "warn",
    {
      vars: "local",
      args: "after-used",
      argsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
      ignoreRestSiblings: true,
    },
  ],
  "prefer-const": "error",
  eqeqeq: ["error", "always", { null: "ignore" }],
  // Top-level declarations in the browser script-tag files are intentionally
  // registered as globals by this config. Keep `no-redeclare` for in-file
  // duplicates only.
  "no-redeclare": ["error", { builtinGlobals: false }],
};

module.exports = [
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },

  // Browser script-tag files. `no-implicit-globals` is intentionally off here
  // because the entire app intentionally shares helpers and state across files
  // via the global scope. Re-enable once COM-150 + COM-153 move us to ES
  // modules.
  {
    files: browserScripts,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...sharedBrowserGlobals,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sharedRules,
    },
  },

  // Service worker.
  {
    files: ["service-worker.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.serviceworker,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sharedRules,
      "no-implicit-globals": "error",
    },
  },

  // Node scripts (CommonJS).
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sharedRules,
      "no-implicit-globals": "error",
    },
  },

  // ESLint flat config itself.
  {
    files: ["eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sharedRules,
    },
  },

  // Disable stylistic ESLint rules that conflict with Prettier.
  prettierConfig,
];
