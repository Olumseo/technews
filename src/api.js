import { useCallback, useEffect, useState } from 'react'

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message)
    this.status = status
    this.fields = fields || {}
  }
}

// Adds fields the UI derives from the API's ISO timestamps.
export function normalize(article) {
  if (!article) return article
  return { ...article, minutesAgo: Math.max(0, Math.round((Date.now() - new Date(article.publishedAt)) / 60000)) }
}

export async function api(path, { method = 'GET', json, form } = {}) {
  const headers = { 'X-Requested-With': 'tns' }
  let body
  if (json) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form
  }
  let res
  try {
    res = await fetch(path, { method, headers, body, credentials: 'same-origin' })
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong.', res.status, data.fields)
  return data
}

// Fetches `path` and re-fetches when it changes. Returns { data, error, loading, reload }.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let live = true
    setState((s) => ({ ...s, loading: true, error: null }))
    api(path)
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }))
    return () => { live = false }
  }, [path, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
