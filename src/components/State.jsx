// Shared loading and error placeholders for pages that fetch from the API.

export function Loading({ label = 'Loading stories…' }) {
  return (
    <div className="container state" role="status">
      <div className="skeleton" aria-hidden="true">
        <span className="skeleton__img" />
        <span className="skeleton__line" />
        <span className="skeleton__line skeleton__line--short" />
      </div>
      <p className="sr-only">{label}</p>
    </div>
  )
}

export function LoadError({ error, onRetry }) {
  return (
    <div className="container state state--error" role="alert">
      <h1>We couldn’t load this page</h1>
      <p>{error?.message || 'Something went wrong.'}</p>
      {onRetry && <button className="btn btn--solid" onClick={onRetry}>Try again</button>}
    </div>
  )
}
