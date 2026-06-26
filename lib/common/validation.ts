// 認証・プロファイルの入力バリデーション（純粋関数。Vitest 対象）。
// パスワード長は Supabase の minimum_password_length=6 と一致させる。

export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

// 通知時刻 'HH:00:00'（0-23時）か。
export function isValidNotifyTime(value: string): boolean {
  return /^([01]\d|2[0-3]):00:00$/.test(value);
}

// UI の「時」(0-23) を TIME 文字列へ。
export function hourToNotifyTime(hour: number): string {
  const h = Math.trunc(hour);
  if (h < 0 || h > 23) throw new Error(`時は0-23（受領: ${hour}）`);
  return `${String(h).padStart(2, "0")}:00:00`;
}

// 'HH:00:00' → 時(0-23)。null/不正は既定 8。
export function notifyTimeToHour(value: string | null): number {
  if (!value) return 8;
  const m = /^(\d{2}):/.exec(value);
  return m ? Number(m[1]) : 8;
}

// IANA タイムゾーンとして解釈可能か（Intl で検証）。
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
