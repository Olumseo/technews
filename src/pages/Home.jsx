import { Link } from 'react-router-dom'
import { articleBySlug, bySection, latest, lineStyle, sectionBySlug } from '../data/articles.js'
import Story, { SectionHead } from '../components/Story.jsx'
import { LatestTimeline, Markets, MostRead, Newsletter, WorldClock } from '../components/Widgets.jsx'
import { initials } from '../lib.js'

const pick = (...slugs) => slugs.map(articleBySlug)

export default function Home() {
  const lead = articleBySlug('malacca-strait-record-traffic')
  const top = pick('hdb-rooftop-farms-pilot', 'sovereign-ai-model-open-source', 'asian-stocks-inflation')
  const secondary = pick('coastal-adaptation-fund-draft', 'jakarta-mrt-line-opens-early', 'vietnam-chip-packaging-boom', 'sailors-qualify-world-championships')
  const [asiaLead, ...asiaRest] = pick('japan-four-day-week-trial', 'changi-t5-structural-milestone', 'hawker-centre-cool-roofs', 'europe-single-rail-ticket')
  const features = pick('reflective-streets-cooling-trial', 'mangrove-restoration-outpacing-loss', 'undersea-cable-singapore-australia')
  const opinion = bySection('opinion')
  const mostRead = pick('hawker-stalls-worth-queue', 'malacca-strait-record-traffic', 'sodium-batteries-phones', 'padel-car-park-rooftops', 'kopitiam-design-refresh')
  const rails = ['business', 'tech', 'world']
  const life = [...bySection('life'), ...pick('padel-car-park-rooftops', 'panama-canal-crossings-cap')]

  return (
    <>
      <section className="container hero" aria-label="Top story">
        <Story article={lead} variant="hero" dek as="h1" />
      </section>

      <section className="container top-grid" aria-label="Top stories">
        {top.map((a) => <Story key={a.slug} article={a} variant="card" dek />)}
        <aside className="top-grid__latest">
          <LatestTimeline items={latest(6)} />
        </aside>
      </section>

      <section className="container cards cards--4" aria-label="More top stories">
        {secondary.map((a) => <Story key={a.slug} article={a} variant="card" />)}
      </section>

      <Markets />

      <section className="container block">
        <SectionHead title="Asia and Singapore" to="/section/asia" linkLabel="More from Asia" line="asia" />
        <div className="split">
          <Story article={asiaLead} variant="feature" dek />
          <div className="split__list">
            {asiaRest.map((a) => <Story key={a.slug} article={a} variant="row" />)}
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="band-title">
        <div className="container">
          <div className="band__head">
            <h2 id="band-title" className="band__title">Where our reporters are right now</h2>
            <p className="band__lede">Six bureaus, six time zones. Singapore is the first stop on the line.</p>
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
        <SectionHead title="Opinion" to="/section/opinion" linkLabel="All opinion" line="opinion" />
        <div className="opinion">
          {opinion.map((a) => (
            <article key={a.slug} className="opinion__item">
              <div className="opinion__who">
                <span className="avatar" aria-hidden="true">{initials(a.author)}</span>
                <div>
                  <p className="opinion__author">{a.author}</p>
                  <p className="opinion__role">{a.role}</p>
                </div>
              </div>
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
          return (
            <div key={slug} className="rail" style={lineStyle(slug)}>
              <SectionHead title={sectionBySlug(slug).name} to={`/section/${slug}`} line={slug} />
              <Story article={items[0]} variant="card" kicker={false} />
              {items.slice(1).map((a) => <Story key={a.slug} article={a} variant="compact" kicker={false} />)}
            </div>
          )
        })}
      </section>

      <section className="container block">
        <SectionHead title="Life and weekend" to="/section/life" linkLabel="More from Life" line="life" />
        <div className="cards cards--4 cards--flush">
          {life.map((a) => <Story key={a.slug} article={a} variant="card" />)}
        </div>
      </section>
    </>
  )
}
