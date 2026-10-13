// Pointer + scroll read by the 3D scene every frame. The canvas ignores pointer
// events (HTML sits on top), so we listen on window instead of R3F's events.
export const input = {
  pointer: { x: 0, y: 0 }, // -1..1, y up
  scroll: 0, // in viewport heights
}

const onPointer = (e: PointerEvent) => {
  input.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  input.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
}
const onScroll = () => {
  input.scroll = window.scrollY / window.innerHeight
}

export function listenInput() {
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  return () => {
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('scroll', onScroll)
  }
}

// 0 at the top of the page, 1 once the end of #interlude (the scroll stretch between the hero and
// the first project) reaches the bottom of the viewport. Drives the A's turn and the rotating words.
export function storyProgress() {
  const el = document.getElementById('interlude')
  if (!el) return 0
  const toEnd = el.getBoundingClientRect().bottom - window.innerHeight
  const total = window.scrollY + toEnd
  return total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 1
}
