// COM-103 エラー統一形。例外を統一エラー形に変換し、Server Action から扱いやすくする。

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

// Server Action の戻り値に使う Result 型。
export type Result<T> = { ok: true; data: T } | { ok: false; code: AppErrorCode; message: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(code: AppErrorCode, message: string): Result<never> {
  return { ok: false, code, message };
}

// 任意の例外を Result に正規化する。
export function toResult<T>(e: unknown): Result<T> {
  if (e instanceof AppError) return err(e.code, e.message);
  const message = e instanceof Error ? e.message : "予期しないエラーが発生しました";
  return err("INTERNAL", message);
}
