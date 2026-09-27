const PAGES: Record<string, [string, string[]]> = {
  privacy: ['Privacy Policy', ['Videos are processed locally in your browser using WebAssembly. They are not uploaded to ClipTurn servers, and nothing you edit is saved to a database.', 'Closing or refreshing the page clears the active project.', 'ClipTurn does not send filenames, video contents or output to analytics. Advertising and analytics providers, if enabled, may process ordinary website information (such as IP address and cookies) under their own policies.', 'Only edit videos that you own or have permission to use.']],
  terms: ['Terms of Use', ['ClipTurn is provided free and as is, without warranty. Results depend on your device, browser and file.', 'You are responsible for having the right to edit any video you select. Only edit videos that you own or have permission to use.', 'Large files may exceed browser memory. Keep a copy of your original video.']],
  copyright: ['Copyright notice', ['© ClipTurn. FFmpeg is a trademark of Fabrice Bellard and is licensed under the LGPL/GPL; the WebAssembly build is provided by the ffmpeg.wasm project.', 'ClipTurn does not download videos from other websites. Only edit videos that you own or have permission to use.']],
  contact: ['Contact', ['For support, bug reports, copyright concerns, or feedback, use the project support page. Do not attach private videos.']],
}
export default function Legal({ page }: { page: string }) {
  const [title, paras] = PAGES[page]
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <a href="/" className="text-sm font-semibold text-[#5b4bff]">← Back to ClipTurn</a>
      <h1 className="mt-4 text-3xl font-extrabold">{title}</h1>
      {paras.map(p => <p key={p} className="mt-4 leading-7 text-neutral-700">{p}</p>)}
      {page === 'contact' && <a href="mailto:timefusions.idk@gmail.com" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#5b4bff] px-4 font-semibold text-white">timefusions.idk@gmail.com</a>}
    </main>
  )
}
