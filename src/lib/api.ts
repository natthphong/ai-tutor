export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isForm = options.body instanceof FormData;
  const request:RequestInit = {
    ...options,
    headers: {
      ...(!isForm && options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  };
  let r:Response;
  try {r=await fetch(`/api${path}`,request)}catch(e){if(options.signal?.aborted)throw e;r=await fetch(`/api${path}`,request)}
  const d = await r.json();
  if (!r.ok) throw new ApiError(d.error || "เกิดข้อผิดพลาด", r.status);
  return d as T;
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
