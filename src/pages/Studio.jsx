import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SECTIONS, sectionBySlug } from '../data/site.js'
import { api, normalize, useApi } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Loading, LoadError } from '../components/State.jsx'
import { shortDate, usePageTitle } from '../lib.js'

function StudioBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="studio-bar">
      <div className="container studio-bar__inner">
        <p>Signed in as <strong>{user.name}</strong>{user.role === 'admin' && ' (admin)'}</p>
        <div className="studio-bar__actions">
          <Link to="/studio" className="studio-bar__link">My stories</Link>
          <Link to="/studio/new" className="btn btn--solid">New story</Link>
          <button className="btn btn--ghost" onClick={async () => { await logout(); navigate('/') }}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

export function StudioHome() {
  usePageTitle('Studio')
  const { user } = useAuth()
  const { data, error, loading, reload } = useApi('/api/studio/articles')
  const [removing, setRemoving] = useState('')
  const [notice, setNotice] = useState('')

  const remove = async (a) => {
    if (!window.confirm(`Delete “${a.title}”? This can’t be undone.`)) return
    setRemoving(a.slug)
    try {
      await api(`/api/studio/articles/${a.slug}`, { method: 'DELETE' })
      setNotice(`Deleted “${a.title}”.`)
      reload()
    } catch (e) {
      setNotice(e.message)
    } finally {
      setRemoving('')
    }
  }

  const items = (data?.items || []).map(normalize)
  const views = items.reduce((n, a) => n + a.views, 0)

  return (
    <>
      <StudioBar />
      <section className="container studio">
        <header className="studio__head">
          <h1 className="info__title">{user.role === 'admin' ? 'All stories' : 'My stories'}</h1>
          {data && <p className="studio__stats">{items.length} published, {views.toLocaleString('en-SG')} total reads</p>}
        </header>
        {notice && <p className="studio__notice" role="status">{notice}</p>}
        {loading && !data && <Loading />}
        {error && <LoadError error={error} onRetry={reload} />}
        {data && items.length === 0 && (
          <div className="form-done">
            <h2>No stories yet</h2>
            <p>Your published stories will appear here.</p>
            <Link to="/studio/new" className="btn btn--solid">Write your first story</Link>
          </div>
        )}
        {items.length > 0 && (
          <div className="studio-table" role="table" aria-label="Stories">
            <div className="studio-table__row studio-table__row--head" role="row">
              <span role="columnheader">Story</span>
              <span role="columnheader">Section</span>
              <span role="columnheader">Published</span>
              <span role="columnheader">Reads</span>
              <span role="columnheader"><span className="sr-only">Actions</span></span>
            </div>
            {items.map((a) => (
              <div key={a.slug} className="studio-table__row" role="row">
                <span role="cell" className="studio-table__title">
                  <Link to={`/article/${a.slug}`}>{a.title}</Link>
                  {user.role === 'admin' && <span className="studio-table__by">by {a.author}</span>}
                </span>
                <span role="cell">{sectionBySlug(a.section)?.name}</span>
                <span role="cell">{shortDate(new Date(a.publishedAt))}</span>
                <span role="cell">{a.views.toLocaleString('en-SG')}</span>
                <span role="cell" className="studio-table__actions">
                  <Link to={`/studio/edit/${a.slug}`} className="btn btn--ghost btn--sm">Edit</Link>
                  <button className="btn btn--ghost btn--sm btn--danger" onClick={() => remove(a)} disabled={removing === a.slug}>
                    {removing === a.slug ? 'Deleting…' : 'Delete'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

const EMPTY = { title: '', dek: '', section: '', body: '', caption: '', quote: '', sourceName: '', sourceUrl: '' }

export function StudioEditor() {
  const { slug } = useParams()
  const editing = Boolean(slug)
  usePageTitle(editing ? 'Edit story' : 'New story')
  const navigate = useNavigate()
  const existing = useApi(editing ? `/api/studio/articles/${slug}` : null)

  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (existing.data) {
      const { image, slug: _s, ...fields } = existing.data.article
      setForm({ ...EMPTY, ...fields })
      setPreview(image)
    }
  }, [existing.data])

  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setErrors({ ...errors, image: 'Upload a JPG, PNG or WebP image.' })
    if (f.size > 5 * 1024 * 1024) return setErrors({ ...errors, image: 'The photo must be 5 MB or smaller.' })
    setErrors({ ...errors, image: undefined })
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const body = new FormData()
    Object.entries(form).forEach(([k, v]) => body.append(k, v ?? ''))
    if (file) body.append('image', file)
    try {
      const res = await api(editing ? `/api/studio/articles/${slug}` : '/api/studio/articles', { method: editing ? 'PUT' : 'POST', form: body })
      navigate(`/article/${res.slug}`)
    } catch (err) {
      setErrors(err.fields || {})
      setMessage(err.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setBusy(false)
    }
  }

  if (editing && existing.loading && !existing.data) return <><StudioBar /><Loading label="Loading story…" /></>
  if (editing && existing.error) return <><StudioBar /><LoadError error={existing.error} onRetry={existing.reload} /></>

  const field = (k, label, input, hint) => (
    <div className="form__row">
      <label htmlFor={`f-${k}`}>{label}</label>
      {hint && <p className="form__hint" id={`f-${k}-hint`}>{hint}</p>}
      {input}
      {errors[k] && <p className="form__error" id={`f-${k}-err`}>{errors[k]}</p>}
    </div>
  )
  const a11y = (k, hint) => ({
    id: `f-${k}`,
    'aria-invalid': !!errors[k],
    'aria-describedby': [hint && `f-${k}-hint`, errors[k] && `f-${k}-err`].filter(Boolean).join(' ') || undefined,
  })

  return (
    <>
      <StudioBar />
      <section className="container studio studio--editor">
        <header className="studio__head">
          <h1 className="info__title">{editing ? 'Edit story' : 'New story'}</h1>
          <p className="studio__stats">Stories go live as soon as you publish.</p>
        </header>
        {message && <p className="studio__notice studio__notice--error" role="alert">{message}</p>}

        <form className="form" onSubmit={submit} noValidate>
          {field('title', 'Headline', <input {...a11y('title')} value={form.title} onChange={set('title')} maxLength={160} />)}
          {field('dek', 'Summary', <textarea {...a11y('dek', true)} rows={2} value={form.dek} onChange={set('dek')} maxLength={400} />, 'One or two sentences shown under the headline.')}
          {field('section', 'Section', (
            <select {...a11y('section')} value={form.section} onChange={set('section')}>
              <option value="">Choose a section</option>
              {SECTIONS.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          ))}

          <div className="form__row">
            <span className="form__label">Photo</span>
            <p className="form__hint">JPG, PNG or WebP, up to 5 MB. A wide photo works best.</p>
            <label className={`upload${errors.image ? ' is-invalid' : ''}`}>
              {preview ? <img src={preview} alt="" /> : <span className="upload__empty">Choose a photo</span>}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="sr-only" aria-label="Choose a photo" />
              {preview && <span className="upload__change">Change photo</span>}
            </label>
            {errors.image && <p className="form__error">{errors.image}</p>}
          </div>
          {field('caption', 'Photo caption', <input {...a11y('caption')} value={form.caption} onChange={set('caption')} maxLength={200} />)}

          {field('body', 'Story', <textarea {...a11y('body', true)} rows={14} value={form.body} onChange={set('body')} />, 'Leave a blank line between paragraphs.')}
          {field('quote', 'Pull quote (optional)', <input {...a11y('quote')} value={form.quote} onChange={set('quote')} maxLength={300} />)}

          <div className="form__pair">
            {field('sourceName', 'Source name (optional)', <input {...a11y('sourceName')} value={form.sourceName} onChange={set('sourceName')} placeholder="Reuters" maxLength={80} />)}
            {field('sourceUrl', 'Source link (optional)', <input {...a11y('sourceUrl')} type="url" value={form.sourceUrl} onChange={set('sourceUrl')} placeholder="https://" maxLength={500} />)}
          </div>

          <div className="form__actions">
            <button className="btn btn--solid" type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish story'}</button>
            <Link to="/studio" className="btn btn--ghost">Cancel</Link>
          </div>
        </form>
      </section>
    </>
  )
}
