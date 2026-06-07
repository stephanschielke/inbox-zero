import { env } from "@/env";
import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("redis");

type SetOptions = {
  ex?: number;
  px?: number;
  nx?: boolean;
  xx?: boolean;
};

type ScanOptions = {
  match?: string;
  count?: number;
};

export interface KvClient {
  del(...keys: string[]): Promise<number>;
  eval<A extends unknown[], R>(
    script: string,
    keys: string[],
    args: A,
  ): Promise<R>;
  expire(key: string, seconds: number): Promise<number>;
  get<T>(key: string): Promise<T | null>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  hget<T>(key: string, field: string): Promise<T | null>;
  hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hincrbyfloat(key: string, field: string, increment: number): Promise<number>;
  hset(
    key: string,
    fieldOrObj: string | Record<string, unknown>,
    value?: unknown,
  ): Promise<number>;
  incr(key: string): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
  scan(
    cursor: string | number,
    opts?: ScanOptions,
  ): Promise<[string, string[]]>;
  set(key: string, value: unknown, opts?: SetOptions): Promise<"OK" | null>;
  ttl(key: string): Promise<number>;
  unlink(...keys: string[]): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
}

// Fork delta: when REDIS_URL is set we talk RESP directly (drops serverless-redis-http).
// Without it, upstream's Upstash HTTP client is used unchanged.
export const redis: KvClient = env.REDIS_URL
  ? makeKvClient(env.REDIS_URL)
  : (new UpstashRedis({
      url: env.UPSTASH_REDIS_URL,
      token: env.UPSTASH_REDIS_TOKEN,
    }) as unknown as KvClient);

export async function expire(key: string, seconds: number) {
  return redis.expire(key, seconds);
}

// ---- helpers (source/AGENTS.md convention: helpers at bottom) ----

function makeClient(url: string): IORedis {
  const client = new IORedis(url);
  client.on("error", (error) => logger.error("Redis error", { error }));
  return client;
}

function getClient(url: string): IORedis {
  const g = globalThis as typeof globalThis & { __kvRedis?: IORedis };
  g.__kvRedis ??= makeClient(url);
  return g.__kvRedis;
}

function encode(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

function decode<T>(raw: string | null): T | null {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number" && String(parsed) !== raw) {
      return raw as T;
    }
    return parsed as T;
  } catch {
    return raw as T;
  }
}

// Upstash HGETALL deserializer parity (@upstash/redis chunk-2X4SLXT7 L1508-1514):
// numeric-but-not-safe-integer values (floats, exponent strings, > 2^53) keep
// the raw string; everything else goes through JSON.parse, falling back to raw
// on parse error. This DIFFERS from the get-style roundtrip guard.
function decodeHashField(raw: string): unknown {
  try {
    const asNumber = Number(raw);
    const valueIsNumberAndNotSafeInteger =
      !Number.isNaN(asNumber) && !Number.isSafeInteger(asNumber);
    return valueIsNumberAndNotSafeInteger ? raw : JSON.parse(raw);
  } catch {
    return raw;
  }
}

function setOptionsToVariadic(opts?: SetOptions): (string | number)[] {
  if (!opts) return [];
  const args: (string | number)[] = [];
  if (opts.ex !== undefined) args.push("EX", opts.ex);
  if (opts.px !== undefined) args.push("PX", opts.px);
  if (opts.nx) args.push("NX");
  if (opts.xx) args.push("XX");
  return args;
}

function makeKvClient(url: string): KvClient {
  return {
    async get<T>(key: string): Promise<T | null> {
      return decode<T>(await getClient(url).get(key));
    },
    async set(
      key: string,
      value: unknown,
      opts?: SetOptions,
    ): Promise<"OK" | null> {
      return getClient(url).set(
        key,
        encode(value),
        ...(setOptionsToVariadic(opts) as []),
      ) as Promise<"OK" | null>;
    },
    async del(...keys: string[]) {
      return getClient(url).del(...keys);
    },
    async hget<T>(key: string, field: string): Promise<T | null> {
      return decode<T>(await getClient(url).hget(key, field));
    },
    async hset(
      key: string,
      fieldOrObj: string | Record<string, unknown>,
      value?: unknown,
    ) {
      if (typeof fieldOrObj === "string") {
        return getClient(url).hset(key, fieldOrObj, encode(value));
      }
      const flat: Record<string, string> = {};
      for (const [field, fieldValue] of Object.entries(fieldOrObj)) {
        flat[field] = encode(fieldValue);
      }
      return getClient(url).hset(key, flat);
    },
    async hgetall<T extends Record<string, unknown>>(
      key: string,
    ): Promise<T | null> {
      const raw = await getClient(url).hgetall(key);
      if (!raw || Object.keys(raw).length === 0) return null;
      const out: Record<string, unknown> = {};
      for (const [field, fieldValue] of Object.entries(raw)) {
        out[field] = decodeHashField(fieldValue);
      }
      return out as T;
    },
    async hincrby(key: string, field: string, increment: number) {
      return getClient(url).hincrby(key, field, increment);
    },
    async hincrbyfloat(
      key: string,
      field: string,
      increment: number,
    ): Promise<number> {
      return Number(await getClient(url).hincrbyfloat(key, field, increment));
    },
    async hdel(key: string, ...fields: string[]) {
      return getClient(url).hdel(key, ...fields);
    },
    async scan(
      cursor: string | number,
      opts?: ScanOptions,
    ): Promise<[string, string[]]> {
      const args: (string | number)[] = [];
      if (opts?.match !== undefined) args.push("MATCH", opts.match);
      if (opts?.count !== undefined) args.push("COUNT", opts.count);
      const [nextCursor, keys] = await getClient(url).scan(
        cursor,
        ...(args as []),
      );
      return [nextCursor, keys];
    },
    async zrem(key: string, ...members: string[]) {
      return getClient(url).zrem(key, ...members);
    },
    async unlink(...keys: string[]) {
      return getClient(url).unlink(...keys);
    },
    async publish(channel: string, message: string) {
      return getClient(url).publish(channel, message);
    },
    async incr(key: string) {
      return getClient(url).incr(key);
    },
    async expire(key: string, seconds: number) {
      return getClient(url).expire(key, seconds);
    },
    async ttl(key: string) {
      return getClient(url).ttl(key);
    },
    async eval<A extends unknown[], R>(
      script: string,
      keys: string[],
      args: A,
    ): Promise<R> {
      return getClient(url).eval(
        script,
        keys.length,
        ...keys,
        ...(args as (string | number)[]),
      ) as Promise<R>;
    },
  };
}
