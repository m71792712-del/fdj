// Limiteur très simple en mémoire (par instance du serveur) : freine les essais répétés de clés à 3 chiffres.
// Il complète les limites propres à Supabase Auth ; il ne les remplace pas.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 15;
const store = new Map<string, { count: number; resetAt: number }>();

export function clientIp(h: Headers): string {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

export function isBlocked(key: string, now = Date.now()): boolean {
  const e = store.get(key);
  if (!e) return false;
  if (e.resetAt <= now) {
    store.delete(key);
    return false;
  }
  return e.count >= MAX_FAILURES;
}

export function recordFailure(key: string, now = Date.now()): void {
  if (store.size > 5000) for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
  const e = store.get(key);
  if (!e || e.resetAt <= now) store.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else e.count += 1;
}
