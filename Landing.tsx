import { Upload, ShieldCheck, Scissors, Rewind, RotateCw, Crop, Menu } from 'lucide-react'
import AdSlot from './AdSlot'
const NAV = [['Editor', '#editor'], ['Features', '#features'], ['How It Works', '#how'], ['FAQ', '#faq']]
const FEATURES = [[Scissors, 'Trim video online', 'Cut a clip to exact start and end times, re-encoded so the length is accurate.'], [Rewind, 'Reverse video online', 'Play a clip backwards, with or without reversed audio. Best on short sections.'], [RotateCw, 'Rotate MP4 video', 'Turn a video 90° either way or 180°, baked into the exported frames.'], [Crop, 'Crop video online', 'Drag a crop box or type exact pixels, with square, portrait and widescreen presets.']] as const
const FAQ = [['Is my video uploaded anywhere?', 'No. Editing runs in your browser with FFmpeg WebAssembly. Your file never leaves your device.'], ['Which formats can I open?', 'MP4, MOV, WEBM, MKV, AVI, M4V, MPEG and MPG. Exports are MP4 or WEBM.'], ['Why did a large video fail?', 'Browsers limit memory, especially on phones. Try a shorter section, a lower resolution, or a computer. Reversing needs the most memory.'], ['Is it really free?', 'Yes. There is no account, watermark or export limit.']]
export default function Landing({ msg, pick }: { msg: string; pick: (f?: File) => void }) {
  const open = () => document.getElementById('file-input')?.click()
  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-neutral-200 bg-[#faf9f7]/95 px-4 py-2">
        <span className="text-xl font-extrabold tracking-tight">Clip<span className="text-[#5b4bff]">Turn</span></span>
        <nav className="ml-6 hidden gap-5 text-sm font-semibold md:flex">{NAV.map(([l, h]) => <a key={h} href={h}>{l}</a>)}</nav>
        <button onClick={open} className="ml-auto min-h-11 rounded-md bg-[#5b4bff] px-4 font-semibold text-white">Choose Video</button>
        <details className="relative md:hidden"><summary aria-label="Menu" className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center"><Menu /></summary>
          <div className="absolute right-0 top-12 w-44 rounded-md border border-neutral-200 bg-white p-1 shadow">{NAV.map(([l, h]) => <a key={h} href={h} className="flex min-h-11 items-center px-3 text-sm font-semibold">{l}</a>)}</div></details>
      </header>
      <main>
        <section id="editor" className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Edit videos without uploading them</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">Trim, reverse, rotate or crop your video directly in your browser. Free, private and easy to use.</p>
          <label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]) }} className="mt-10 flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[#5b4bff]/40 bg-white px-6 py-14 transition-colors hover:bg-[#5b4bff]/5">
            <Upload className="text-[#5b4bff]" /><span className="min-h-11 rounded-md bg-[#5b4bff] px-6 py-2.5 font-semibold text-white">Choose a Video</span>
            <span className="text-sm text-neutral-500">or drop it here · MP4, MOV, WEBM, MKV, AVI, M4V, MPEG, MPG</span>
            <input id="file-input" type="file" accept="video/*,.mkv,.avi,.m4v,.mpg,.mpeg" className="sr-only" onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <p role="alert" className="mt-3 min-h-6 text-red-600">{msg}</p>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-neutral-600"><ShieldCheck size={16} />Your video never leaves your device. Everything is processed privately in your browser.</p>
          <p className="mt-1 text-sm text-neutral-500">Files below 500 MB are recommended. Large videos may exceed browser memory, especially on mobile devices.</p>
          <p className="mt-5 text-sm font-semibold text-neutral-700">No uploads · No account · Private browser processing · Free to use</p>
        </section>
        <AdSlot slot={import.meta.env.VITE_AD_SLOT_UPLOAD} />
        <section id="features" className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-2xl font-extrabold">Four tools, nothing else</h2>
          <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">{FEATURES.map(([I, t, d]) => <li key={t} className="flex gap-4 py-5"><I className="mt-1 shrink-0 text-[#5b4bff]" /><div><h3 className="font-bold">{t}</h3><p className="text-neutral-600">{d}</p></div></li>)}</ul>
          <p className="mt-4 text-neutral-600">ClipTurn is a private browser video editor: edit video without uploading it, then export one MP4 or WEBM with every change applied.</p>
        </section>
        <section id="how" className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-2xl font-extrabold">How it works</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-neutral-700"><li>Choose a video from your device. It is opened locally, not uploaded.</li><li>Pick trim, reverse, rotate or crop and preview the result.</li><li>Export. The first export loads the video engine, which takes a little longer.</li><li>Download the edited file directly.</li></ol>
        </section>
        <section id="faq" className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-2xl font-extrabold">FAQ</h2>
          {FAQ.map(([q, a]) => <details key={q} className="border-b border-neutral-200 py-3"><summary className="min-h-11 cursor-pointer font-semibold leading-[2.75rem]">{q}</summary><p className="pb-2 text-neutral-600">{a}</p></details>)}
        </section>
      </main>
      <footer className="border-t border-neutral-200 px-4 py-8 text-center text-sm text-neutral-600">
        <p>Only edit videos that you own or have permission to use.</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-5">{['privacy', 'terms', 'copyright', 'contact'].map(p => <a key={p} href={`#/${p}`} className="min-h-11 capitalize leading-[2.75rem] underline">{p === 'privacy' ? 'Privacy Policy' : p === 'terms' ? 'Terms of Use' : p}</a>)}</p>
      </footer>
    </div>
  )
}
