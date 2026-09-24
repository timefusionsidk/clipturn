export const fmtHMS = (s: number) => { const ms = Math.round(s * 1000); return `${Math.floor(ms / 3.6e6)}:${String(Math.floor(ms / 6e4) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}` }
/** Parses "12", "1:05.5" or "0:01:05.500" into seconds; null when invalid. */
export const parseT = (t: string) => { const p = t.trim().split(':').map(Number); return !t.trim() || p.length > 3 || p.some(n => !isFinite(n) || n < 0) ? null : p.reduce((a, n) => a * 60 + n, 0) }
