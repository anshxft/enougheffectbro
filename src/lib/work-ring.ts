// Scroll timing of the works ring (src/three/Works.tsx), shared with the DOM side (captions, snap).
// Each project's <article> is WORK_VH tall; its progress p runs 0 -> 1 as it crosses the viewport:
// p = (viewportHeight - articleTop) / (articleHeight + viewportHeight).
export const WORK_VH = 450
export const RING_START = 0.1 // p where the first card starts entering
export const RING_END = 0.84 // p where the last card has left

// ring position in "cards" at progress p: -1.2 (first card entering on the right) .. n + 0.2
export const ringX = (p: number, n: number) => -1.2 + (n + 1.4) * Math.min(1, Math.max(0, (p - RING_START) / (RING_END - RING_START)))

// progress p at which card i sits dead centre
export const cardP = (i: number, n: number) => RING_START + ((i + 1.2) / (n + 1.4)) * (RING_END - RING_START)
