import { Link } from 'react-router-dom'
import { sectionBySlug } from '../data/articles.js'
import { timeAgo } from '../lib.js'

export function Kicker({ article }) {
  const section = sectionBySlug(article.section)
  return <span className="tag">{section?.name}</span>
}

export function Byline({ article, showAuthor = true }) {
  return (
    <p className="byline">
      {showAuthor && <span>{article.author}</span>}
      <span className="byline__time">{timeAgo(article.minutesAgo)}</span>
      <span className="byline__time">{article.read} min read</span>
    </p>
  )
}

// One story, laid out by `variant`: lead, card, row, compact, opinion, overlay.
export default function Story({ article, variant = 'card', dek = false, kicker = true, image = true, as: Heading = 'h3' }) {
  const href = `/article/${article.slug}`
  const showImage = image && variant !== 'compact' && variant !== 'opinion'

  return (
    <article className={`story story--${variant}`}>
      {showImage && (
        <Link to={href} className="story__media" tabIndex={-1} aria-hidden="true">
          <img src={article.image} alt="" loading={variant === 'lead' ? 'eager' : 'lazy'} />
        </Link>
      )}
      <div className="story__body">
        {kicker && <Kicker article={article} />}
        <Heading className="story__title">
          <Link to={href}>{article.title}</Link>
        </Heading>
        {dek && <p className="story__dek">{article.dek}</p>}
        <Byline article={article} />
      </div>
    </article>
  )
}

export function SectionHead({ title, to, linkLabel, children }) {
  return (
    <div className="section-head">
      <h2 className="section-head__title">{to ? <Link to={to}>{title}</Link> : title}</h2>
      {children}
      {to && linkLabel && <Link to={to} className="section-head__more">{linkLabel}</Link>}
    </div>
  )
}
