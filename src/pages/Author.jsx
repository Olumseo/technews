import { Link, useParams } from 'react-router-dom'
import { normalize, useApi } from '../api.js'
import Story from '../components/Story.jsx'
import { Loading, LoadError } from '../components/State.jsx'
import { initials, shortDate, usePageTitle } from '../lib.js'
import NotFound from './NotFound.jsx'

export default function Author() {
  const { slug } = useParams()
  const { data, error, loading, reload } = useApi(`/api/authors/${slug}`)
  usePageTitle(data?.author?.name)

  if (loading && !data) return <Loading />
  if (error?.status === 404) return <NotFound />
  if (error) return <LoadError error={error} onRetry={reload} />

  const { author } = data
  const stories = data.stories.map(normalize)

  return (
    <>
      <header className="container profile">
        <span className="avatar avatar--lg" aria-hidden="true">{initials(author.name)}</span>
        <div>
          <h1 className="profile__name">{author.name}</h1>
          <p className="profile__role">
            {author.role !== 'Community contributor' && author.role}
            {author.community && <Link to="/guidelines" className="community-badge">Community contributor</Link>}
          </p>
          {author.joinedAt && <p className="profile__joined">Writing for Tech News Singapore since {shortDate(new Date(author.joinedAt))}</p>}
          {author.bio && <p className="profile__bio">{author.bio}</p>}
        </div>
      </header>

      <section className="container" aria-labelledby="author-stories">
        <h2 id="author-stories" className="block-title">
          Latest from {author.name.split(' ')[0]} <span className="block-title__count">{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>
        </h2>
        {stories.length ? (
          <div className="story-list">
            {stories.map((a) => <Story key={a.slug} article={a} variant="row" dek />)}
          </div>
        ) : (
          <p className="state">No stories yet.</p>
        )}
      </section>
    </>
  )
}
