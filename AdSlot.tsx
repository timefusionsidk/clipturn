import { useEffect } from 'react'
const P = import.meta.env.VITE_AD_PUBLISHER_ID as string | undefined
export default function AdSlot({ slot }: { slot?: string }) {
  const on = !!P && !!slot && import.meta.env.VITE_AD_PROVIDER === 'adsense'
  useEffect(() => {
    if (!on) return
    if (!document.getElementById('ad-script')) { const s = document.createElement('script'); s.id = 'ad-script'; s.async = true; s.crossOrigin = 'anonymous'; s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${P}`; document.head.appendChild(s) }
    try { const w = window as unknown as { adsbygoogle: unknown[] }; (w.adsbygoogle = w.adsbygoogle || []).push({}) } catch { /* ignore */ }
  }, [on])
  if (!on) return import.meta.env.PROD ? null : <div className="mx-auto my-10 max-w-3xl rounded border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-400">Ad slot (development placeholder)</div>
  return <div className="mx-auto my-12 max-w-3xl px-4 text-center" aria-label="Advertisement"><ins className="adsbygoogle block" data-ad-client={P} data-ad-slot={slot} data-ad-format="auto" /></div>
}
