import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { SECTIONS, BREAKING } from '../data/articles.js'
import { formatClock, formatDate, storage, useNow } from '../lib.js'
import { SearchIcon, SunIcon, MoonIcon, MenuIcon, CloseIcon, CloudIcon } from './Icons.jsx'

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = document.documentElement.dataset.theme
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    storage('tns-theme', next)
    setTheme(next)
  }
  return [theme, toggle]
}

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
  const [theme, toggleTheme] = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 180)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
  }, [menuOpen])

  return (
    <header className="site-header">
      <div className="utility">
        <div className="container utility__inner">
          <span className="utility__date">{formatDate(now)}</span>
          <span className="utility__meta">
            <span>Singapore {formatClock(now)}</span>
            <span className="utility__weather"><CloudIcon /> 31°C, thundery showers</span>
          </span>
        </div>
      </div>

      <div className="container masthead">
        <Link to="/" className="wordmark" aria-label="Tech News Singapore, front page">
          <span className="wordmark__glyph" aria-hidden="true">
            <span>Tech</span><span>News</span>
          </span>
          <span className="wordmark__text" aria-hidden="true">
            <span className="wordmark__name">Singapore</span>
            <span className="wordmark__tag">Technology, business and the world, from the Lion City</span>
          </span>
        </Link>
        <div className="masthead__actions">
          <button className="icon-btn" onClick={onSearch} aria-label="Search stories (press /)"><SearchIcon /></button>
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <a className="btn btn--solid masthead__subscribe" href="#newsletter">Subscribe</a>
        </div>
      </div>

      <nav className={`navbar${scrolled ? ' is-scrolled' : ''}`} aria-label="Sections">
        <div className="container navbar__inner">
          <Link to="/" className="navbar__mini" aria-label="Front page" tabIndex={scrolled ? 0 : -1}>TNS</Link>
          <button className="icon-btn navbar__menu" onClick={() => setMenuOpen(true)} aria-label="Open sections menu" aria-expanded={menuOpen}>
            <MenuIcon />
          </button>
          <ul className="navbar__links">
            <li><NavLink to="/" end>Front page</NavLink></li>
            {SECTIONS.map((s) => (
              <li key={s.slug}><NavLink to={`/section/${s.slug}`}>{s.name}</NavLink></li>
            ))}
          </ul>
          <button className="icon-btn navbar__search" onClick={onSearch} aria-label="Search stories"><SearchIcon /></button>
        </div>
      </nav>

      <Ticker />

      {menuOpen && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Sections">
          <div className="drawer__panel">
            <div className="drawer__head">
              <span className="navbar__mini is-visible">TNS</span>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu"><CloseIcon /></button>
            </div>
            <ul className="drawer__links">
              <li><NavLink to="/" end>Front page</NavLink></li>
              {SECTIONS.map((s) => (
                <li key={s.slug}><NavLink to={`/section/${s.slug}`}>{s.name}</NavLink></li>
              ))}
            </ul>
          </div>
          <button className="drawer__scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" tabIndex={-1} />
        </div>
      )}
    </header>
  )
}
