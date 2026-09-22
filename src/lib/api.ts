export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

type PendingRequest<T> = {
  controller?: AbortController;
  generation: number;
  promise: Promise<T>;
  subscribers: number;
  cancelled: boolean;
};

const MAX_CACHE_ENTRIES = 64;
const CACHE_TTLS: Record<string, number> = {
  auth: 10_000,
  curriculum: 30_000,
  dailyPlan: 10_000,
  library: 15_000,
  ebook: 60_000,
  ebookUnit: 60_000,
};
const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, PendingRequest<unknown>>();
let cacheGeneration = 0;
let activeAccountId: string | undefined;

function canUseBrowserCache() {
  return typeof window !== "undefined";
}

function pathname(path: string) {
  return path.split("?", 1)[0];
}

function cacheTtl(path: string) {
  const cleanPath = pathname(path);
  if (cleanPath === "/auth/me") return CACHE_TTLS.auth;
  if (cleanPath === "/curriculum") return CACHE_TTLS.curriculum;
  if (cleanPath === "/daily-plan") return CACHE_TTLS.dailyPlan;
  if (cleanPath === "/library") return CACHE_TTLS.library;
  if (cleanPath === "/ebook") return CACHE_TTLS.ebook;
  if (/^\/ebook\/units\/[^/]+$/.test(cleanPath)) return CACHE_TTLS.ebookUnit;
  return 0;
}

function methodOf(options: RequestInit) {
  return (options.method || "GET").toUpperCase();
}

function hasAuthorizationHeader(headers: HeadersInit | undefined) {
  if (!headers) return false;
  if (typeof Headers !== "undefined" && headers instanceof Headers)
    return headers.has("authorization");
  if (Array.isArray(headers))
    return headers.some(([key]) => key.toLowerCase() === "authorization");
  return Object.keys(headers).some((key) => key.toLowerCase() === "authorization");
}

function isCacheableGet(path: string, options: RequestInit) {
  return (
    canUseBrowserCache() &&
    methodOf(options) === "GET" &&
    options.body == null &&
    options.cache !== "no-store" &&
    options.cache !== "no-cache" &&
    options.cache !== "reload" &&
    options.credentials !== "omit" &&
    !hasAuthorizationHeader(options.headers) &&
    cacheTtl(path) > 0
  );
}

function abortError(signal: AbortSignal) {
  return signal.reason || new DOMException("Aborted", "AbortError");
}

function throwIfAborted(signal: AbortSignal | null | undefined) {
  if (signal?.aborted) throw abortError(signal);
}

function readCache<T>(key: string) {
  const entry = responseCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return undefined;
  }
  // Refresh insertion order so the bounded cache behaves as a small LRU.
  responseCache.delete(key);
  responseCache.set(key, entry);
  return entry.value as T;
}

function writeCache(key: string, value: unknown, ttl: number, generation: number) {
  if (!canUseBrowserCache() || generation !== cacheGeneration) return;
  responseCache.delete(key);
  responseCache.set(key, { value, expiresAt: Date.now() + ttl });
  while (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    if (oldest === undefined) break;
    responseCache.delete(oldest);
  }
}

function invalidateCache(includeAuth: boolean) {
  cacheGeneration += 1;
  for (const key of responseCache.keys()) {
    if (includeAuth || key !== "/auth/me") responseCache.delete(key);
  }
  if (includeAuth) activeAccountId = undefined;
}

function invalidatesAuth(path: string) {
  const cleanPath = pathname(path);
  return cleanPath === "/profile" || cleanPath.startsWith("/auth/");
}

function accountId(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" && id ? id : undefined;
}

function observeAccount(value: unknown, generation: number) {
  if (generation !== cacheGeneration) return generation;
  const id = accountId(value);
  if (!id) return generation;
  if (activeAccountId && activeAccountId !== id) {
    invalidateCache(true);
    activeAccountId = id;
    return cacheGeneration;
  }
  activeAccountId = id;
  return generation;
}

function waitForAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal | null | undefined,
) {
  if (!signal) return promise;
  throwIfAborted(signal);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(abortError(signal));
    };
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        if (signal.aborted) reject(abortError(signal));
        else resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

function subscribe<T>(
  pending: PendingRequest<T>,
  signal: AbortSignal | null | undefined,
) {
  throwIfAborted(signal);
  pending.subscribers += 1;
  return waitForAbort(pending.promise, signal).finally(() => {
    pending.subscribers -= 1;
    if (pending.subscribers === 0 && !pending.controller?.signal.aborted) {
      pending.cancelled = true;
      pending.controller?.abort();
    }
  });
}

async function requestJson<T>(path: string, request: RequestInit) {
  let r: Response;
  try {
    r = await fetch(`/api${path}`, request);
  } catch (e) {
    if (request.signal?.aborted) throw e;
    r = await fetch(`/api${path}`, request);
  }
  const d = await r.json();
  if (!r.ok) {
    if (r.status === 401 && canUseBrowserCache()) invalidateCache(true);
    throw new ApiError(d.error || "เกิดข้อผิดพลาด", r.status);
  }
  return d as T;
}

function startCachedRequest<T>(
  key: string,
  path: string,
  request: RequestInit,
  ttl: number,
  generation: number,
) {
  const controller = typeof AbortController === "undefined" ? undefined : new AbortController();
  const requestWithInternalSignal = controller
    ? { ...request, signal: controller.signal }
    : request;
  let pending: PendingRequest<T>;
  const promise = requestJson<T>(path, requestWithInternalSignal)
    .then((value) => {
      if (!pending.cancelled && !controller?.signal.aborted && generation === cacheGeneration) {
        const writeGeneration =
          pathname(path) === "/auth/me"
            ? observeAccount(value, generation)
            : generation;
        writeCache(key, value, ttl, writeGeneration);
      }
      return value;
    })
    .finally(() => {
      if (pendingRequests.get(key) === pending) pendingRequests.delete(key);
    });
  pending = {
    controller,
    generation,
    promise,
    subscribers: 0,
    cancelled: false,
  };
  pendingRequests.set(key, pending as PendingRequest<unknown>);
  return pending;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = methodOf(options);
  if (canUseBrowserCache() && method !== "GET" && method !== "HEAD")
    invalidateCache(invalidatesAuth(path));

  const isForm =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const request:RequestInit = {
    ...options,
    headers: {
      ...(!isForm && options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  };
  const isMutation = method !== "GET" && method !== "HEAD";
  if (!isCacheableGet(path, options)) {
    const generation = cacheGeneration;
    const result = requestJson<T>(path, request).then((value) => {
      if (
        canUseBrowserCache() &&
        pathname(path) === "/auth/me" &&
        generation === cacheGeneration
      )
        observeAccount(value, generation);
      return value;
    });
    if (canUseBrowserCache() && isMutation) {
      const includeAuth = invalidatesAuth(path);
      return result.finally(() => invalidateCache(includeAuth));
    }
    return result;
  }

  throwIfAborted(options.signal);
  const key = path;
  const cached = readCache<T>(key);
  if (cached !== undefined) return cached;

  const ttl = cacheTtl(path);
  const generation = cacheGeneration;
  const existing = pendingRequests.get(key) as PendingRequest<T> | undefined;
  const pending =
    existing &&
    existing.generation === generation &&
    !existing.cancelled &&
    !existing.controller?.signal.aborted
      ? existing
      : startCachedRequest<T>(key, path, request, ttl, generation);
  return subscribe(pending, options.signal);
}
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
export async function awaitJob<T>(
  id: string,
  signal?: AbortSignal,
): Promise<T> {
  for (let i = 0; i < 90; i++) {
    signal?.throwIfAborted();
    const j = await api<{ status: string; result: T; error?: string }>(
      `/jobs/${id}`,
      { signal },
    );
    if (j.status === "complete") return j.result;
    if (j.status === "failed") throw new Error(j.error || "ทำงานไม่สำเร็จ");
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, 1000);
      signal?.addEventListener("abort", abort, { once: true });
    });
  }
  throw new Error("งานยังประมวลผลอยู่ ลองกลับมาตรวจอีกครั้ง");
}
