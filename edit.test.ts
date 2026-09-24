import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildArgs, outDims, type Edit, type Out } from './edit'
import { parseT } from './time'
const FF = process.env.FFMPEG || 'ffmpeg'
const has = spawnSync(FF, ['-version']).status === 0
const meta = { duration: 4, w: 320, h: 240 }
const out: Out = { fmt: 'mp4', q: 'small', maxH: 0, audio: true }
const base: Edit = { start: 0, end: 4, rev: 'none', rot: 0, crop: null }
const probe = (dir: string, f: string) => { const t = spawnSync(FF, ['-i', join(dir, f)], { encoding: 'utf8' }).stderr; const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(t)!; const v = /Video:.*?(\d{2,5})x(\d{2,5})/.exec(t)!; return { dur: +d[1] * 3600 + +d[2] * 60 + +d[3], w: +v[1], h: +v[2] } }
function run(e: Edit, o: Out) { const dir = mkdtempSync(join(tmpdir(), 'ct-')); execFileSync(FF, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=10:duration=4', '-f', 'lavfi', '-i', 'sine=d=4', '-c:v', 'libx264', '-c:a', 'aac', '-f', 'mp4', join(dir, 'in')], { stdio: 'ignore' }); execFileSync(FF, ['-y', ...buildArgs(meta, e, o)], { cwd: dir, stdio: 'ignore' }); expect(existsSync(join(dir, `out.${o.fmt}`))).toBe(true); writeFileSync(join(dir, 'ok'), ''); return probe(dir, `out.${o.fmt}`) }
describe('helpers', () => {
  it('parses times', () => { expect(parseT('1:05.5')).toBe(65.5); expect(parseT('0:00:12.500')).toBe(12.5); expect(parseT('abc')).toBeNull(); expect(parseT('-1')).toBeNull() })
  it('swaps dimensions on 90° rotation and keeps crop even', () => { expect(outDims(meta, { ...base, rot: 90 }, out)).toEqual({ w: 240, h: 320 }); expect(outDims(meta, { ...base, crop: { x: 0, y: 0, w: 101, h: 51 } }, out)).toEqual({ w: 100, h: 50 }); expect(outDims({ ...meta, h: 2160, w: 3840 }, base, { ...out, maxH: 720 }).h).toBe(720) })
})
describe.skipIf(!has)('ffmpeg end-to-end', () => {
  it('trims accurately', () => { const r = run({ ...base, start: 1, end: 3 }, out); expect(r.dur).toBeCloseTo(2, 0) }, 60000)
  it('rotates 90° and swaps size', () => { const r = run({ ...base, rot: 90 }, out); expect([r.w, r.h]).toEqual([240, 320]) }, 60000)
  it('trim + reverse + rotate + crop combined', () => { const r = run({ start: 1, end: 3, rev: 'both', rot: 270, crop: { x: 10, y: 20, w: 100, h: 200 } }, out); expect([r.w, r.h]).toEqual([100, 200]); expect(r.dur).toBeCloseTo(2, 0) }, 60000)
  it('reverse with forward audio and remove-audio', () => { run({ ...base, rev: 'fwd' }, out); run({ ...base, rev: 'video' }, { ...out, audio: false }) }, 60000)
  it('webm output', () => { const r = run({ ...base, end: 2 }, { ...out, fmt: 'webm' }); expect(r.dur).toBeCloseTo(2, 0) }, 90000)
})
