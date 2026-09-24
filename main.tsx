if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark')
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
createRoot(document.getElementById('root')!).render(<App />)
