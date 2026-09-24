export type Edit = { start: number; end: number; rev: 'none' | 'both' | 'video'; rot: 0 | 90 | 180 | 270; crop: { x: number; y: number; w: number; h: number } | null }
export type Out = { fmt: 'mp4' | 'webm'; q: 'small' | 'balanced' | 'high'; maxH: number; audio: boolean }
export type Meta = { duration: number; w: number; h: number }
const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2)
export const rotDims = (m: Meta, rot: number) => (rot === 90 || rot === 270 ? { w: m.h, h: m.w } : { w: m.w, h: m.h })
export function outDims(m: Meta, e: Edit, o: Out) {
  const r = rotDims(m, e.rot)
  let w = e.crop ? e.crop.w : r.w, h = e.crop ? e.crop.h : r.h
  if (o.maxH > 0 && h > o.maxH) { w = w * o.maxH / h; h = o.maxH }
  return { w: even(w), h: even(h) }
}
const CRF = { mp4: { small: 28, balanced: 23, high: 18 }, webm: { small: 40, balanced: 33, high: 26 } }
const AB = { small: '96k', balanced: '128k', high: '192k' }
export function buildArgs(m: Meta, e: Edit, o: Out) {
  const vf: string[] = []
  if (e.rev !== 'none') vf.push('reverse')
  if (e.rot === 90) vf.push('transpose=1'); else if (e.rot === 270) vf.push('transpose=2'); else if (e.rot === 180) vf.push('hflip,vflip')
  if (e.crop) { const c = e.crop; vf.push(`crop=${even(c.w)}:${even(c.h)}:${c.x}:${c.y}`) }
  if (o.maxH > 0) vf.push(`scale=-2:'min(ih,${o.maxH})'`)
  vf.push('scale=trunc(iw/2)*2:trunc(ih/2)*2', 'format=yuv420p')
  const args = ['-ss', e.start.toFixed(3), '-t', (e.end - e.start).toFixed(3), '-i', 'in', '-vf', vf.join(',')]
  if (!o.audio || e.rev === 'video') args.push('-an'); else if (e.rev === 'both') args.push('-af', 'areverse')
  if (o.fmt === 'mp4') args.push('-c:v', 'libx264', '-preset', o.q === 'high' ? 'fast' : 'veryfast', '-crf', String(CRF.mp4[o.q]), '-movflags', '+faststart', '-c:a', 'aac', '-b:a', AB[o.q])
  else args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(CRF.webm[o.q]), '-deadline', 'realtime', '-cpu-used', '8', '-c:a', 'libopus', '-b:a', AB[o.q])
  args.push(`out.${o.fmt}`)
  return args
}
