import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { SECTIONS } from '../data/site.js'
import { useApi } from '../api.js'
import { useAuth } from '../auth.jsx'
import { formatClock, formatDate, useNow } from '../lib.js'
import { SearchIcon, CloudIcon, MenuIcon, CloseIcon } from './Icons.jsx'
import { BreakingBanner } from './Breaking.jsx'

const LINKS = [{ to: '/', name: 'Home' }, ...SECTIONS.map((s) => ({ to: `/section/${s.slug}`, name: s.name }))]

function Ticker() {
  const { data } = useApi('/api/articles?limit=6')
  const latest = data?.items || []
  if (!latest.length) return <div className="ticker ticker--empty" aria-hidden="true" />
  const items = [...latest, ...latest]
  return (
    <div className="ticker" role="region" aria-label="Breaking news">
      <div className="container ticker__inner">
        <span className="ticker__live"><span className="pulse" aria-hidden="true" />Latest</span>
        <div className="ticker__viewport">
          <ul className="ticker__track">
            {items.map((a, i) => (
              <li key={i} aria-hidden={i >= latest.length}>
                <Link to={`/article/${a.slug}`} tabIndex={i >= latest.length ? -1 : 0}>{a.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function Header({ onSearch }) {
  const now = useNow()
  const { user } = useAuth()
  const weather = useApi('/api/weather').data
  const breaking = useApi('/api/breaking').data?.items || []
  const links = breaking.length ? [LINKS[0], { to: '/breaking', name: 'Breaking', hot: true }, ...LINKS.slice(1)] : LINKS
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
          {weather && (
            <span className="topbar__weather" title="Current weather in Singapore">
              <CloudIcon /> {weather.temperature}°C{weather.text && `, ${weather.text.toLowerCase()}`}
            </span>
          )}
        </div>
        <div className="topbar__actions">
          {user
            ? <Link className="btn btn--ghost" to="/studio">Studio</Link>
            : <Link className="btn btn--ghost topbar__join" to="/join">Write for us</Link>}
          <Link className="btn btn--solid" to="/newsletters">Subscribe</Link>
        </div>
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
            {links.map((l) => (
              <li key={l.to}><NavLink to={l.to} end={l.to === '/'} className={l.hot ? 'is-hot' : undefined}>{l.name}</NavLink></li>
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
              {links.map((l) => (
                <li key={l.to}><NavLink to={l.to} end={l.to === '/'} className={l.hot ? 'is-hot' : undefined}>{l.name}</NavLink></li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {breaking.length ? <BreakingBanner items={breaking} fallback={<Ticker />} /> : <Ticker />}
    </header>
  )
}
