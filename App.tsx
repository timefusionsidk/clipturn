import { useEffect, useRef, useState } from 'react'
import { Scissors, Rewind, RotateCw, Crop, Undo2, Redo2, Download, X, RefreshCw, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'
import Landing from './Landing'
import Legal from './Legal'
import AdSlot from './AdSlot'
import TimeInput from './TimeInput'
import ThemeToggle from './ThemeToggle'
import { track } from './lib/analytics'
import { outDims, rotDims, type Edit, type Meta, type Out } from './lib/edit'
import { killFFmpeg, runExport } from './lib/ffmpeg'

const OK_EXT = /\.(mp4|mov|webm|mkv|avi|m4v|mpe?g)$/i
const fmtT = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`)
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
type Tool = 'trim' | 'reverse' | 'rotate' | 'crop'
type Stage = 'idle' | 'edit' | 'busy' | 'done' | 'error' | 'cancelled'
const TOOLS: [Tool, string, typeof Scissors][] = [['trim', 'Trim', Scissors], ['reverse', 'Reverse', Rewind], ['rotate', 'Rotate', RotateCw], ['crop', 'Crop', Crop]]
const HANDLES = [['nw','left-0 top-0 cursor-nwse-resize'],['n','left-1/2 top-0 -translate-x-1/2 cursor-ns-resize'],['ne','right-0 top-0 cursor-nesw-resize'],['e','right-0 top-1/2 -translate-y-1/2 cursor-ew-resize'],['se','bottom-0 right-0 cursor-nwse-resize'],['s','bottom-0 left-1/2 -translate-x-1/2 cursor-ns-resize'],['sw','bottom-0 left-0 cursor-nesw-resize'],['w','left-0 top-1/2 -translate-y-1/2 cursor-ew-resize']]
const RATIOS: [string, number | null][] = [['Free', null], ['Original', -1], ['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['16:9', 16 / 9], ['9:16', 9 / 16]]

export default function App() {
  const [stage, setStage] = useState<Stage>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [msg, setMsg] = useState('')
  const [warn, setWarn] = useState('')
  const [tool, setTool] = useState<Tool>('trim')
  const [edit, setEdit] = useState<Edit>({ start: 0, end: 0, rev: 'none', rot: 0, crop: null })
  const [past, setPast] = useState<Edit[]>([])
  const [future, setFuture] = useState<Edit[]>([])
  const [out, setOut] = useState<Out>({ fmt: 'mp4', q: 'balanced', maxH: 0, audio: true })
  const [step, setStep] = useState('')
  const [prog, setProg] = useState(0)
  const [secs, setSecs] = useState(0)
  const [res, setRes] = useState<{ url: string; size: number; name: string } | null>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const cancelled = useRef(false)
  const busy = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [sheet, setSheet] = useState(true)
  const [hash, setHash] = useState(location.hash)
  useEffect(() => { const f = () => setHash(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])

  useEffect(() => {
    if (stage !== 'busy') return
    const t0 = Date.now(); const id = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 500)
    return () => clearInterval(id)
  }, [stage])

  const commit = (patch: Partial<Edit>) => { setPast(p => [...p.slice(-49), edit]); setFuture([]); setEdit({ ...edit, ...patch }) }
  const undo = () => { if (!past.length) return; setFuture(f => [edit, ...f]); setEdit(past[past.length - 1]); setPast(past.slice(0, -1)) }
  const redo = () => { if (!future.length) return; setPast(p => [...p, edit]); setEdit(future[0]); setFuture(future.slice(1)) }
  const clearResult = () => { if (res) URL.revokeObjectURL(res.url); setRes(null) }
  const reset = () => { clearResult(); if (url) URL.revokeObjectURL(url); killFFmpeg(); setFile(null); setUrl(''); setMeta(null); setStage('idle'); setMsg(''); setWarn('') }

  function pick(f?: File) {
    if (!f) return
    setMsg('')
    if (typeof WebAssembly === 'undefined' || typeof Worker === 'undefined') return setMsg('This browser cannot run the video engine. Please use a recent version of Chrome, Edge, Firefox or Safari.')
    if (!OK_EXT.test(f.name) && !f.type.startsWith('video/')) return setMsg('Please choose a supported video file.')
    if (f.size === 0) return setMsg('This file appears to be empty or corrupted.')
    if (f.size > 2e9) return setMsg('This video may be too large for your device to process safely.')
    const u = URL.createObjectURL(f); const v = document.createElement('video'); v.preload = 'metadata'
    v.onloadedmetadata = () => {
      if (!isFinite(v.duration) || !v.videoWidth) { URL.revokeObjectURL(u); return setMsg('This video cannot be previewed, so it cannot be edited here. Try an MP4 file.') }
      reset(); track('video_selected'); setFile(f); setUrl(u); setMeta({ duration: v.duration, w: v.videoWidth, h: v.videoHeight })
      setEdit({ start: 0, end: v.duration, rev: 'none', rot: 0, crop: null }); setPast([]); setFuture([]); setTool('trim'); setStage('edit')
      setWarn(f.size > 5e8 ? 'This video may be too large for browser processing. Try closing other tabs, selecting a shorter section, lowering the export resolution, or using a computer.' : '')
    }
    v.onerror = () => { URL.revokeObjectURL(u); setMsg('This video cannot be previewed, so it cannot be edited here. Try an MP4 file.') }
    v.src = u
  }

  async function doExport() {
    if (!file || !meta || busy.current) return
    const len = edit.end - edit.start
    if (edit.rev !== 'none' && len > 60) return setMsg('Reversing is limited to 60 seconds in the browser. Trim the video to a shorter section first.')
    track('export_started'); busy.current = true; cancelled.current = false; clearResult(); setMsg(''); setProg(0); setStep('Preparing editor'); setStage('busy')
    try {
      const blob = await runExport(file, meta, edit, out, setStep, setProg)
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '_') || 'video'
      setRes({ url: URL.createObjectURL(blob), size: blob.size, name: `${base}-edited.${out.fmt}` }); setStage('done'); track('export_completed')
    } catch (e) {
      if (cancelled.current) setStage('cancelled')
      else { track('export_failed'); const m = String((e as Error)?.message ?? e); setMsg(/memory|alloc|abort|out of bounds|RangeError/i.test(m) ? 'Your browser ran out of memory. Try a shorter section or lower resolution.' : m.startsWith('Video') || m.startsWith('The video engine') ? m : 'Video processing failed. Try a smaller file or MP4 output.'); setStage('error'); killFFmpeg() }
    } finally { busy.current = false }
  }
  function cancel() { track('export_cancelled'); cancelled.current = true; killFFmpeg(); setStage('cancelled') }

  // ---------- crop helpers (rotated coordinate system) ----------
  const rd = meta ? rotDims(meta, edit.rot) : { w: 0, h: 0 }
  const setCrop = (c: Partial<NonNullable<Edit['crop']>>) => {
    const b = edit.crop ?? { x: 0, y: 0, w: rd.w, h: rd.h }; const n = { ...b, ...c }
    n.w = clamp(Math.round(n.w), 2, rd.w); n.h = clamp(Math.round(n.h), 2, rd.h); n.x = clamp(Math.round(n.x), 0, rd.w - n.w); n.y = clamp(Math.round(n.y), 0, rd.h - n.h)
    commit({ crop: n })
  }
  const preset = (r: number | null) => {
    setRatio(r)
    if (r === null) return commit({ crop: null })
    let w = rd.w, h = w / r; if (h > rd.h) { h = rd.h; w = h * r }
    w = Math.floor(w / 2) * 2; h = Math.floor(h / 2) * 2
    commit({ crop: { w, h, x: Math.floor((rd.w - w) / 2), y: Math.floor((rd.h - h) / 2) } })
  }
  const setRot = (rot: Edit['rot']) => { setPast(p => [...p.slice(-49), edit]); setFuture([]); setEdit({ ...edit, rot, crop: null }) }
  const tnum = (v: string, f: (n: number) => void) => { const n = parseFloat(v); if (isFinite(n)) f(n) }

  const resetTool = () => { if (!meta) return; setRatio(null); commit(tool === 'trim' ? { start: 0, end: meta.duration } : tool === 'reverse' ? { rev: 'none' } : tool === 'rotate' ? { rot: 0, crop: null } : { crop: null }) }
  function startDrag(e: React.PointerEvent, mode: string) {
    e.preventDefault(); e.stopPropagation()
    const box = stageRef.current!.getBoundingClientRect(); const o = edit.crop ?? { x: 0, y: 0, w: rd.w, h: rd.h }; const k = rd.w / box.width
    setPast(p => [...p.slice(-49), edit]); setFuture([])
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - e.clientX) * k, dy = (ev.clientY - e.clientY) * k
      let { x, y, w, h } = o
      if (mode === 'm') { x += dx; y += dy } else {
        if (mode.includes('e')) w += dx; if (mode.includes('s')) h += dy
        if (mode.includes('w')) { x += dx; w -= dx } if (mode.includes('n')) { y += dy; h -= dy }
        if (ratio) { if (mode === 'n' || mode === 's') w = h * ratio; else { const nh = w / ratio; if (mode.includes('n')) y += h - nh; h = nh } }
      }
      w = clamp(Math.round(w), 16, rd.w); h = clamp(Math.round(h), 16, rd.h); x = clamp(Math.round(x), 0, rd.w - w); y = clamp(Math.round(y), 0, rd.h - h)
      setEdit(prev => ({ ...prev, crop: { x, y, w, h } }))
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true })
  }
  const od = meta ? outDims(meta, edit, out) : { w: 0, h: 0 }
  const summary = meta ? [`Trimmed ${fmtT(edit.start)}–${fmtT(edit.end)}`, edit.rev !== 'none' && 'Reversed', edit.rot && `Rotated ${edit.rot}°`, edit.crop && `Cropped to ${edit.crop.w} × ${edit.crop.h}`].filter(Boolean).join(' • ') : ''
  const card = 'rounded-lg border border-neutral-200 bg-white'
  const btn = 'min-h-11 rounded-md px-4 font-semibold transition-colors'
  const num = 'min-h-11 w-full rounded-md border border-neutral-300 bg-white px-2'

  const header = (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-[#faf9f7]/95 px-4 py-2">
      <span className="text-xl font-extrabold tracking-tight">Clip<span className="text-[#5b4bff]">Turn</span></span>
      {file && <span className="hidden truncate text-sm text-neutral-500 sm:block">{file.name}</span>}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        {stage === 'edit' && <>
          <button aria-label="Undo" disabled={!past.length} onClick={undo} className={`${btn} px-3 disabled:opacity-30`}><Undo2 size={18} /></button>
          <button aria-label="Redo" disabled={!future.length} onClick={redo} className={`${btn} px-3 disabled:opacity-30`}><Redo2 size={18} /></button>
          <button onClick={() => { setPast(p => [...p, edit]); setEdit({ start: 0, end: meta!.duration, rev: 'none', rot: 0, crop: null }) }} className={`${btn} hidden sm:block`}>Reset</button>
          <button onClick={doExport} className={`${btn} bg-[#5b4bff] text-white hover:bg-[#4a3bea]`}>Export</button>
        </>}
        {file && stage !== 'busy' && <button aria-label="Remove video" onClick={reset} className={`${btn} px-3`}><X size={18} /></button>}
      </div>
    </header>
  )

  if (/^#\/(privacy|terms|copyright|contact)$/.test(hash) && stage !== 'busy') return <Legal page={hash.slice(2)} />
  if (stage === 'idle') return <Landing msg={msg} pick={pick} />

  if (stage === 'busy') return (
    <div>{header}
      <main role="status" className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold">{step}</h1>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-neutral-200"><div className="h-full bg-[#5b4bff] transition-all" style={{ width: `${Math.round(prog * 100)}%` }} /></div>
        <p className="mt-2 text-sm text-neutral-600">{prog > 0 ? `${Math.round(prog * 100)}%` : 'Processing locally. The time required depends on your device and video size.'} · {secs}s elapsed</p>
        <p className="mt-4 text-sm text-neutral-500">The first export may take longer while the private video-processing engine loads in your browser. Keep this tab open.</p>
        <button onClick={cancel} className={`${btn} mt-8 border border-neutral-300 bg-white`}>Cancel</button>
      </main></div>
  )

  if (stage === 'done' && res && meta) return (
    <div>{header}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-extrabold">Your video is ready</h1>
        <video src={res.url} controls className="mt-4 max-h-[60vh] w-full rounded-lg bg-black" />
        <p className="mt-3 text-sm text-neutral-600">{res.name} · {out.fmt.toUpperCase()} · {od.w} × {od.h} · {fmtT(edit.end - edit.start)} · {fmtSize(res.size)}</p>
        <p className="text-sm text-neutral-600">{summary}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a onClick={() => track('video_downloaded')} href={res.url} download={res.name} className={`${btn} inline-flex items-center gap-2 bg-[#5b4bff] pt-2.5 text-white`}><Download size={18} />Download</a>
          <button onClick={() => { clearResult(); setStage('edit') }} className={`${btn} border border-neutral-300 bg-white`}>Edit Again</button>
          <button onClick={reset} className={`${btn} border border-neutral-300 bg-white`}>Start New Video</button>
        </div>
        <AdSlot slot={import.meta.env.VITE_AD_SLOT_RESULT} />
      </main></div>
  )

  if (stage === 'error' || stage === 'cancelled') return (
    <div>{header}
      <main role="alert" className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold">{stage === 'cancelled' ? 'Export cancelled' : 'Export failed'}</h1>
        <p className="mt-3 text-neutral-600">{stage === 'cancelled' ? 'Nothing was saved. Your edits are still here.' : msg}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => { setMsg(''); setStage('edit') }} className={`${btn} bg-[#5b4bff] text-white`}>Back to editor</button>
          {stage === 'error' && <button onClick={doExport} className={`${btn} inline-flex items-center gap-2 border border-neutral-300 bg-white pt-2.5`}><RefreshCw size={16} />Retry</button>}
        </div>
      </main></div>
  )

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <div className="flex flex-1 flex-col md:flex-row">
        <nav aria-label="Tools" className="order-3 flex justify-around max-md:sticky max-md:bottom-0 border-t border-neutral-200 bg-white md:order-1 md:w-20 md:flex-col md:justify-start md:border-r md:border-t-0">
          {TOOLS.map(([id, label, Icon]) => (
            <button key={id} aria-pressed={tool === id} onClick={() => { setTool(id); track('tool_selected', { tool: id }) }} className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold md:flex-none md:py-4 ${tool === id ? 'text-[#5b4bff]' : 'text-neutral-600'}`}><Icon size={20} />{label}</button>
          ))}
        </nav>
        <main className="order-1 flex flex-1 flex-col items-center justify-center gap-2 bg-neutral-100 p-3 md:order-2">
          <div ref={stageRef} className="relative overflow-hidden bg-black" style={{ aspectRatio: `${rd.w}/${rd.h}`, width: `min(100%, calc(55vh * ${rd.w / rd.h}))`, containerType: 'size' }}>
            <video ref={vid} src={url} playsInline muted={muted} onTimeUpdate={e => setCur(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="absolute left-1/2 top-1/2 max-w-none" style={{ width: edit.rot % 180 ? '100cqh' : '100cqw', height: edit.rot % 180 ? '100cqw' : '100cqh', transform: `translate(-50%,-50%) rotate(${edit.rot}deg)`, transition: 'transform .2s' }} />
            {tool === 'crop' && (() => { const c = edit.crop ?? { x: 0, y: 0, w: rd.w, h: rd.h }; return (
              <div onPointerDown={e => startDrag(e, 'm')} className="absolute cursor-move touch-none border-2 border-[#5b4bff] shadow-[0_0_0_9999px_rgba(0,0,0,.5)]" style={{ left: `${c.x / rd.w * 100}%`, top: `${c.y / rd.h * 100}%`, width: `${c.w / rd.w * 100}%`, height: `${c.h / rd.h * 100}%` }}>
                {HANDLES.map(([m, cls]) => <span key={m} onPointerDown={e => startDrag(e, m)} className={`absolute h-7 w-7 touch-none rounded-sm border-2 border-white bg-[#5b4bff] ${cls}`} />)}
              </div>) })()}
          </div>
          <div className="flex w-full max-w-2xl items-center gap-2">
            <button aria-label={playing ? 'Pause' : 'Play'} onClick={() => { const v = vid.current; if (v) { if (v.paused) void v.play(); else v.pause() } }} className={`${btn} px-3`}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
            <input aria-label="Seek" type="range" min={0} max={meta!.duration} step="0.01" value={cur} onChange={e => { if (vid.current) vid.current.currentTime = +e.target.value }} className="min-w-0 flex-1" />
            <span className="hidden text-xs tabular-nums sm:block">{fmtT(cur)} / {fmtT(meta!.duration)}</span>
            <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)} className={`${btn} px-3`}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <input aria-label="Volume" type="range" min={0} max={1} step="0.05" defaultValue={1} onChange={e => { if (vid.current) vid.current.volume = +e.target.value }} className="hidden w-16 sm:block" />
            <select aria-label="Preview speed" value={rate} onChange={e => { setRate(+e.target.value); if (vid.current) vid.current.playbackRate = +e.target.value }} className="min-h-11 rounded-md border border-neutral-300 bg-white px-1 text-sm">{[0.5, 1, 1.5, 2].map(r => <option key={r} value={r}>{r}×</option>)}</select>
            <button aria-label="Fullscreen" onClick={() => stageRef.current?.requestFullscreen?.()} className={`${btn} px-3`}><Maximize size={18} /></button>
          </div>
          <p className="text-xs text-neutral-500">Preview is approximate. The exported file applies the exact transformation.</p>
        </main>
        <aside className="order-2 w-full border-neutral-200 bg-[#faf9f7] p-4 md:order-3 md:w-80 md:border-l"><button aria-expanded={sheet} onClick={() => setSheet(!sheet)} className="mb-2 min-h-11 w-full rounded-md border border-neutral-300 bg-white font-semibold md:hidden">{sheet ? 'Hide settings' : 'Show settings'}</button><div className={`space-y-4 ${sheet ? '' : 'max-md:hidden'}`}>
          {warn && <p role="alert" className="text-sm text-amber-700">{warn}</p>}
          {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
          {tool === 'trim' && meta && <section className="space-y-3">
            <h2 className="font-bold">Trim</h2>
            <TimeInput label="Start" value={edit.start} onCommit={n => n >= edit.end ? 'Start must be before the end time.' : (commit({ start: n }), null)} />
            <TimeInput label="End" value={edit.end} onCommit={n => n > meta.duration ? 'End cannot exceed the video length.' : n <= edit.start ? 'End must be after the start time.' : (commit({ end: n }), null)} />
            <label className="block text-sm">Start slider<input type="range" min={0} max={meta.duration} step="0.01" value={edit.start} onChange={e => { commit({ start: clamp(+e.target.value, 0, edit.end - 0.1) }); if (vid.current) vid.current.currentTime = +e.target.value }} className="w-full" /></label>
            <label className="block text-sm">End slider<input type="range" min={0} max={meta.duration} step="0.01" value={edit.end} onChange={e => { commit({ end: clamp(+e.target.value, edit.start + 0.1, meta.duration) }); if (vid.current) vid.current.currentTime = +e.target.value }} className="w-full" /></label>
            <div className="grid grid-cols-2 gap-2">
              <button className={`${btn} border border-neutral-300 bg-white text-sm`} onClick={() => commit({ start: clamp(vid.current?.currentTime ?? 0, 0, edit.end - 0.1) })}>Start = playhead</button>
              <button className={`${btn} border border-neutral-300 bg-white text-sm`} onClick={() => commit({ end: clamp(vid.current?.currentTime ?? 0, edit.start + 0.1, meta.duration) })}>End = playhead</button>
              <button className={`${btn} border border-neutral-300 bg-white text-sm`} onClick={() => commit({ start: 0, end: meta.duration })}>Full length</button>
              <button className={`${btn} border border-neutral-300 bg-white text-sm`} onClick={() => { const v = vid.current; if (!v) return; v.currentTime = edit.start; v.play(); const s = () => { if (v.currentTime >= edit.end) { v.pause(); v.removeEventListener('timeupdate', s) } }; v.addEventListener('timeupdate', s) }}>Play selection</button>
            </div>
            <p className="text-sm text-neutral-600">Original {fmtT(meta.duration)} · Selected {fmtT(edit.end - edit.start)} · Removed {fmtT(meta.duration - (edit.end - edit.start))}</p>
          </section>}
          {tool === 'reverse' && <section className="space-y-2">
            <h2 className="font-bold">Reverse</h2>
            {([['both', 'Reverse video and audio'], ['fwd', 'Reverse video, keep original audio forward'], ['video', 'Reverse video only (muted)'], ['none', 'Off']] as const).map(([v, l]) => (
              <label key={v} className="flex min-h-11 items-center gap-2"><input type="radio" name="rev" checked={edit.rev === v} onChange={() => commit({ rev: v })} />{l}</label>
            ))}
            <p className="text-sm text-amber-700">Reversing video requires more memory than trimming or rotating. For the best result, trim the video to a shorter section first. Limit: 60 seconds.</p>
          </section>}
          {tool === 'rotate' && <section className="space-y-2">
            <h2 className="font-bold">Rotate</h2>
            {([[0, 'Original'], [90, '90° clockwise'], [270, '90° counter-clockwise'], [180, '180°']] as const).map(([v, l]) => (
              <button key={v} aria-pressed={edit.rot === v} onClick={() => setRot(v)} className={`${btn} w-full border text-left ${edit.rot === v ? 'border-[#5b4bff] bg-[#5b4bff]/10' : 'border-neutral-300 bg-white'}`}>{l}</button>
            ))}
            <p className="text-sm text-neutral-600">Output frame: {rd.w} × {rd.h}</p>
          </section>}
          {tool === 'crop' && <section className="space-y-3">
            <h2 className="font-bold">Crop</h2>
            <div className="flex flex-wrap gap-2">{RATIOS.map(([l, r]) => <button key={l} onClick={() => preset(r === -1 ? rd.w / rd.h : r)} className={`${btn} border border-neutral-300 bg-white px-3 text-sm`}>{l}</button>)}</div>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={ratio !== null} onChange={e => setRatio(e.target.checked ? (edit.crop ? edit.crop.w / edit.crop.h : rd.w / rd.h) : null)} />Lock aspect ratio</label>
            <div className="grid grid-cols-2 gap-2">
              {(['x', 'y', 'w', 'h'] as const).map(k => (
                <label key={k} className="text-sm">{k === 'w' ? 'Width' : k === 'h' ? 'Height' : k.toUpperCase()}
                  <input type="number" className={num} value={(edit.crop ?? { x: 0, y: 0, w: rd.w, h: rd.h })[k]} onChange={e => tnum(e.target.value, n => setCrop({ [k]: n }))} /></label>
              ))}
            </div>
            <button className={`${btn} border border-neutral-300 bg-white text-sm`} onClick={() => edit.crop && commit({ crop: { ...edit.crop, x: Math.floor((rd.w - edit.crop.w) / 2), y: Math.floor((rd.h - edit.crop.h) / 2) } })}>Centre crop</button>
            <p className="text-sm text-neutral-600">Coordinates are in the rotated frame ({rd.w} × {rd.h}). Overlay shows when rotation is Original.</p>
          </section>}
          <button className={`${btn} w-full border border-neutral-300 bg-white text-sm`} onClick={resetTool}>Reset {tool}</button>
          <section className={`${card} space-y-2 p-3`}>
            <h2 className="font-bold">Output</h2>
            <label className="block text-sm">Format<select className={num} value={out.fmt} onChange={e => setOut({ ...out, fmt: e.target.value as Out['fmt'] })}><option value="mp4">MP4</option><option value="webm">WEBM</option></select></label>
            <label className="block text-sm">Quality<select className={num} value={out.q} onChange={e => setOut({ ...out, q: e.target.value as Out['q'] })}><option value="small">Smaller file</option><option value="balanced">Balanced</option><option value="high">High quality</option></select></label>
            <label className="block text-sm">Resolution<select className={num} value={out.maxH} onChange={e => setOut({ ...out, maxH: +e.target.value })}><option value={0}>Keep edited resolution</option><option value={1080}>1080p maximum</option><option value={720}>720p maximum</option><option value={480}>480p maximum</option></select></label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={!out.audio} onChange={e => setOut({ ...out, audio: !e.target.checked })} />Remove audio</label>
            <p className="text-xs text-neutral-600">{out.fmt.toUpperCase()} · {od.w} × {od.h} · {fmtT(edit.end - edit.start)} · {out.audio && edit.rev !== 'video' ? 'audio kept' : 'no audio'}<br />{summary}</p>
          </section>
        </div></aside>
      </div>
      <AdSlot slot={import.meta.env.VITE_AD_SLOT_EDITOR} />
    </div>
  )
}
