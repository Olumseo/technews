import { Link } from 'react-router-dom'
import { sectionBySlug } from '../data/site.js'
import { normalize, useApi } from '../api.js'
import Story, { SectionHead } from '../components/Story.jsx'
import { LatestTimeline, MostRead, Newsletter, WorldClock } from '../components/Widgets.jsx'
import { Loading, LoadError } from '../components/State.jsx'
import { initials, usePageTitle } from '../lib.js'

// Hands out stories newest-first without showing the same story, or the same photo, twice on the page.
function picker(stories) {
  const used = new Set()
  const photos = new Set()
  return (test, n) => {
    const out = []
    for (const pass of [true, false]) {
      for (const a of stories) {
        if (out.length === n) break
        if (used.has(a.slug) || !test(a) || (pass && photos.has(a.image))) continue
        used.add(a.slug)
        photos.add(a.image)
        out.push(a)
      }
    }
    return out
  }
}

const inSection = (...slugs) => (a) => slugs.includes(a.section)
const isNews = (a) => a.section !== 'opinion'

export default function Home() {
  usePageTitle(null)
  const { data, error, loading, reload } = useApi('/api/home')
  if (loading && !data) return <Loading />
  if (error) return <LoadError error={error} onRetry={reload} />

  const stories = data.latest.map(normalize)
  const mostRead = data.mostRead.map(normalize)
  const take = picker(stories)

  const [lead] = take(isNews, 1)
  const top = take(isNews, 3)
  const secondary = take(isNews, 4)
  const [asiaLead, ...asiaRest] = take(inSection('asia', 'singapore'), 4)
  const features = take(inSection('climate', 'tech'), 3)
  const opinion = take(inSection('opinion'), 3)
  const rails = ['business', 'tech', 'world'].map((slug) => ({ slug, items: take(inSection(slug), 3) }))
  const life = take(inSection('life', 'sport'), 4)

  return (
    <>
      {lead && (
        <section className="container hero" aria-label="Top story">
          <Story article={lead} variant="hero" dek as="h1" />
        </section>
      )}

      <section className="container top-grid" aria-label="Top stories">
        {top.map((a) => <Story key={a.slug} article={a} variant="card" dek />)}
        <aside className="top-grid__latest">
          <LatestTimeline items={stories.slice(0, 6)} />
        </aside>
      </section>

      <section className="container cards cards--4" aria-label="More top stories">
        {secondary.map((a) => <Story key={a.slug} article={a} variant="card" />)}
      </section>

      {asiaLead && (
        <section className="container block">
          <SectionHead title="Asia and Singapore" to="/section/asia" linkLabel="More from Asia" />
          <div className="split">
            <Story article={asiaLead} variant="feature" dek />
            <div className="split__list">
              {asiaRest.map((a) => <Story key={a.slug} article={a} variant="row" />)}
            </div>
          </div>
        </section>
      )}

      <section className="band" aria-labelledby="band-title">
        <div className="container">
          <div className="band__head">
            <h2 id="band-title" className="band__title">World clock</h2>
            <p className="band__lede">The time now in the cities that move the news.</p>
          </div>
          <WorldClock />
          <div className="band__grid">
            {features.map((a, i) => (
              <Story key={a.slug} article={a} variant={i === 0 ? 'overlay-lg' : 'overlay'} dek={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {opinion.length > 0 && (
        <section className="container block">
          <SectionHead title="Opinion" to="/section/opinion" linkLabel="All opinion" />
          <div className="opinion">
            {opinion.map((a) => (
              <article key={a.slug} className="opinion__item">
                <div className="opinion__who">
                  <span className="avatar" aria-hidden="true">{initials(a.author)}</span>
                  <div>
                    <Link to={`/author/${a.authorSlug}`} className="opinion__author">{a.author}</Link>
                    <p className="opinion__role">{a.role}</p>
                  </div>
                </div>
                <h3 className="opinion__title"><Link to={`/article/${a.slug}`}>{a.title}</Link></h3>
                <p className="opinion__dek">{a.dek}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="container block duo">
        <MostRead items={mostRead} />
        <Newsletter />
      </section>

      <section className="container block rails">
        {rails.filter((r) => r.items.length).map(({ slug, items }) => (
          <div key={slug} className="rail">
            <SectionHead title={sectionBySlug(slug).name} to={`/section/${slug}`} />
            <Story article={items[0]} variant="card" kicker={false} />
            {items.slice(1).map((a) => <Story key={a.slug} article={a} variant="compact" kicker={false} />)}
          </div>
        ))}
      </section>

      {life.length > 0 && (
        <section className="container block">
          <SectionHead title="Life and sport" to="/section/life" linkLabel="More from Life" />
          <div className="cards cards--4 cards--flush">
            {life.map((a) => <Story key={a.slug} article={a} variant="card" />)}
          </div>
        </section>
      )}
    </>
  )
}
