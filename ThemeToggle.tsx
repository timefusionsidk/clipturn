import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
export default function ThemeToggle() {
  const [d, setD] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => { document.documentElement.classList.toggle('dark', d) }, [d])
  return <button aria-label={d ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setD(!d)} className="min-h-11 min-w-11 rounded-md px-2">{d ? <Sun size={18} /> : <Moon size={18} />}</button>
}
