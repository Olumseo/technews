import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sectionBySlug } from '../data/site.js'
import { api } from '../api.js'
import { CloseIcon, SearchIcon } from './Icons.jsx'

export default function SearchOverlay({ onClose }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('loading')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Debounced search: waits for a short pause in typing before asking the server.
  useEffect(() => {
    let live = true
    setStatus('loading')
    const id = setTimeout(() => {
      const term = q.trim()
      api(`/api/articles?limit=8${term ? `&q=${encodeURIComponent(term)}` : ''}`)
        .then((d) => { if (live) { setResults(d.items); setActive(0); setStatus('ready') } })
        .catch(() => live && setStatus('error'))
    }, q ? 200 : 0)
    return () => { live = false; clearTimeout(id) }
  }, [q])

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

  const label = status === 'error'
    ? 'Search isn’t available right now. Try again in a moment.'
    : q.trim()
      ? `${results.length} result${results.length === 1 ? '' : 's'}`
      : 'Latest stories'

  return (
    <div className="search" role="dialog" aria-modal="true" aria-label="Search stories" onKeyDown={onKey}>
      <button className="search__scrim" onClick={onClose} aria-label="Close search" tabIndex={-1} />
      <div className="search__panel">
        <div className="search__field">
          <SearchIcon />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stories, topics or reporters"
            aria-label="Search"
            aria-controls="search-results"
          />
          <button className="icon-btn" onClick={onClose} aria-label="Close search"><CloseIcon /></button>
        </div>
        <p className="search__label" aria-live="polite">{label}</p>
        <ul id="search-results" className="search__results" role="listbox">
          {results.map((a, i) => (
            <li key={a.slug} role="option" aria-selected={i === active}>
              <button className={i === active ? 'is-active' : ''} onMouseEnter={() => setActive(i)} onClick={() => go(a)}>
                <span className="tag">{sectionBySlug(a.section)?.name}</span>
                <span className="search__title">{a.title}</span>
              </button>
            </li>
          ))}
          {status === 'ready' && q.trim() && results.length === 0 && (
            <li className="search__empty">No stories match “{q}”. Try a place, a topic or a reporter’s name.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
