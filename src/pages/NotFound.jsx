import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="container not-found">
      <p className="not-found__mark" aria-hidden="true">404</p>
      <h1>This page has moved or never existed</h1>
      <p>Check the address, or head back to today’s front page.</p>
      <Link className="btn btn--solid" to="/">Go to the front page</Link>
    </section>
  )
}
