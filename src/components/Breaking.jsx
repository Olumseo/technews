import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sectionBySlug } from '../data/site.js'
import { normalize } from '../api.js'
import { timeAgo } from '../lib.js'
import { CloseIcon } from './Icons.jsx'

const DISMISS_KEY = 'tns-breaking-dismissed'

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) || ''
  } catch {
    return ''
  }
}

// Red bar under the menu. Cycles through current breaking stories; readers can hide it for this visit.
export function BreakingBanner({ items, fallback = null }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dismissed, setDismissed] = useState(readDismissed)

  const stories = items.map(normalize)
  const newest = stories[0]?.slug || ''

  useEffect(() => {
    if (paused || stories.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % stories.length), 7000)
    return () => clearInterval(id)
  }, [paused, stories.length])

  // A newer breaking story brings the banner back even if an older one was dismissed.
  if (!stories.length || dismissed === newest) return fallback
  const story = stories[index % stories.length]

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, newest) } catch { /* private mode: hide for this page view only */ }
    setDismissed(newest)
  }

  return (
    <div
      className="breaking-bar"
      role="region"
      aria-label="Breaking news"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container breaking-bar__inner">
        <span className="breaking-bar__label"><span className="pulse pulse--light" aria-hidden="true" />Breaking</span>
        <Link to={`/article/${story.slug}`} className="breaking-bar__headline" aria-live="polite">
          {story.title}
          <span className="breaking-bar__time">{timeAgo(story.minutesAgo)}</span>
        </Link>
        {stories.length > 1 && (
          <Link to="/breaking" className="breaking-bar__more">
            {stories.length} updates
          </Link>
        )}
        <button className="breaking-bar__close" onClick={dismiss} aria-label="Hide breaking news banner">
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}

// Home page block: the newest breaking story large, the rest as a timestamped list.
export function BreakingSection({ items }) {
  const stories = items.map(normalize)
  if (!stories.length) return null
  const [lead, ...rest] = stories

  return (
    <section className="container breaking" aria-labelledby="breaking-title">
      <div className="breaking__head">
        <h2 id="breaking-title" className="breaking__title"><span className="pulse" aria-hidden="true" />Breaking news</h2>
        <Link to="/breaking" className="section-head__more">All breaking news</Link>
      </div>
      <div className="breaking__grid">
        <article className="breaking__lead">
          <Link to={`/article/${lead.slug}`} className="breaking__media" tabIndex={-1} aria-hidden="true">
            <img src={lead.image} alt="" />
          </Link>
          <div>
            <p className="breaking__meta">
              <span className="tag">{sectionBySlug(lead.section)?.name}</span>
              <span>{timeAgo(lead.minutesAgo)}</span>
            </p>
            <h3 className="breaking__headline"><Link to={`/article/${lead.slug}`}>{lead.title}</Link></h3>
            <p className="breaking__dek">{lead.dek}</p>
          </div>
        </article>
        {rest.length > 0 && (
          <ol className="breaking__list">
            {rest.slice(0, 5).map((a) => (
              <li key={a.slug}>
                <time className="breaking__time" dateTime={a.publishedAt}>{timeAgo(a.minutesAgo)}</time>
                <div>
                  <span className="tag">{sectionBySlug(a.section)?.name}</span>
                  <Link to={`/article/${a.slug}`} className="breaking__link">{a.title}</Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
