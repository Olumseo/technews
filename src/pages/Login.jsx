import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { usePageTitle } from '../lib.js'

export default function Login() {
  usePageTitle('Creator sign-in')
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const to = location.state?.from || '/studio'
  if (ready && user) return <Navigate to={to} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Enter your email and password.')
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
      navigate(to, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="container auth">
      <div className="auth__card">
        <h1 className="auth__title">Creator sign-in</h1>
        <p className="auth__lede">Sign in to write, publish and edit stories. Accounts are set up by the newsroom.</p>
        <form className="form" onSubmit={submit} noValidate>
          <div className="form__row">
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form__row">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="form__error" role="alert">{error}</p>}
          <button className="btn btn--solid btn--block" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </section>
  )
}
