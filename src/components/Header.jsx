import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { SECTIONS, BREAKING } from '../data/articles.js'
import { formatClock, formatDate, useNow } from '../lib.js'
import { SearchIcon, CloudIcon, MenuIcon, CloseIcon } from './Icons.jsx'

const LINKS = [{ to: '/', name: 'Home' }, ...SECTIONS.map((s) => ({ to: `/section/${s.slug}`, name: s.name }))]

function Ticker() {
  const items = [...BREAKING, ...BREAKING]
  return (
    <div className="ticker" role="region" aria-label="Breaking news">
      <div className="container ticker__inner">
        <span className="ticker__live"><span className="pulse" aria-hidden="true" />Live</span>
        <div className="ticker__viewport">
          <ul className="ticker__track">
            {items.map((t, i) => (
              <li key={i} aria-hidden={i >= BREAKING.length}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function Header({ onSearch }) {
  const now = useNow()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <header className="site-header">
      <div className="container topbar">
        <Link to="/" className="wordmark" aria-label="Tech News Singapore, home">
          <span className="wordmark__name">Tech News</span>
          <span className="wordmark__place">Singapore</span>
        </Link>
        <div className="topbar__meta">
          <span>{formatDate(now)}</span>
          <span className="topbar__time">{formatClock(now)} SGT</span>
          <span className="topbar__weather"><CloudIcon /> 31°C</span>
        </div>
        <Link className="btn btn--solid topbar__subscribe" to="/newsletters">Subscribe</Link>
      </div>

      <nav className={`nav${scrolled ? ' is-scrolled' : ''}`} aria-label="Sections">
        <div className="container nav__inner">
          <Link to="/" className="nav__mini" aria-label="Tech News Singapore, home" tabIndex={scrolled ? 0 : -1}>TNS</Link>
          <button
            className="nav__button nav__menu"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="nav-panel"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
            Menu
          </button>
          <ul className="nav__links">
            {LINKS.map((l) => (
              <li key={l.to}><NavLink to={l.to} end={l.to === '/'}>{l.name}</NavLink></li>
            ))}
          </ul>
          <button className="nav__button nav__search" onClick={onSearch}>
            <SearchIcon />
            Search
          </button>
        </div>
        {menuOpen && (
          <div id="nav-panel" className="nav__panel">
            <ul className="container">
              {LINKS.map((l) => (
                <li key={l.to}><NavLink to={l.to} end={l.to === '/'}>{l.name}</NavLink></li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <Ticker />
    </header>
  )
}
