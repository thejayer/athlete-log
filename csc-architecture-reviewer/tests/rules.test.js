import { describe, it, expect } from "vitest";
import { makeFile, emptyEnv, emptyConfig } from "./helpers/fixtures.js";

import secretLeakage from "../src/rules/secret-leakage.js";
import publicGcs from "../src/rules/public-gcs.js";
import firestoreUnsafeWrites from "../src/rules/firestore-unsafe-writes.js";
import auditLogging from "../src/rules/audit-logging.js";
import iamSprawl from "../src/rules/iam-sprawl.js";
import cloudRunPublic from "../src/rules/cloud-run-public.js";
import envConfigDrift from "../src/rules/env-config-drift.js";
import firebaseAuthConsistency from "../src/rules/firebase-auth-consistency.js";
import sharedUi from "../src/rules/shared-ui.js";
import riskyDeps from "../src/rules/risky-deps.js";
import dangerousServer from "../src/rules/dangerous-server.js";
import complianceWorkflow from "../src/rules/compliance-workflow.js";
import dataModelDrift from "../src/rules/data-model-drift.js";
import blastRadius from "../src/rules/blast-radius.js";

function ctx({ files = [], env = {}, config = {} } = {}) {
  return { files, env: { ...emptyEnv, ...env }, config: emptyConfig(config) };
}

describe("CSC-SEC-001 secret leakage", () => {
  it("flags committed .env files", () => {
    const findings = secretLeakage.check(
      ctx({ files: [makeFile({ path: "apps/crm/.env", status: "A", addedLines: ["FOO=bar"] })] })
    );
    expect(findings.some((f) => f.rule_id === "CSC-SEC-001")).toBe(true);
    expect(findings[0].severity).toBe("BLOCKER");
  });

  it("ignores .env.example", () => {
    const findings = secretLeakage.check(
      ctx({ files: [makeFile({ path: ".env.example", status: "A", addedLines: ["FOO=bar"] })] })
    );
    expect(findings).toEqual([]);
  });

  it("flags service account JSON contents", () => {
    const findings = secretLeakage.check(
      ctx({
        files: [
          makeFile({
            path: "infra/key.json",
            status: "A",
            addedLines: [`"type": "service_account"`, `"private_key": "-----BEGIN PRIVATE KEY-----"`],
          }),
        ],
      })
    );
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.every((f) => f.severity === "BLOCKER")).toBe(true);
  });

  it("flags PEM private keys in added lines", () => {
    const findings = secretLeakage.check(
      ctx({
        files: [
          makeFile({
            path: "src/auth.js",
            addedLines: [`const key = "-----BEGIN PRIVATE KEY-----\\nMIIE..."`],
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-SEC-001");
  });

  it("ignores clean code", () => {
    const findings = secretLeakage.check(
      ctx({
        files: [makeFile({ path: "src/util.js", addedLines: ["export const greet = () => 'hi';"] })],
      })
    );
    expect(findings).toEqual([]);
  });
});

describe("CSC-GCS-001 public GCS", () => {
  it("flags makePublic() in added code", () => {
    const findings = publicGcs.check(
      ctx({ files: [makeFile({ path: "src/storage.js", addedLines: ["bucket.file('a').makePublic();"] })] })
    );
    expect(findings[0].rule_id).toBe("CSC-GCS-001");
  });

  it("flags allUsers in storage config", () => {
    const findings = publicGcs.check(
      ctx({
        files: [
          makeFile({
            path: "infra/iam.yaml",
            addedLines: ["- entity: allUsers", "  role: READER"],
          }),
        ],
      })
    );
    expect(findings.length).toBeGreaterThan(0);
  });
});

describe("CSC-FS-001 firestore unsafe writes", () => {
  it("flags client-side write to sensitive collection", () => {
    const findings = firestoreUnsafeWrites.check(
      ctx({
        files: [
          makeFile({
            path: "apps/crm/src/components/DealCard.tsx",
            addedLines: [
              "const ref = doc(db, 'deals', dealId);",
              "await setDoc(ref, { status: 'won' });",
            ],
            newContent: `const ref = doc(db, "deals", dealId);\nawait setDoc(ref, { status: "won" });`,
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-FS-001");
  });

  it("ignores server-side writes", () => {
    const findings = firestoreUnsafeWrites.check(
      ctx({
        files: [
          makeFile({
            path: "apps/crm/src/server/dealService.ts",
            addedLines: [`await setDoc(doc(db, "deals", id), data);`],
          }),
        ],
      })
    );
    expect(findings).toEqual([]);
  });
});

describe("CSC-AUDIT-001 missing audit logging", () => {
  it("flags compliance approval without audit log", () => {
    const findings = auditLogging.check(
      ctx({
        files: [
          makeFile({
            path: "apps/compliance/src/approve.ts",
            addedLines: ["export async function approveCompliance(id) { return db.set(id); }"],
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-AUDIT-001");
    expect(findings[0].severity).toBe("HIGH");
  });

  it("ignores when an audit log helper is present", () => {
    const findings = auditLogging.check(
      ctx({
        files: [
          makeFile({
            path: "apps/compliance/src/approve.ts",
            addedLines: [
              "export async function approveCompliance(id) {",
              "  await writeAuditEntry({ entity: id, action: 'approve' });",
              "  return db.set(id);",
              "}",
            ],
          }),
        ],
      })
    );
    expect(findings).toEqual([]);
  });
});

describe("CSC-IAM-001 broad IAM", () => {
  it("flags roles/owner in terraform", () => {
    const findings = iamSprawl.check(
      ctx({
        files: [
          makeFile({
            path: "infra/iam.tf",
            addedLines: [`role = "roles/owner"`],
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-IAM-001");
  });
});

describe("CSC-RUN-001 public Cloud Run", () => {
  it("flags --allow-unauthenticated", () => {
    const findings = cloudRunPublic.check(
      ctx({
        files: [
          makeFile({
            path: ".github/workflows/deploy.yml",
            addedLines: [`        run: gcloud run deploy crm --allow-unauthenticated --region us-central1`],
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-RUN-001");
  });

  it("allows public services in allow-list", () => {
    const findings = cloudRunPublic.check(
      ctx({
        files: [
          makeFile({
            path: ".github/workflows/deploy-about.yml",
            addedLines: [`        run: gcloud run deploy about-site --allow-unauthenticated`],
          }),
        ],
        config: { allow_public_cloud_run_services: ["about-site"] },
      })
    );
    expect(findings).toEqual([]);
  });
});

describe("CSC-CONFIG-001 env config drift", () => {
  it("flags new env var with no docs", () => {
    const findings = envConfigDrift.check(
      ctx({
        files: [
          makeFile({
            path: "src/api.js",
            addedLines: ["const x = process.env.NEW_SECRET_TOKEN;"],
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-CONFIG-001");
  });

  it("clears when same var documented in .env.example", () => {
    const findings = envConfigDrift.check(
      ctx({
        files: [
          makeFile({
            path: "src/api.js",
            addedLines: ["const x = process.env.NEW_SECRET_TOKEN;"],
          }),
          makeFile({
            path: ".env.example",
            addedLines: ["NEW_SECRET_TOKEN=replace-me"],
            newContent: "NEW_SECRET_TOKEN=replace-me",
          }),
        ],
      })
    );
    expect(findings).toEqual([]);
  });
});

describe("CSC-AUTH-001 parallel auth", () => {
  it("flags jsonwebtoken usage", () => {
    const findings = firebaseAuthConsistency.check(
      ctx({
        files: [
          makeFile({
            path: "src/server/auth.ts",
            addedLines: [`import jwt from "jsonwebtoken";`, `jwt.sign({ id }, secret);`],
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-AUTH-001");
  });
});

describe("CSC-UI-001 shared UI", () => {
  it("flags new Button.tsx outside shared UI", () => {
    const findings = sharedUi.check(
      ctx({ files: [makeFile({ path: "apps/crm/src/components/Button.tsx", status: "A", addedLines: ["export const Button = () => null;"] })] })
    );
    expect(findings[0].rule_id).toBe("CSC-UI-001");
  });

  it("does not flag the shared library's own Button.tsx", () => {
    const findings = sharedUi.check(
      ctx({ files: [makeFile({ path: "packages/ui/src/Button.tsx", status: "A", addedLines: ["export const Button = () => null;"] })] })
    );
    expect(findings).toEqual([]);
  });
});

describe("CSC-DEPS-001 risky deps", () => {
  it("flags jsonwebtoken added to package.json", () => {
    const findings = riskyDeps.check(
      ctx({
        files: [
          makeFile({
            path: "apps/crm/package.json",
            addedLines: [`    "jsonwebtoken": "^9.0.0",`],
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-DEPS-001");
    expect(findings[0].severity).toBe("HIGH");
  });

  it("flags pdf-parse as MEDIUM", () => {
    const findings = riskyDeps.check(
      ctx({
        files: [
          makeFile({
            path: "apps/vdr/package.json",
            addedLines: [`    "pdf-parse": "1.1.1"`],
          }),
        ],
      })
    );
    expect(findings[0].severity).toBe("MEDIUM");
  });
});

describe("CSC-SERVER-001 dangerous server", () => {
  it("flags exec(req.body.cmd)", () => {
    const findings = dangerousServer.check(
      ctx({
        files: [
          makeFile({
            path: "src/server/admin.ts",
            addedLines: [`exec(req.body.command)`],
          }),
        ],
      })
    );
    expect(findings[0].severity).toBe("BLOCKER");
  });

  it("flags rejectUnauthorized: false", () => {
    const findings = dangerousServer.check(
      ctx({
        files: [
          makeFile({
            path: "src/upstream.ts",
            addedLines: [`new https.Agent({ rejectUnauthorized: false })`],
          }),
        ],
      })
    );
    expect(findings.find((f) => /TLS/.test(f.title))).toBeDefined();
  });
});

describe("CSC-COMP-001 compliance workflow", () => {
  it("flags compliance change without auth + audit", () => {
    const findings = complianceWorkflow.check(
      ctx({
        files: [
          makeFile({
            path: "apps/compliance/src/approveDeal.ts",
            addedLines: [
              "export async function approveDeal(id) {",
              "  return db.update(id, { approved: true });",
              "}",
            ],
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-COMP-001");
  });
});

describe("CSC-DATA-001 data-model drift", () => {
  it("flags a brand-new collection name", () => {
    const findings = dataModelDrift.check(
      ctx({
        files: [
          makeFile({
            path: "src/inbox.ts",
            addedLines: [`await setDoc(doc(db, "inboxMessages", id), data);`],
          }),
        ],
      })
    );
    expect(findings[0].rule_id).toBe("CSC-DATA-001");
  });

  it("does not flag known collections", () => {
    const findings = dataModelDrift.check(
      ctx({
        files: [
          makeFile({
            path: "src/users.ts",
            addedLines: [`await setDoc(doc(db, "users", id), data);`],
          }),
        ],
      })
    );
    expect(findings).toEqual([]);
  });
});

describe("CSC-BLAST-001 blast radius", () => {
  it("emits MEDIUM when 3+ modules are touched", () => {
    const findings = blastRadius.check(
      ctx({
        files: [
          makeFile({ path: "apps/crm/src/index.ts" }),
          makeFile({ path: "apps/vdr/src/index.ts" }),
          makeFile({ path: ".github/workflows/deploy.yml" }),
        ],
      })
    );
    expect(findings[0].severity).toBe("MEDIUM");
    expect(findings[0].title).toMatch(/CRM/);
    expect(findings[0].title).toMatch(/VDR/);
  });

  it("emits INFO when 1 module is touched", () => {
    const findings = blastRadius.check(
      ctx({ files: [makeFile({ path: "apps/crm/src/index.ts" })] })
    );
    expect(findings[0].severity).toBe("INFO");
  });
});
