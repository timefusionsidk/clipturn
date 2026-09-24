import { useEffect, useId, useState } from 'react'
import { fmtHMS, parseT } from './time'
export default function TimeInput({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => string | null }) {
  const [t, setT] = useState(fmtHMS(value)); const [err, setErr] = useState(''); const id = useId()
  useEffect(() => setT(fmtHMS(value)), [value])
  const submit = () => { const n = parseT(t); const e = n === null ? 'Enter a valid time, for example 0:00:12.500.' : onCommit(n); setErr(e ?? ''); if (e) setT(fmtHMS(value)) }
  return (
    <label className="block text-sm">{label} (h:mm:ss.mmm)
      <input value={t} onChange={e => setT(e.target.value)} onBlur={submit} onKeyDown={e => e.key === 'Enter' && submit()} inputMode="decimal" aria-invalid={!!err} aria-describedby={err ? id : undefined} className="min-h-11 w-full rounded-md border border-neutral-300 bg-white px-2 tabular-nums" />
      {err && <span id={id} role="alert" className="text-red-600">{err}</span>}
    </label>
  )
}
