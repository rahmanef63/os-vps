import { afterEach, describe, expect, it } from "vitest";
import { childEnv } from "./child-env";

const SECRETS = ["OS_SESSION_SECRET", "OS_LOGIN_PASSWORD", "OS_BROWSER_SECRET", "OS_AGENT_TOKEN", "ANTHROPIC_API_KEY"];
const saved: Record<string, string | undefined> = {};

afterEach(() => {
  for (const k of Object.keys(saved)) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("childEnv (secret scrub for spawned shells)", () => {
  it("strips every app secret from the child environment", () => {
    for (const k of SECRETS) {
      saved[k] = process.env[k];
      process.env[k] = "super-secret";
    }
    const env = childEnv();
    for (const k of SECRETS) expect(env[k]).toBeUndefined();
  });

  it("preserves NODE_ENV, PATH and non-secret OS_* config", () => {
    saved.OS_FS_READ_ROOTS = process.env.OS_FS_READ_ROOTS;
    process.env.OS_FS_READ_ROOTS = "/srv";
    const env = childEnv();
    expect(env.PATH).toBe(process.env.PATH);
    expect(env.NODE_ENV).toBe(process.env.NODE_ENV);
    expect(env.OS_FS_READ_ROOTS).toBe("/srv"); // bounds config is not a secret
  });

  it("strips secret-shaped vars by pattern so new secrets don't silently leak", () => {
    const leaky = ["OS_UNSPLASH_ACCESS_KEY", "MODELS_LIVE_OPENAI_KEY", "SOME_TOKEN", "DB_PASSWORD", "APP_SECRET", "OS_FUTURE_THING"];
    for (const k of leaky) {
      saved[k] = process.env[k];
      process.env[k] = "leak-me";
    }
    const env = childEnv();
    for (const k of leaky) expect(env[k]).toBeUndefined();
  });

  it("never emits undefined values", () => {
    const env = childEnv();
    expect(Object.values(env).every((v) => typeof v === "string")).toBe(true);
  });
});
