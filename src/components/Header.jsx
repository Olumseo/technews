import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { SECTIONS, BREAKING } from '../data/articles.js'
import { formatClock, formatDate, useNow } from '../lib.js'
import { SearchIcon, CloudIcon } from './Icons.jsx'

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

// Section navigation drawn as an MRT line: one station per section, each segment in its line colour.
function TransitNav({ scrolled, onSearch }) {
  const lineRef = useRef(null)
  const { pathname } = useLocation()

  // Keep the current station in view when the line scrolls sideways on small screens.
  useEffect(() => {
    const line = lineRef.current
    const active = line?.querySelector('a.active')
    if (!line || !active) return
    const li = active.parentElement.getBoundingClientRect()
    const box = line.getBoundingClientRect()
    line.scrollLeft += li.left - box.left - (box.width - li.width) / 2
  }, [pathname])

  return (
    <nav className={`transit${scrolled ? ' is-scrolled' : ''}`} aria-label="Sections">
      <div className="container transit__inner">
        <Link to="/" className="transit__mini" aria-label="Tech News Singapore, front page" tabIndex={scrolled ? 0 : -1}>TNS</Link>
        <ol className="transit__line" ref={lineRef}>
          <li className="is-interchange" style={{ '--c': '#000', '--i': 0 }}>
            <NavLink to="/" end><span className="transit__stop" aria-hidden="true" />Front page</NavLink>
          </li>
          {SECTIONS.map((s, i) => (
            <li key={s.slug} style={{ '--c': s.color, '--i': i + 1 }}>
              <NavLink to={`/section/${s.slug}`}>
                <span className="transit__stop" aria-hidden="true" />
                {s.name}
              </NavLink>
            </li>
          ))}
        </ol>
        <button className="icon-btn transit__search" onClick={onSearch} aria-label="Search stories"><SearchIcon /></button>
      </div>
    </nav>
  )
}

export default function Header({ onSearch }) {
  const now = useNow()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="site-header">
      <div className="container topbar">
        <Link to="/" className="wordmark" aria-label="Tech News Singapore, front page">
          <span className="wordmark__mark" aria-hidden="true" />
          <span className="wordmark__name">Tech News</span>
          <span className="wordmark__place">Singapore</span>
        </Link>
        <div className="topbar__meta">
          <span className="topbar__date">{formatDate(now)}</span>
          <span className="topbar__time">{formatClock(now)} SGT</span>
          <span className="topbar__weather"><CloudIcon /> 31°C</span>
        </div>
        <div className="topbar__actions">
          <button className="search-pill" onClick={onSearch}>
            <SearchIcon />
            <span>Search</span>
            <kbd>/</kbd>
          </button>
          <a className="btn btn--solid" href="#newsletter">Subscribe</a>
        </div>
      </div>
      <TransitNav scrolled={scrolled} onSearch={onSearch} />
      <Ticker />
    </header>
  )
}
