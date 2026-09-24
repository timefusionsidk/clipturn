import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
export default function ThemeToggle() {
  const [d, setD] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => { document.documentElement.classList.toggle('dark', d) }, [d])
  return <button aria-label={d ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setD(!d)} className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-neutral-200/70 px-2 text-[#0a84ff] shadow-sm transition-colors hover:bg-neutral-200">{d ? <Sun size={18} /> : <Moon size={18} />}</button>
}
