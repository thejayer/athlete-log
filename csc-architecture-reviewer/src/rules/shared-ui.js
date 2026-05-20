import { CATEGORIES } from "../severity.js";

const COMMON_COMPONENTS = [
  "Button",
  "Modal",
  "Dialog",
  "Input",
  "TextField",
  "Select",
  "Dropdown",
  "Table",
  "DataTable",
  "Card",
  "Tabs",
  "Toast",
  "Snackbar",
  "DatePicker",
  "Spinner",
];

const SHARED_HINT = /(packages|shared|libs)\/ui\//;

export default {
  id: "CSC-UI-001",
  category: CATEGORIES.PLATFORM,
  defaultSeverity: "LOW",
  description: "Duplicate UI component instead of using the shared UI library.",
  check({ files }) {
    const findings = [];

    for (const file of files) {
      if (file.status !== "A") continue;
      if (SHARED_HINT.test(file.path)) continue;
      if (!/\.(tsx?|jsx?|svelte|vue)$/.test(file.path)) continue;

      const name = (file.path.split("/").pop() || "").replace(/\.[^.]+$/, "");
      if (!COMMON_COMPONENTS.includes(name)) continue;

      findings.push({
        severity: "LOW",
        category: CATEGORIES.PLATFORM,
        title: `Possible duplicate of shared UI component: ${name}`,
        file: file.path,
        why_it_matters:
          "Reimplementing a common component fragments the design system and creates drift across CRM / VDR / Portal.",
        recommendation: `Check whether \`${name}\` already exists in the shared UI package and import it instead. If a variant is needed, extend the shared one via props.`,
        rule_id: "CSC-UI-001",
      });
    }

    return findings;
  },
};
