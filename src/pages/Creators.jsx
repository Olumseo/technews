import { Link } from 'react-router-dom'
import { useApi } from '../api.js'
import { Loading, LoadError } from '../components/State.jsx'
import { initials, shortDate, usePageTitle } from '../lib.js'

export default function Creators() {
  usePageTitle('Our creators')
  const { data, error, loading, reload } = useApi('/api/authors')

  if (loading && !data) return <Loading />
  if (error) return <LoadError error={error} onRetry={reload} />

  const newsroom = data.items.filter((c) => !c.community)
  const community = data.items.filter((c) => c.community)

  const Grid = ({ items }) => (
    <ul className="creator-grid">
      {items.map((c) => (
        <li key={c.slug} className="creator-card">
          <span className="avatar" aria-hidden="true">{initials(c.name)}</span>
          <div className="creator-card__body">
            <h3 className="creator-card__name"><Link to={`/author/${c.slug}`}>{c.name}</Link></h3>
            <p className="creator-card__role">{c.role}</p>
            {c.bio && <p className="creator-card__bio">{c.bio}</p>}
            <p className="creator-card__meta">
              {c.stories} {c.stories === 1 ? 'story' : 'stories'}
              {c.lastPublished && <span>Latest {shortDate(new Date(c.lastPublished))}</span>}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )

  return (
    <section className="container creators">
      <header className="section-hero">
        <h1 className="section-hero__title">Our creators</h1>
        <p className="section-hero__blurb">The people behind the stories: our newsroom, and community creators who write for Tech News Singapore.</p>
        <Link to="/join" className="btn btn--solid creators__cta">Become a creator</Link>
      </header>

      <h2 className="block-title">Newsroom <span className="block-title__count">{newsroom.length}</span></h2>
      <Grid items={newsroom} />

      <h2 className="block-title creators__community">Community creators <span className="block-title__count">{community.length}</span></h2>
      {community.length ? (
        <Grid items={community} />
      ) : (
        <div className="form-done">
          <h3>Be the first community creator</h3>
          <p>Write about the tech, business and life stories you know best. An editor checks your first stories before they go live.</p>
          <Link to="/join" className="btn btn--solid">Create a creator account</Link>
        </div>
      )}
    </section>
  )
}
