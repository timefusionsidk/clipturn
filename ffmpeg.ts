import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { buildArgs, type Edit, type Meta, type Out } from './edit'
let ff: FFmpeg | null = null
let loading: Promise<FFmpeg> | null = null
export function getFFmpeg(): Promise<FFmpeg> {
  if (ff) return Promise.resolve(ff)
  loading ??= (async () => {
    const [{ FFmpeg }, { toBlobURL }, core, wasm] = await Promise.all([import('@ffmpeg/ffmpeg'), import('@ffmpeg/util'), import('@ffmpeg/core?url'), import('@ffmpeg/core/wasm?url')])
    const f = new FFmpeg()
    await f.load({ coreURL: await toBlobURL(core.default, 'text/javascript'), wasmURL: await toBlobURL(wasm.default, 'application/wasm') })
    ff = f
    return f
  })().finally(() => { loading = null })
  return loading
}
export function killFFmpeg() { ff?.terminate(); ff = null }
export async function runExport(file: File, m: Meta, e: Edit, o: Out, onStage: (s: string) => void, onProgress: (p: number) => void): Promise<Blob> {
  onStage('Downloading video engine')
  let f: FFmpeg
  try { f = await getFFmpeg() } catch { throw new Error('The video engine failed to load. Check your connection and try again.') }
  const { fetchFile } = await import('@ffmpeg/util')
  const name = `out.${o.fmt}`
  const h = ({ progress }: { progress: number }) => onProgress(Math.min(1, Math.max(0, progress)))
  f.on('progress', h)
  try {
    onStage('Reading video')
    await f.writeFile('in', await fetchFile(file))
    onStage('Applying edits and encoding')
    const code = await f.exec(buildArgs(m, e, o))
    if (code !== 0) throw new Error('Video processing failed. Try a smaller file or MP4 output.')
    onStage('Preparing preview')
    const data = (await f.readFile(name)) as Uint8Array
    return new Blob([data as BlobPart], { type: o.fmt === 'mp4' ? 'video/mp4' : 'video/webm' })
  } finally {
    f.off('progress', h)
    try { await f.deleteFile('in'); await f.deleteFile(name) } catch { /* terminated */ }
  }
}
