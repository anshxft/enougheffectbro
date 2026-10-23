import { useEffect } from 'react'

// Tab title and description for a page, restored when it unmounts (link previews come from the
// prerendered HTML instead, see scripts/seo.mjs).
export function usePageMeta(title: string | undefined, description?: string) {
  useEffect(() => {
    if (!title) return
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prev = { title: document.title, description: meta?.content }
    document.title = title
    if (meta && description) meta.content = description
    return () => {
      document.title = prev.title
      if (meta && prev.description) meta.content = prev.description
    }
  }, [title, description])
}
