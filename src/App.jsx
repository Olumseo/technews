import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import SearchOverlay from './components/SearchOverlay.jsx'
import Home from './pages/Home.jsx'
import Section from './pages/Section.jsx'
import Article from './pages/Article.jsx'
import NotFound from './pages/NotFound.jsx'
import Author from './pages/Author.jsx'
import Newsletters from './pages/Newsletters.jsx'
import { About, Contact, Corrections, Privacy } from './pages/Info.jsx'
import BackToTop from './components/BackToTop.jsx'
import Login from './pages/Login.jsx'
import { StudioEditor, StudioHome } from './pages/Studio.jsx'
import { AuthProvider, RequireAuth } from './auth.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      const typing = /input|textarea/i.test(e.target.tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <AuthProvider>
      <a className="skip-link" href="#main">Skip to content</a>
      <ScrollToTop />
      <Header onSearch={() => setSearchOpen(true)} />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/section/:slug" element={<Section />} />
          <Route path="/article/:slug" element={<Article />} />
          <Route path="/author/:slug" element={<Author />} />
          <Route path="/newsletters" element={<Newsletters />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/corrections" element={<Corrections />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/studio" element={<RequireAuth><StudioHome /></RequireAuth>} />
          <Route path="/studio/new" element={<RequireAuth><StudioEditor /></RequireAuth>} />
          <Route path="/studio/edit/:slug" element={<RequireAuth><StudioEditor key="edit" /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <BackToTop />
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </AuthProvider>
  )
}
