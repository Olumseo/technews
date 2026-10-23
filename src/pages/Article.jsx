import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { articleBySlug, bySection, latest, lineStyle, sectionBySlug } from '../data/articles.js'
import Story from '../components/Story.jsx'
import { LinkIcon, PauseIcon, PlayIcon } from '../components/Icons.jsx'
import { initials, publishedAt, timeAgo } from '../lib.js'
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

export default function Article() {
  const { slug } = useParams()
  const article = articleBySlug(slug)
  const progress = useReadingProgress()

  useEffect(() => {
    if (article) document.title = `${article.title} | Tech News Singapore`
    return () => { document.title = 'Tech News Singapore' }
  }, [article])

  if (!article) return <NotFound />

  const section = sectionBySlug(article.section)
  const related = bySection(article.section).filter((a) => a.slug !== slug)
  const more = (related.length >= 3 ? related : [...related, ...latest(8).filter((a) => a.slug !== slug && a.section !== article.section)]).slice(0, 3)
  const [first, ...paras] = article.body

  return (
    <>
      <div className="progress" style={{ ...lineStyle(article.section), transform: `scaleX(${progress})` }} aria-hidden="true" />
      <article className="article" style={lineStyle(article.section)}>
        <header className="container article__head">
          <Link to={`/section/${section.slug}`} className="tag">{section.name}</Link>
          <h1 className={`article__title${article.section === 'opinion' ? ' is-opinion' : ''}`}>{article.title}</h1>
          <p className="article__dek">{article.dek}</p>
          <div className="article__meta">
            <div className="article__author">
              <span className="avatar avatar--sm" aria-hidden="true">{initials(article.author)}</span>
              <div>
                <p className="article__name">{article.author}</p>
                <p className="article__role">{article.role}</p>
              </div>
            </div>
            <p className="article__time">
              Published {publishedAt(article.minutesAgo)} SGT, {timeAgo(article.minutesAgo)}
            </p>
            <div className="article__tools">
              <ListenButton article={article} />
              <CopyLink />
            </div>
          </div>
        </header>

        <figure className="container article__figure">
          <img src={article.hero} alt={article.caption} />
          <figcaption>{article.caption}</figcaption>
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
          <p className="article__end">This story is part of a design demo. The reporting, people and figures are fictional.</p>
        </div>
      </article>

      <section className="container block related" aria-labelledby="related-title">
        <h2 id="related-title" className="block-title">Read next</h2>
        <div className="related__grid">
          {more.map((a) => <Story key={a.slug} article={a} variant="card" />)}
        </div>
      </section>
    </>
  )
}
