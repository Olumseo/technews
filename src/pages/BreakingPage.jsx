import { Link } from 'react-router-dom'
import { sectionBySlug } from '../data/site.js'
import { normalize, useApi } from '../api.js'
import { Loading, LoadError } from '../components/State.jsx'
import { fullDate, timeAgo, usePageTitle } from '../lib.js'

export default function BreakingPage() {
  usePageTitle('Breaking news')
  const { data, error, loading, reload } = useApi('/api/breaking')

  if (loading && !data) return <Loading />
  if (error) return <LoadError error={error} onRetry={reload} />

  const stories = data.items.map(normalize)

  return (
    <section className="container breaking-page">
      <header className="section-hero">
        <h1 className="section-hero__title breaking-page__title"><span className="pulse" aria-hidden="true" />Breaking news</h1>
        <p className="section-hero__blurb">Developing stories from Singapore, Asia and the world, newest first. We update them as more is confirmed.</p>
      </header>

      {stories.length === 0 ? (
        <div className="form-done">
          <h2>No breaking news right now</h2>
          <p>When a major story breaks, it will appear here first.</p>
          <Link to="/" className="btn btn--solid">Go to the front page</Link>
        </div>
      ) : (
        <ol className="live-list">
          {stories.map((a) => (
            <li key={a.slug} className="live-list__item">
              <div className="live-list__when">
                <time dateTime={a.publishedAt}>{timeAgo(a.minutesAgo)}</time>
                <span>{fullDate(a.publishedAt)}</span>
              </div>
              <article className="live-list__story">
                <span className="tag">{sectionBySlug(a.section)?.name}</span>
                <h2 className="live-list__title"><Link to={`/article/${a.slug}`}>{a.title}</Link></h2>
                <p className="live-list__dek">{a.dek}</p>
                <p className="live-list__by">
                  <span>By <Link to={`/author/${a.authorSlug}`}>{a.author}</Link></span>
                  {a.source && <span>Source: {a.source.name}</span>}
                </p>
              </article>
              <Link to={`/article/${a.slug}`} className="live-list__media" tabIndex={-1} aria-hidden="true">
                <img src={a.image} alt="" loading="lazy" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
