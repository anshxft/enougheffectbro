# Ansh — portfolio

Personal site of Ansh: developer, designer and web3 builder. A scroll-driven WebGL page with a refracting glass "A", glitch transitions and two case studies: [PredictArc](https://arcpredict.xyz) and [Heldby](https://heldby.vercel.app).

Live: https://enougheffectbro.vercel.app

## Stack

React 19 · Vite · TypeScript · Tailwind CSS 4 · three.js + React Three Fiber · postprocessing · GSAP (ScrollTrigger, SplitText, ScrambleText) · Lenis · Web Audio (all sounds are synthesised)

## Run

```bash
npm install
npm run dev
```

Debug flags on the home page: `?perf=1` (FPS panel), `?fx=0` (no post-processing), `?dpr=1`, `?glitch=0.8`.

`scripts/shot.mjs` and `scripts/fps.mjs` drive Edge over the DevTools protocol for WebGL screenshots and real-GPU FPS checks; `scripts/make-font.py` bakes the Archivo glyph used for the 3D "A".

Fonts: Archivo, Geist and Geist Mono (SIL Open Font License).
