import type { ReactNode } from 'react'

// Every scroll section carries an id (nav target) and a small mono label, ALCHE-style.
export default function Section({
  id,
  label,
  className = '',
  children,
}: {
  id: string
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-label={label} className={`relative px-4 py-32 sm:px-8 ${className}`}>
      <p className="label mb-10">/ {label}</p>
      {children}
    </section>
  )
}
