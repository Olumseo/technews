import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SECTIONS, sectionBySlug } from '../data/site.js'
import { api, normalize, useApi } from '../api.js'
import Story from '../components/Story.jsx'
import { LatestTimeline } from '../components/Widgets.jsx'
import { Loading, LoadError } from '../components/State.jsx'
import { usePageTitle } from '../lib.js'
import NotFound from './NotFound.jsx'

const PAGE = 13

export default function Section() {
  const { slug } = useParams()
  const section = sectionBySlug(slug)
  usePageTitle(section?.name)

  const { data, error, loading, reload } = useApi(section ? `/api/articles?section=${slug}&limit=${PAGE}` : null)
  const latest = useApi('/api/articles?limit=10')
  const [more, setMore] = useState([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')

  useEffect(() => { setMore([]); setMoreError('') }, [slug])

  if (!section) return <NotFound />
  if (loading && !data) return <Loading />
  if (error) return <LoadError error={error} onRetry={reload} />

  const stories = [...data.items, ...more].map(normalize)
  const [lead, ...rest] = stories
  const hasMore = stories.length < data.total

  const loadMore = async () => {
    setLoadingMore(true)
    setMoreError('')
    try {
      const d = await api(`/api/articles?section=${slug}&limit=12&offset=${stories.length}`)
      setMore((m) => [...m, ...d.items])
    } catch (e) {
      setMoreError(e.message)
    } finally {
      setLoadingMore(false)
    }
  }

  const others = (latest.data?.items || []).map(normalize).filter((a) => a.section !== slug).slice(0, 6)

  return (
    <>
      <header className="container section-hero">
        <h1 className="section-hero__title">{section.name}</h1>
        <p className="section-hero__blurb">{section.blurb}</p>
        <p className="section-hero__count">{data.total} {data.total === 1 ? 'story' : 'stories'}</p>
      </header>

      <section className="container section-layout">
        <div className="section-layout__main">
          {lead ? <Story article={lead} variant="hero" dek kicker={false} as="h2" /> : <p className="state">No stories in this section yet.</p>}
          <div className="section-layout__grid">
            {rest.map((a) => <Story key={a.slug} article={a} variant="card" dek kicker={false} />)}
          </div>
          {hasMore && (
            <div className="load-more">
              <button className="btn btn--ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Show more stories'}
              </button>
              {moreError && <p className="form__error" role="alert">{moreError}</p>}
            </div>
          )}
        </div>
        <aside className="section-layout__side">
          {others.length > 0 && <LatestTimeline items={others} />}
          <nav className="side-sections" aria-label="Other sections">
            <h2 className="side-sections__title">Other sections</h2>
            <ul>
              {SECTIONS.filter((s) => s.slug !== slug).map((s) => (
                <li key={s.slug}><Link to={`/section/${s.slug}`}>{s.name}</Link></li>
              ))}
            </ul>
          </nav>
        </aside>
      </section>
    </>
  )
}
