import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ARTICLES, sectionBySlug } from '../data/articles.js'
import { CloseIcon, SearchIcon } from './Icons.jsx'

export default function SearchOverlay({ onClose }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return ARTICLES.slice(0, 6)
    return ARTICLES.filter((a) => `${a.title} ${a.dek} ${a.author} ${a.section}`.toLowerCase().includes(term)).slice(0, 8)
  }, [q])

  useEffect(() => {
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const go = (a) => {
    navigate(`/article/${a.slug}`)
    onClose()
  }

  const onKey = (e) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[active]) go(results[active])
  }

  return (
    <div className="search" role="dialog" aria-modal="true" aria-label="Search stories" onKeyDown={onKey}>
      <button className="search__scrim" onClick={onClose} aria-label="Close search" tabIndex={-1} />
      <div className="search__panel">
        <div className="search__field">
          <SearchIcon />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0) }}
            placeholder="Search stories, sections, reporters"
            aria-label="Search"
            aria-controls="search-results"
          />
          <button className="icon-btn" onClick={onClose} aria-label="Close search"><CloseIcon /></button>
        </div>
        <p className="search__label">{q.trim() ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Popular right now'}</p>
        <ul id="search-results" className="search__results" role="listbox">
          {results.map((a, i) => (
            <li key={a.slug} role="option" aria-selected={i === active}>
              <button className={i === active ? 'is-active' : ''} onMouseEnter={() => setActive(i)} onClick={() => go(a)}>
                <span className={`kicker kicker--${a.section}`}>{sectionBySlug(a.section).name}</span>
                <span className="search__title">{a.title}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="search__empty">No stories match “{q}”. Try a place, a topic or a reporter’s name.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
