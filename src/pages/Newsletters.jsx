import { useState } from 'react'
import { NEWSLETTERS } from '../data/site.js'
import { usePageTitle } from '../lib.js'

export default function Newsletters() {
  usePageTitle('Newsletters')
  const [chosen, setChosen] = useState(['morning'])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const toggle = (id) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  const submit = (e) => {
    e.preventDefault()
    if (!chosen.length) return setError('Choose at least one newsletter.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter an email address like name@example.com.')
    setError('')
    setDone(true)
  }

  const names = NEWSLETTERS.filter((n) => chosen.includes(n.id)).map((n) => n.name)

  return (
    <article className="container info">
      <header className="info__head">
        <h1 className="info__title">Newsletters</h1>
        <p className="info__lede">Choose the newsletters you want, enter your email and we will send them straight to your inbox. Free, and you can stop any time.</p>
      </header>

      {done ? (
        <div className="form-done" role="status">
          <h2>You’re subscribed</h2>
          <p>You chose {names.join(', ')}. Newsletter emails are not switched on yet, so nothing will be sent to {email} for now.</p>
          <button className="btn btn--ghost" onClick={() => setDone(false)}>Change my choices</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <fieldset className="nl-list">
            <legend className="sr-only">Newsletters</legend>
            {NEWSLETTERS.map((n) => (
              <label key={n.id} className={`nl-card${chosen.includes(n.id) ? ' is-on' : ''}`}>
                <input type="checkbox" checked={chosen.includes(n.id)} onChange={() => toggle(n.id)} />
                <span className="nl-card__text">
                  <span className="nl-card__name">{n.name}</span>
                  <span className="nl-card__when">{n.when}</span>
                  <span className="nl-card__about">{n.about}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="form__row">
            <label htmlFor="nl-page-email">Email address</label>
            <input id="nl-page-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} aria-invalid={!!error} aria-describedby="nl-page-err" autoComplete="email" />
            {error && <p id="nl-page-err" className="form__error">{error}</p>}
          </div>
          <button className="btn btn--solid" type="submit">
            Subscribe to {chosen.length} {chosen.length === 1 ? 'newsletter' : 'newsletters'}
          </button>
        </form>
      )}
    </article>
  )
}
