import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { sectionBySlug } from '../data/site.js'
import { normalize, useApi } from '../api.js'
import { Loading, LoadError } from '../components/State.jsx'
import Story from '../components/Story.jsx'
import { LinkIcon, PauseIcon, PlayIcon } from '../components/Icons.jsx'
import { fullDate, initials, timeAgo, usePageTitle } from '../lib.js'
import NotFound from './NotFound.jsx'

function useReadingProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return p
}

function ListenButton({ article }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [playing, setPlaying] = useState(false)

  useEffect(() => () => supported && window.speechSynthesis.cancel(), [article.slug, supported])

  if (!supported) return null

  const toggle = () => {
    const synth = window.speechSynthesis
    if (playing) {
      synth.cancel()
      setPlaying(false)
      return
    }
    const u = new SpeechSynthesisUtterance([article.title, article.dek, ...article.body].join('. '))
    u.lang = 'en-SG'
    u.rate = 1.02
    u.onend = () => setPlaying(false)
    synth.cancel()
    synth.speak(u)
    setPlaying(true)
  }

  return (
    <button className="btn btn--ghost" onClick={toggle} aria-pressed={playing}>
      {playing ? <PauseIcon /> : <PlayIcon />}
      {playing ? 'Stop listening' : `Listen, ${article.read} min`}
    </button>
  )
}

function CopyLink() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button className="btn btn--ghost" onClick={copy}>
      <LinkIcon />
      <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
    </button>
  )
}

// Plain share links (no tracking scripts). WhatsApp and Telegram first: they're how most people share news in Singapore.
function ShareBar({ article }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = article.title
  const links = [
    ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`],
    ['Telegram', `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`],
    ['X', `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
    ['Email', `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`],
  ]
  return (
    <div className="share" aria-label="Share this story">
      <span className="share__label">Share</span>
      {links.map(([name, href]) => (
        <a key={name} className="share__link" href={href} target="_blank" rel="noopener noreferrer">{name}</a>
      ))}
    </div>
  )
}

export default function Article() {
  const { slug } = useParams()
  const { data, error, loading, reload } = useApi(`/api/articles/${slug}`)
  const progress = useReadingProgress()
  usePageTitle(data?.article?.title)

  if (loading && !data) return <Loading label="Loading story…" />
  if (error?.status === 404) return <NotFound />
  if (error) return <LoadError error={error} onRetry={reload} />

  const article = normalize(data.article)
  const more = data.related.map(normalize)
  const byAuthor = (data.byAuthor || []).map(normalize)
  const credit = article.image.includes('images.unsplash.com') ? 'Photo: Unsplash' : ''
  const section = sectionBySlug(article.section)
  const [first, ...paras] = article.body
  const edited = new Date(article.updatedAt) - new Date(article.publishedAt) > 10 * 60e3

  return (
    <>
      <div className="progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <article className="article">
        {article.preview && (
          <div className={`preview-bar${article.status === 'rejected' ? ' preview-bar--rejected' : ''}`} role="status">
            <div className="container">
              {article.status === 'rejected'
                ? <><strong>Not approved.</strong> {article.reviewNote} Only you and editors can see this story. <Link to={`/studio/edit/${article.slug}`}>Edit and resubmit</Link></>
                : <><strong>In review.</strong> Only you and editors can see this story until it is approved.</>}
            </div>
          </div>
        )}
        <header className="container article__head">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/section/${section.slug}`} className="tag">{section.name}</Link>
            {article.breaking && <Link to="/breaking" className="tag tag--breaking">Breaking</Link>}
          </nav>
          <h1 className={`article__title${article.section === 'opinion' ? ' is-opinion' : ''}`}>{article.title}</h1>
          <p className="article__dek">{article.dek}</p>
          <div className="article__meta">
            <div className="article__author">
              <span className="avatar avatar--sm" aria-hidden="true">{initials(article.author)}</span>
              <div>
                <p className="article__by">By <Link to={`/author/${article.authorSlug}`} className="article__name">{article.author}</Link></p>
                <p className="article__role">
                  {article.role !== 'Community contributor' && article.role}
                  {article.community && <Link to="/guidelines" className="community-badge">Community contributor</Link>}
                </p>
              </div>
            </div>
            <p className="article__time">
              <time dateTime={article.publishedAt}>{fullDate(article.publishedAt)}</time>
              {article.minutesAgo < 7 * 1440 && <span>, {timeAgo(article.minutesAgo)}</span>}
              {edited && <span className="article__updated">Updated {fullDate(article.updatedAt)}</span>}
            </p>
            <div className="article__tools">
              <ListenButton article={article} />
              <CopyLink />
            </div>
          </div>
        </header>

        <figure className="container article__figure">
          <img src={article.image} alt={article.caption || ''} />
          {(article.caption || credit) && (
            <figcaption>
              {article.caption}
              {credit && <span className="article__credit">{credit}</span>}
            </figcaption>
          )}
        </figure>

        <div className="container article__body">
          <p className="article__first">{first}</p>
          {paras.map((p, i) => (
            <div key={i}>
              <p>{p}</p>
              {i === 0 && article.quote && (
                <blockquote className="pullquote">
                  <p>{article.quote}</p>
                </blockquote>
              )}
            </div>
          ))}
          {article.source && (
            <p className="article__source">
              Source: <a href={article.source.url} target="_blank" rel="noopener noreferrer">{article.source.name}</a>. This summary is written in our own words; read the original report for full details.
            </p>
          )}
          <ShareBar article={article} />
          <aside className="author-box" aria-label="About the author">
            <span className="avatar" aria-hidden="true">{initials(article.author)}</span>
            <div>
              <p className="author-box__name"><Link to={`/author/${article.authorSlug}`}>{article.author}</Link></p>
              <p className="author-box__role">{article.role}</p>
              {article.authorBio && <p className="author-box__bio">{article.authorBio}</p>}
              {byAuthor.length > 0 && (
                <>
                  <p className="author-box__more">More from {article.author.split(' ')[0]}</p>
                  <ul className="author-box__list">
                    {byAuthor.map((a) => <li key={a.slug}><Link to={`/article/${a.slug}`}>{a.title}</Link></li>)}
                  </ul>
                </>
              )}
            </div>
          </aside>
        </div>
      </article>

      {more.length > 0 && <section className="container block related" aria-labelledby="related-title">
        <h2 id="related-title" className="block-title">Read next</h2>
        <div className="related__grid">
          {more.map((a) => <Story key={a.slug} article={a} variant="card" />)}
        </div>
      </section>}
    </>
  )
}
