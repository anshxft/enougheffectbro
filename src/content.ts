// All site copy lives here so text changes never touch components.

export const site = {
  name: 'Ansh',
  tagline: 'Developer, designer & web3 builder. 18, coding since 12.',
  location: 'India',
  email: 'alanleader6267@gmail.com',
  socials: [
    { label: 'GitHub', href: 'https://github.com/anshxft' },
    { label: 'X', href: 'https://x.com/imalanxx' },
  ],
  about:
    "I'm Ansh, an 18-year-old developer and designer from India. I wrote my first line of code at 12 and I've been building ever since. Right now I ship web3 products on Arc, like prediction markets and escrow, where real USDC moves through my contracts. I also trade crypto.",
  skills: ['Dev', 'Design', 'Web3', 'Crypto trading'],
  // big statement in the About section, one entry per line
  aboutLead: ['I build on-chain', 'products where', 'real money moves.'],
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
