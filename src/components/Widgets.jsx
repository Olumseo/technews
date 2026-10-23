import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CITIES, MARKETS } from '../data/articles.js'
import { formatClock, publishedAt, useNow } from '../lib.js'

export function Markets() {
  return (
    <section className="markets" aria-label="Markets">
      <div className="container markets__inner">
        <h2 className="markets__title">Markets</h2>
        <ul className="markets__list">
          {MARKETS.map((m) => (
            <li key={m.name} className={m.change >= 0 ? 'is-up' : 'is-down'}>
              <span className="markets__name">{m.name}</span>
              <span className="markets__value">{m.value}</span>
              <span className="markets__change">
                <span aria-hidden="true">{m.change >= 0 ? '▲' : '▼'}</span>
                <span className="sr-only">{m.change >= 0 ? 'up' : 'down'}</span>
                {m.change >= 0 ? '+' : '−'}{Math.abs(m.change).toFixed(2)}%
              </span>
            </li>
          ))}
        </ul>
        <span className="markets__note">Illustrative data</span>
      </div>
    </section>
  )
}

export function WorldClock() {
  const now = useNow(15000)
  return (
    <ul className="clocks" aria-label="Local time around the world">
      {CITIES.map((c) => {
        const hour = Number(now.toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: c.tz }))
        const night = hour < 6 || hour >= 19
        return (
          <li key={c.name} className={night ? 'is-night' : ''}>
            <span className="clocks__time">{formatClock(now, c.tz)}</span>
            <span className="clocks__city">{c.name}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function LatestTimeline({ items }) {
  const now = Date.now()
  return (
    <section className="timeline" aria-labelledby="latest-title">
      <h2 id="latest-title" className="timeline__title"><span className="pulse" aria-hidden="true" />Latest</h2>
      <ol className="timeline__list">
        {items.map((a) => (
          <li key={a.slug}>
            <time className="timeline__time">{publishedAt(a.minutesAgo, now)}</time>
            <Link to={`/article/${a.slug}`} className="timeline__link">{a.title}</Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function MostRead({ items }) {
  return (
    <section className="most-read" aria-labelledby="most-read-title">
      <h2 id="most-read-title" className="block-title">Most read</h2>
      <ol className="most-read__list">
        {items.map((a, i) => (
          <li key={a.slug}>
            <span className="most-read__rank" aria-hidden="true">{i + 1}</span>
            <Link to={`/article/${a.slug}`}>{a.title}</Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')

  const submit = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState('invalid')
    setState('done')
  }

  return (
    <section className="newsletter" id="newsletter" aria-labelledby="newsletter-title">
      <h2 id="newsletter-title" className="newsletter__title">The TNS Morning Brief</h2>
      <p className="newsletter__lede">Five stories that matter, in your inbox by 7am Singapore time. Read it in four minutes, over your kopi.</p>
      {state === 'done' ? (
        <p className="newsletter__done" role="status">You’re subscribed. Check {email} to confirm.</p>
      ) : (
        <form className="newsletter__form" onSubmit={submit} noValidate>
          <label htmlFor="nl-email" className="sr-only">Email address</label>
          <input
            id="nl-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setState('idle') }}
            aria-invalid={state === 'invalid'}
            aria-describedby="nl-hint"
          />
          <button className="btn btn--solid" type="submit">Subscribe</button>
          <p id="nl-hint" className={`newsletter__hint${state === 'invalid' ? ' is-error' : ''}`}>
            {state === 'invalid' ? 'Enter an email address like name@example.com.' : 'Free. Unsubscribe in one click.'}
          </p>
        </form>
      )}
    </section>
  )
}
