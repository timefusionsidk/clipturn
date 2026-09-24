# ClipTurn
Browser-only video trim / reverse / rotate / crop using ffmpeg.wasm (single-threaded, no COOP/COEP headers needed, so ads keep working).
    npm install && npm run dev      # develop
    npm run build                   # typecheck + production build -> dist/
Deploy: push to GitHub, import in Vercel (framework: Vite). `vercel.json` sets long-cache headers for /assets.
Order of operations in one FFmpeg run: trim -> reverse -> rotate -> crop -> scale -> encode.
