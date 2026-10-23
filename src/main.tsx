import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './index.css'
import Cursor from './components/Cursor'
import { PageTransitionProvider } from './components/PageTransition'
import { SoundPrompt } from './components/Sound'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import WorkPage from './pages/Work'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PageTransitionProvider>
        {/* first Tab stop: jump past the header (and the intro) to the page content */}
        <a href="#content" className="label sr-only z-[130] rounded-full bg-fg text-bg! focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:px-5 focus:py-3 focus:whitespace-nowrap">
          Skip to content
        </a>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/work/:slug" element={<WorkPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SoundPrompt />
        <Cursor />
      </PageTransitionProvider>
    </BrowserRouter>
  </StrictMode>,
)
