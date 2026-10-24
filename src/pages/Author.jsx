import { useParams } from 'react-router-dom'
import { authorBySlug } from '../data/articles.js'
import Story from '../components/Story.jsx'
import { initials, usePageTitle } from '../lib.js'
import NotFound from './NotFound.jsx'

export default function Author() {
  const { slug } = useParams()
  const author = authorBySlug(slug)
  usePageTitle(author?.name)
  if (!author) return <NotFound />

  return (
    <>
      <header className="container profile">
        <span className="avatar avatar--lg" aria-hidden="true">{initials(author.name)}</span>
        <div>
          <h1 className="profile__name">{author.name}</h1>
          <p className="profile__role">{author.role}</p>
          {author.bio && <p className="profile__bio">{author.bio}</p>}
        </div>
      </header>

      <section className="container" aria-labelledby="author-stories">
        <h2 id="author-stories" className="block-title">
          Latest from {author.name.split(' ')[0]} <span className="block-title__count">{author.stories.length} {author.stories.length === 1 ? 'story' : 'stories'}</span>
        </h2>
        <div className="story-list">
          {author.stories.map((a) => <Story key={a.slug} article={a} variant="row" dek />)}
        </div>
      </section>
    </>
  )
}
