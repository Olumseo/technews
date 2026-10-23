import { useParams } from 'react-router-dom'
import { bySection, latest, lineStyle, sectionBySlug } from '../data/articles.js'
import Story from '../components/Story.jsx'
import { LatestTimeline } from '../components/Widgets.jsx'
import NotFound from './NotFound.jsx'

export default function Section() {
  const { slug } = useParams()
  const section = sectionBySlug(slug)
  if (!section) return <NotFound />

  const [lead, ...rest] = bySection(slug)

  return (
    <>
      <header className="container section-hero" style={lineStyle(slug)}>
        <p className="section-hero__line"><span className="section-hero__code">{section.code}</span>{section.line}</p>
        <h1 className="section-hero__title">{section.name}</h1>
        <p className="section-hero__blurb">{section.blurb}</p>
      </header>

      <section className="container section-layout">
        <div className="section-layout__main">
          {lead && <Story article={lead} variant="hero" dek kicker={false} as="h2" />}
          <div className="section-layout__grid">
            {rest.map((a) => <Story key={a.slug} article={a} variant="card" dek kicker={false} />)}
          </div>
        </div>
        <aside className="section-layout__side">
          <LatestTimeline items={latest(8).filter((a) => a.section !== slug).slice(0, 6)} />
        </aside>
      </section>
    </>
  )
}
