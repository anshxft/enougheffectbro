// All site copy lives here so text changes never touch components.
import {
  siGithub,
  siGsap,
  siNextdotjs,
  siOpenzeppelin,
  siReact,
  siSolidity,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siVercel,
  siVite,
  siWagmi,
} from 'simple-icons'

export const site = {
  name: 'Ansh',
  tagline: 'Developer, designer & web3 builder. 18, coding since 12.',
  location: 'India',
  status: 'just chilling',
  email: 'alanleader6267@gmail.com',
  socials: [
    { label: 'GitHub', href: 'https://github.com/anshxft' },
    { label: 'X', href: 'https://x.com/imalanxx' },
  ],
  about:
    "I'm Ansh, an 18-year-old developer and designer from India. I wrote my first line of code at 12 and I've been building ever since. Right now I ship web3 products on Arc, like prediction markets and escrow, where real USDC moves through my contracts. I also trade crypto.",
  skills: ['Dev', 'Design', 'Web3', 'Crypto trading'],
  // big statement in the About section; the highlight closes it in an inverted block
  aboutLead: 'I build on-chain products where',
  aboutHighlight: 'real money moves.',
  aboutStats: [
    { value: 18, label: 'Years old' },
    { value: 6, label: 'Years coding' },
    { value: 2, label: 'Products on Arc' },
  ],
}

export type Work = {
  slug: string
  title: string
  year: string
  url: string
  urlLabel: string
  tags: string[]
  summary: string
  highlights: string[]
  tech: string[]
  images: { src: string; alt: string }[]
  // case-study hero: a product shot, optionally a short film (muted loop) that uses it as fallback
  hero: { image: string; film?: string; poster?: string; alt: string }
  // laptop + phone product shot shown after the summary
  devices?: { src: string; alt: string }
}

export const works: Work[] = [
  {
    slug: 'predictarc',
    title: 'PredictArc',
    year: '2026',
    url: 'https://arcpredict.xyz',
    urlLabel: 'arcpredict.xyz',
    tags: ['Web3', 'Dev', 'Design'],
    summary: 'YES/NO prediction markets on Arc, paid and settled in USDC. Live on Arc mainnet.',
    highlights: [
      'Contracts shipped from V1 to V3; V3 adds cash-out before the deadline',
      'Parimutuel pools with a 2% fee on the losing side',
      'AI market briefs and per-market share images',
    ],
    tech: ['Solidity', 'Hardhat', 'React 19', 'Vite', 'Tailwind 4', 'viem', 'GSAP', 'Lenis', 'Vercel Functions'],
    devices: {
      src: '/works/predictarc-devices.webp',
      alt: 'PredictArc fresh predictions and activity feed on a laptop and a phone',
    },
    hero: {
      image: '/works/predictarc-mockup.webp',
      film: '/works/predictarc-film.mp4',
      poster: '/works/predictarc-film-poster.webp',
      alt: 'PredictArc home page on a floating glass tablet in a dark studio',
    },
    images: [
      { src: '/works/predictarc-1.webp', alt: 'PredictArc home page with live stats: 34 markets on the Arc contract' },
      { src: '/works/predictarc-2.webp', alt: 'PredictArc markets index with category filters and market cards' },
      { src: '/works/predictarc-3.webp', alt: 'PredictArc fresh predictions and on-chain activity feed' },
    ],
  },
  {
    slug: 'heldby',
    title: 'Heldby',
    year: '2026',
    url: 'https://heldby.vercel.app',
    urlLabel: 'heldby.vercel.app',
    tags: ['Web3', 'Dev', 'Design'],
    summary: 'USDC escrow on Arc with an AI arbiter. Money held in trust, released when work is done.',
    highlights: [
      'Client locks USDC, freelancer submits work, an AI agent checks it against the brief and settles on-chain',
      'Automatic refund after a missed deadline; the arbiter can only split funds between the two parties',
      '22 Foundry tests, including a fuzz test that funds are always conserved',
    ],
    tech: ['Solidity', 'Foundry', 'OpenZeppelin', 'Next.js', 'wagmi', 'viem', 'Groq'],
    hero: {
      image: '/works/heldby-mockup.webp',
      film: '/works/heldby-film.mp4',
      poster: '/works/heldby-film-poster.webp',
      alt: 'Heldby landing page on a floating tablet turning in a dark studio',
    },
    devices: {
      src: '/works/heldby-devices.webp',
      alt: 'Heldby feature list on a laptop and a phone',
    },
    images: [
      { src: '/works/heldby-1.webp', alt: 'Heldby landing page: Money held in trust, released when work is done, with a 250 USDC escrow card' },
      { src: '/works/heldby-2.webp', alt: 'Heldby AI agent section: a referee that never sleeps, with a live verification log' },
      { src: '/works/heldby-3.webp', alt: 'Heldby feature list: funds held by code, AI verification, milestone payments' },
    ],
  },
]

export const services = [
  { title: 'Dev', body: 'Full-stack web apps and the smart contracts behind them, tested.' },
  { title: 'Design', body: 'Interfaces and brand for the products I build.' },
  { title: 'Web3', body: 'On-chain products on Arc: prediction markets, escrow, USDC payments.' },
]

export const experience = [
  { year: '2020', title: 'First line of code', body: 'Started programming at 12.' },
  { year: '2026', title: 'PredictArc', body: 'Prediction markets live on Arc mainnet.' },
  { year: '2026', title: 'Heldby', body: 'USDC escrow with an AI arbiter on Arc.' },
  { year: 'Now', title: 'Student', body: '18, building and trading.' },
]

// Stack wall. icon = simple-icons logo path; tools without one get a monogram.
export const stack: { name: string; group: string; note: string; icon?: { path: string } }[] = [
  { name: 'Solidity', group: 'Contracts', note: 'PredictArc and Heldby contracts', icon: siSolidity },
  { name: 'Foundry', group: 'Contracts', note: "Heldby's contract tests" },
  { name: 'Hardhat', group: 'Contracts', note: 'PredictArc deploys and tests' },
  { name: 'OpenZeppelin', group: 'Contracts', note: 'Battle-tested pieces in Heldby', icon: siOpenzeppelin },
  { name: 'wagmi', group: 'Web3', note: 'Wallet connect in Heldby', icon: siWagmi },
  { name: 'viem', group: 'Web3', note: 'Chain reads in both apps' },
  { name: 'React', group: 'Frontend', note: 'Every frontend I ship', icon: siReact },
  { name: 'Next.js', group: 'Frontend', note: "Heldby's app", icon: siNextdotjs },
  { name: 'TypeScript', group: 'Frontend', note: 'Across every project', icon: siTypescript },
  { name: 'Tailwind', group: 'Frontend', note: 'PredictArc and this site', icon: siTailwindcss },
  { name: 'Vite', group: 'Frontend', note: 'PredictArc and this site', icon: siVite },
  { name: 'three.js', group: 'Motion', note: 'The glass loop on this site', icon: siThreedotjs },
  { name: 'GSAP', group: 'Motion', note: 'Every scroll animation here', icon: siGsap },
  { name: 'Lenis', group: 'Motion', note: 'The smooth scroll you feel' },
  { name: 'Vercel', group: 'Ship', note: 'Hosting and serverless functions', icon: siVercel },
  { name: 'GitHub', group: 'Ship', note: 'Code, history, deploys', icon: siGithub },
]

// The journey page: the timeline walked through a landscape, dawn to night
export const journey = {
  intro: 'Step outside.',
  hint: 'Scroll to walk',
  outro: 'That’s the road so far.',
  back: 'Back to the studio',
  // where each experience entry stands along the walk (0 = dawn, 1 = night)
  stops: [0.14, 0.36, 0.58, 0.8],
}
