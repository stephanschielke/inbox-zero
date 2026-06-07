import { beforeEach, describe, expect, it, vi } from "vitest";

// REDIS_URL set + UPSTASH unset routes the KV client to the ioredis adapter
// and lets us assert the guard fork independently of the Upstash HTTP client.
vi.mock("@/env", () => ({
  env: {
    REDIS_URL: "redis://localhost:6379",
    UPSTASH_REDIS_URL: undefined,
    UPSTASH_REDIS_TOKEN: undefined,
    NODE_ENV: "test",
  },
}));

// Captures the FakeRedis instance the adapter constructs so tests can assert
// the exact arguments forwarded to the underlying client. Hoisted so it is
// available inside the (also hoisted) vi.mock factory.
const mockState = vi.hoisted(() => ({
  instances: [] as Array<{
    store: Map<string, string>;
    hashes: Map<string, Map<string, string>>;
    evalSpy: ReturnType<typeof vi.fn>;
  }>,
}));

// In-memory ioredis stand-in. Stores ONLY strings, mirroring RESP semantics,
// so any double-encode or missing-passthrough bug surfaces as a real failure.
vi.mock("ioredis", () => {
  class FakeRedis {
    store = new Map<string, string>();
    hashes = new Map<string, Map<string, string>>();
    evalSpy = vi.fn(async () => "EVAL_RAW");

    constructor() {
      mockState.instances.push(this);
    }

    on() {
      return this;
    }

    async get(key: string) {
      return this.store.has(key) ? (this.store.get(key) as string) : null;
    }

    async set(key: string, value: string, ...args: (string | number)[]) {
      if (args.includes("NX") && this.store.has(key)) return null;
      this.store.set(key, value);
      return "OK";
    }

    async del(...keys: string[]) {
      let count = 0;
      for (const key of keys) {
        if (this.store.delete(key)) count++;
      }
      return count;
    }

    async hget(key: string, field: string) {
      const value = this.hashes.get(key)?.get(field);
      return value === undefined ? null : value;
    }

    async hset(
      key: string,
      fieldOrObj: string | Record<string, string>,
      value?: string,
    ) {
      const hash = this.hashes.get(key) ?? new Map<string, string>();
      if (typeof fieldOrObj === "string") {
        hash.set(fieldOrObj, value as string);
      } else {
        for (const [field, fieldValue] of Object.entries(fieldOrObj)) {
          hash.set(field, fieldValue);
        }
      }
      this.hashes.set(key, hash);
      return 1;
    }

    async hgetall(key: string) {
      const hash = this.hashes.get(key);
      return hash ? Object.fromEntries(hash.entries()) : {};
    }

    async incr(key: string) {
      const next = Number(this.store.get(key) ?? "0") + 1;
      this.store.set(key, String(next));
      return next;
    }

    async scan(_cursor: string | number, ..._args: (string | number)[]) {
      return ["0", [...this.store.keys()]];
    }

    eval(...callArgs: unknown[]) {
      return this.evalSpy(...(callArgs as []));
    }
  }
  return { default: FakeRedis, Redis: FakeRedis };
});

import { redis } from "@/utils/redis";
import { isRedisConfigured } from "@/utils/redis/research-cache";

function getClient() {
  const client = mockState.instances[0];
  if (!client) throw new Error("FakeRedis was not constructed");
  return client;
}

describe("kv redis adapter (ioredis)", () => {
  beforeEach(async () => {
    await redis.del(
      "obj",
      "prestring",
      "json",
      "counter",
      "existing",
      "hkey",
      "scanned",
      "hall",
      "incrkey",
    );
    getClient().evalSpy.mockClear();
  });

  it("write-encodes objects so get returns a deep-equal object", async () => {
    const value = { totalItems: 2, completedItems: 1, status: "running" };
    await redis.set("obj", value, { ex: 60 });

    expect(await redis.get<typeof value>("obj")).toEqual(value);
  });

  it("does NOT double-encode a pre-stringified value (load-bearing)", async () => {
    const obj = { reply: "hi", confidence: "high" };
    await redis.set("prestring", JSON.stringify(obj));

    // Parity with @upstash/redis parseRecursive: a value that is already valid
    // JSON is stored as-is (string passthrough on encode, no extra quoting) and
    // decoded by JSON.parse on read. A double-encode would instead persist
    // '"{\\"reply\\"...}"' and read back the literal JSON string. We assert the
    // raw stored bytes are the single-encoded JSON and the decoded read matches
    // exactly what the Upstash client returns for the same bytes.
    const storedRaw = getClient().store.get("prestring");
    expect(storedRaw).toBe(JSON.stringify(obj));

    const result = await redis.get<unknown>("prestring");
    expect(result).toEqual(obj);
  });

  it("decodes a stored JSON object string back into an object", async () => {
    await redis.set("json", { a: 1, b: [2, 3] });

    expect(await redis.get<{ a: number; b: number[] }>("json")).toEqual({
      a: 1,
      b: [2, 3],
    });
  });

  it("coerces numbers consistently via incr/get", async () => {
    await redis.incr("counter");
    await redis.incr("counter");

    expect(await redis.get<number>("counter")).toBe(2);

    // number-roundtrip guard: a non-canonical numeric string stays a string
    await redis.set("counter", "007");
    expect(await redis.get<string>("counter")).toBe("007");
  });

  it("returns RAW null for set {nx:true} on an existing key", async () => {
    await redis.set("existing", "first");

    expect(await redis.set("existing", "second", { nx: true })).toBeNull();
  });

  it("passes eval through as (script, numkeys, ...keys, ...args) and returns RAW", async () => {
    const script = "return 1";

    const result = await redis.eval<[string, string], unknown>(
      script,
      ["k1", "k2"],
      ["a1", "a2"],
    );

    expect(result).toBe("EVAL_RAW");
    expect(getClient().evalSpy).toHaveBeenCalledWith(
      script,
      2,
      "k1",
      "k2",
      "a1",
      "a2",
    );
  });

  it("hset object form round-trips an object value through hget", async () => {
    await redis.hset("hkey", { field: { category: "Finance" } });

    expect(await redis.hget<{ category: string }>("hkey", "field")).toEqual({
      category: "Finance",
    });
  });

  it("scan returns a [nextCursor, keys[]] tuple", async () => {
    await redis.set("scanned", "1");

    const result = await redis.scan("0", { match: "*", count: 10 });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(typeof result[0]).toBe("string");
    expect(Array.isArray(result[1])).toBe(true);
  });

  it("hgetall returns null on an empty/missing key", async () => {
    expect(await redis.hgetall("hall")).toBeNull();
  });

  it("hgetall decodes a JSON-object field value into an object", async () => {
    await redis.hset("hall", { meta: { category: "Finance" } });

    expect(await redis.hgetall<{ meta: { category: string } }>("hall")).toEqual(
      {
        meta: { category: "Finance" },
      },
    );
  });

  it("hgetall keeps a float-string field as a STRING (safe-integer guard)", async () => {
    // Upstash HGETALL parity: a numeric-but-not-safe-integer value (e.g. a float)
    // is NOT JSON.parsed back into a number; the raw string is preserved. This is
    // the corruption-path pin that distinguishes hgetall from the get-style guard.
    getClient().hashes.set("hall", new Map([["rate", "1.5"]]));

    const result = await redis.hgetall<{ rate: unknown }>("hall");
    expect(result?.rate).toBe("1.5");
    expect(typeof result?.rate).toBe("string");
  });

  it("hgetall decodes a safe-integer string field via JSON.parse to a number", async () => {
    getClient().hashes.set("hall", new Map([["count", "42"]]));

    const result = await redis.hgetall<{ count: unknown }>("hall");
    expect(result?.count).toBe(42);
    expect(typeof result?.count).toBe("number");
  });

  it("hgetall keeps a large non-safe-integer string lossless (as a STRING)", async () => {
    getClient().hashes.set("hall", new Map([["big", "9999999999999999999"]]));

    const result = await redis.hgetall<{ big: unknown }>("hall");
    expect(result?.big).toBe("9999999999999999999");
    expect(typeof result?.big).toBe("string");
  });

  it("incr returns the RAW number with no decode", async () => {
    const result = await redis.incr("incrkey");

    expect(result).toBe(1);
    expect(typeof result).toBe("number");
  });

  it("isRedisConfigured is true when REDIS_URL is set and UPSTASH is unset", () => {
    expect(isRedisConfigured()).toBe(true);
  });
});
