# ANSH — Portfolio Plan

Reference: [alche.studio](https://alche.studio) (inspiration only — no assets or code copied).

## 1. Identity
- Hero text: **ANSH**
- Central 3D symbol: letter **"A"** in Archivo Expanded (different shape from ALCHE's triangle A)

## 2. Theme
| Token | Value |
|---|---|
| Background | `#050505` |
| Grid lines | `#1a1a1a` |
| Text | `#f2f2f2` |
| Muted | `#7a7a7a` |
| Accent | `#2b3bff` (electric blue) |
| Prism "A" | rainbow / iridescent glass |
| Light section | About — white background |

## 3. Fonts
- Headings + 3D "A": **Archivo Expanded** (Archivo variable, width 125, heavy)
- Body: **Geist**
- Labels, dates, tags: **Geist Mono**

## 4. Sections
1. Loader
2. Hero — ANSH + prism A
3. Works — filter tabs `All · Dev · Design · Web3`, curved 3D card carousel
4. About — white section
5. What I do — Dev / Design / Web3 with curved screens
6. Featured project
7. Experience — timeline
8. Contact — big email + socials

Each project has its own **case-study page**.

UI: sound toggle (off by default, consent bar), side scroll indicator, custom cursor (desktop only), resume download in header.

## 5. Animations (full ALCHE intensity)
| Section | Animation |
|---|---|
| Loader | Grid lines draw "A" outline, % counter, A turns to glass |
| Hero | "ANSH" pixel-block blue glitch reveal, rotating rainbow prism A, mouse tilt |
| Works intro | "WORKS" refracts through prism, breaks into cards |
| Works | Curved 3D cards, scroll-driven, tile-grid tunnel; filter change shuffles cards |
| Works → About | Prism colour flash, white wipe |
| About | Block-by-block text reveal + typing sound, rotating light bar, outline "ABOUT" |
| What I do | Noise/glitch title, grid with "+" markers, curved video screens |
| Featured | Big image parallax zoom, SplitText letter reveal |
| Experience | Timeline line draws on scroll, entries slide in |
| Contact | Back to A logo, big email, magnetic buttons |
| Case-study navigation | Pixel-block transition |
| Global | Lenis smooth scroll, bloom + grain, cursor glow |

Mobile: lighter 3D (fewer effects, lower pixel ratio). `prefers-reduced-motion`: simplified animations.

## 6. Tech
React 19 + Vite + TS, Tailwind v4, three + R3F + drei, postprocessing, GSAP (ScrollTrigger, SplitText) + Lenis, Howler, lottie-web, leva + r3f-perf (dev only), vite-plugin-glsl. Add a router (react-router) for case-study pages.

## 7. Extras & deploy
- Contact: email (copy / mailto) + GitHub, LinkedIn, X — no form, no backend
- Language: English
- Deploy: Vercel, free `*.vercel.app` link; custom domain later

## 8. Content
- **Tagline:** Developer, designer & web3 builder. 18, coding since 12.
- **Location:** India
- **About:** I'm Ansh, an 18-year-old developer and designer from India. I wrote my first line of code at 12 and I've been building ever since. Right now I ship web3 products on Arc, like prediction markets and escrow, where real USDC moves through my contracts. I also trade crypto, which keeps me close to the people who actually use these products.
- **Skills:** Dev · Design · Web3 · Crypto trading
- **Experience:** Student · coding since 2020 (age 12) · now 18
- **Contact:** alanleader6267@gmail.com · [GitHub](https://github.com/anshxft) · [X](https://x.com/imalanxx)
- No photo (3D "A" instead), no resume, no LinkedIn.

### Works (only these two — each gets its own full 3D scene + case-study page; tags: Web3 · Dev · Design)
**1. PredictArc** — [arcpredict.xyz](https://arcpredict.xyz) (lead project)
YES/NO prediction markets on Arc, paid and settled in USDC. Live on Arc mainnet. Contracts V1 → V3 (V3 adds cash-out), 2% fee on the losing pool, AI market briefs, per-market share images.
Tech: Solidity, Hardhat, React 19, Vite, Tailwind 4, viem, GSAP, Lenis, Vercel functions.
**2. Heldby** — [heldby.vercel.app](https://heldby.vercel.app)
USDC escrow on Arc with an AI arbiter — "Money held in trust, released when work is done." Client locks USDC, freelancer submits work, an AI agent checks it against the brief and settles on-chain; auto-refund after a missed deadline.
Tech: Solidity, Foundry (22 tests incl. fuzz), OpenZeppelin, Next.js, wagmi/viem, Groq (gpt-oss-120b).
## 9. Changes after content review
- Works filter tabs dropped (2 projects, both span all categories) → tags on each project instead.
- Works and Featured merged: each project gets a full scroll scene with curved screens. Section order now:
  Loader → Hero → Works (PredictArc, then Heldby) → About → What I do → Experience → Contact.
- Resume button removed.
