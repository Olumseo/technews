import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { usePageTitle } from '../lib.js'

const STEPS = [
  ['Create your account', 'It takes a minute. You only need a name, an email and a password.'],
  ['Write your first story', 'Add a headline, a photo and your story in the studio. Link your sources.'],
  ['An editor checks it', 'We read every new creator’s stories before they go live, usually within a day.'],
  ['Publish and grow', 'Readers find you on the front page and your profile. Trusted creators publish instantly.'],
]

export default function Join() {
  usePageTitle('Become a creator')
  const { user, ready, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', bio: '', acceptGuidelines: false, website: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (ready && user) return <Navigate to="/studio" replace />

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const created = await signup(form)
      navigate(created ? '/studio/new' : '/')
    } catch (err) {
      setErrors(err.fields || {})
      setMessage(err.message)
    } finally {
      setBusy(false)
    }
  }

  const err = (k) => errors[k] && <p className="form__error" id={`j-${k}-err`}>{errors[k]}</p>
  const described = (k, hint) => [hint && `j-${k}-hint`, errors[k] && `j-${k}-err`].filter(Boolean).join(' ') || undefined

  return (
    <section className="container join">
      <div className="join__intro">
        <h1 className="join__title">Write for Tech News Singapore</h1>
        <p className="join__lede">
          Anyone can become a creator. Share news, explainers and analysis about technology, business and life in Singapore and Asia with our readers.
        </p>
        <ol className="join__steps">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <span className="join__num" aria-hidden="true">{i + 1}</span>
              <div>
                <p className="join__step-title">{title}</p>
                <p className="join__step-text">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="auth__card join__card">
        <h2 className="auth__title">Create a creator account</h2>
        <p className="auth__lede">Already have one? <Link to="/login" className="text-link">Sign in</Link></p>
        {message && <p className="studio__notice studio__notice--error" role="alert">{message}</p>}
        <form className="form" onSubmit={submit} noValidate>
          <div className="form__row">
            <label htmlFor="j-name">Your name</label>
            <p className="form__hint" id="j-name-hint">Shown on your stories. Use your real name or a name readers can trust.</p>
            <input id="j-name" autoComplete="name" value={form.name} onChange={set('name')} maxLength={60} aria-invalid={!!errors.name} aria-describedby={described('name', true)} />
            {err('name')}
          </div>
          <div className="form__row">
            <label htmlFor="j-email">Email address</label>
            <input id="j-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} aria-describedby={described('email')} />
            {err('email')}
          </div>
          <div className="form__row">
            <label htmlFor="j-password">Password</label>
            <p className="form__hint" id="j-password-hint">At least 10 characters.</p>
            <input id="j-password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-invalid={!!errors.password} aria-describedby={described('password', true)} />
            {err('password')}
          </div>
          <div className="form__row">
            <label htmlFor="j-bio">What will you write about? (optional)</label>
            <textarea id="j-bio" rows={3} value={form.bio} onChange={set('bio')} maxLength={300} />
          </div>
          {/* Hidden from people; catches bots that fill in every field. */}
          <div className="hp" aria-hidden="true">
            <label htmlFor="j-website">Website</label>
            <input id="j-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </div>
          <label className={`switch${form.acceptGuidelines ? ' is-on' : ''}`}>
            <input type="checkbox" checked={form.acceptGuidelines} onChange={set('acceptGuidelines')} aria-invalid={!!errors.acceptGuidelines} />
            <span className="switch__text">
              <span className="switch__title">I agree to the creator guidelines</span>
              <span className="switch__hint">
                I’ll write accurately and in my own words, credit my sources and only use photos I have the right to use. <Link to="/guidelines" target="_blank" className="text-link">Read the guidelines</Link>
              </span>
            </span>
          </label>
          {err('acceptGuidelines')}
          <button className="btn btn--solid btn--block" type="submit" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
        </form>
      </div>
    </section>
  )
}
