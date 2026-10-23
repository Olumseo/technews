import { Link } from 'react-router-dom'
import { articleBySlug, bySection, latest } from '../data/articles.js'
import Story, { SectionHead } from '../components/Story.jsx'
import { LatestTimeline, Markets, MostRead, Newsletter, WorldClock } from '../components/Widgets.jsx'
import { initials } from '../lib.js'

const pick = (...slugs) => slugs.map(articleBySlug)

export default function Home() {
  const lead = articleBySlug('malacca-strait-record-traffic')
  const [sideA, sideB] = pick('hdb-rooftop-farms-pilot', 'sovereign-ai-model-open-source')
  const secondary = pick('coastal-adaptation-fund-draft', 'jakarta-mrt-line-opens-early', 'asian-stocks-inflation', 'sailors-qualify-world-championships')
  const [asiaLead, ...asiaRest] = pick('japan-four-day-week-trial', 'vietnam-chip-packaging-boom', 'changi-t5-structural-milestone', 'hawker-centre-cool-roofs')
  const features = pick('reflective-streets-cooling-trial', 'mangrove-restoration-outpacing-loss', 'undersea-cable-singapore-australia')
  const opinion = bySection('opinion')
  const mostRead = pick('hawker-stalls-worth-queue', 'malacca-strait-record-traffic', 'sodium-batteries-phones', 'padel-car-park-rooftops', 'kopitiam-design-refresh')
  const rails = ['business', 'tech', 'world']
  const life = [...bySection('life'), ...pick('padel-car-park-rooftops', 'europe-single-rail-ticket')]

  return (
    <>
      <section className="container front" aria-label="Top stories">
        <div className="front__lead">
          <Story article={lead} variant="lead" dek as="h1" />
        </div>
        <div className="front__side">
          <Story article={sideA} variant="card" dek />
          <Story article={sideB} variant="card" />
        </div>
        <aside className="front__latest">
          <LatestTimeline items={latest(7)} />
        </aside>
      </section>

      <section className="container secondary" aria-label="More top stories">
        {secondary.map((a) => <Story key={a.slug} article={a} variant="card" />)}
      </section>

      <Markets />

      <section className="container block">
        <SectionHead title="Asia and Singapore" to="/section/asia" linkLabel="More from Asia" />
        <div className="split">
          <Story article={asiaLead} variant="feature" dek />
          <div className="split__list">
            {asiaRest.map((a) => <Story key={a.slug} article={a} variant="row" dek />)}
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="band-title">
        <div className="container">
          <div className="band__head">
            <h2 id="band-title" className="band__title">The world, seen from Singapore</h2>
            <p className="band__lede">Our reporters work across six time zones. This is the hour where they are right now.</p>
          </div>
          <WorldClock />
          <div className="band__grid">
            {features.map((a, i) => (
              <Story key={a.slug} article={a} variant={i === 0 ? 'overlay-lg' : 'overlay'} dek={i === 0} />
            ))}
          </div>
        </div>
      </section>

      <section className="container block">
        <SectionHead title="Opinion" to="/section/opinion" linkLabel="All opinion" />
        <div className="opinion">
          {opinion.map((a) => (
            <article key={a.slug} className="opinion__item">
              <span className="avatar" aria-hidden="true">{initials(a.author)}</span>
              <p className="opinion__author">{a.author}</p>
              <h3 className="opinion__title"><Link to={`/article/${a.slug}`}>{a.title}</Link></h3>
              <p className="opinion__dek">{a.dek}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container block duo">
        <MostRead items={mostRead} />
        <Newsletter />
      </section>

      <section className="container block rails">
        {rails.map((slug) => {
          const items = bySection(slug).slice(0, 3)
          const name = slug[0].toUpperCase() + slug.slice(1)
          return (
            <div key={slug} className="rail">
              <SectionHead title={name} to={`/section/${slug}`} />
              <Story article={items[0]} variant="card" />
              {items.slice(1).map((a) => <Story key={a.slug} article={a} variant="compact" kicker={false} />)}
            </div>
          )
        })}
      </section>

      <section className="container block">
        <SectionHead title="Life and weekend" to="/section/life" linkLabel="More from Life" />
        <div className="secondary secondary--flush">
          {life.map((a) => <Story key={a.slug} article={a} variant="card" />)}
        </div>
      </section>
    </>
  )
}
