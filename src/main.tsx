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
import WorkPage from './pages/Work'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PageTransitionProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/work/:slug" element={<WorkPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <SoundPrompt />
        <Cursor />
      </PageTransitionProvider>
    </BrowserRouter>
  </StrictMode>,
)
