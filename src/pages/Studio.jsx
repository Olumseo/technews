import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { SECTIONS, sectionBySlug } from '../data/site.js'
import { api, normalize, useApi } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Loading, LoadError } from '../components/State.jsx'
import { initials, shortDate, usePageTitle } from '../lib.js'

const STATUS = {
  published: { label: 'Published', className: 'status--published' },
  pending: { label: 'In review', className: 'status--pending' },
  rejected: { label: 'Not approved', className: 'status--rejected' },
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.published
  return <span className={`status ${s.className}`}>{s.label}</span>
}

// `queueCount` lets the review page keep the badge in step after approving or sending back.
function StudioBar({ queueCount }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user.role === 'admin'
  const fetched = useApi(isAdmin && queueCount === undefined ? '/api/studio/review' : null).data?.items?.length || 0
  const queue = queueCount ?? fetched

  return (
    <div className="studio-bar">
      <div className="container studio-bar__inner">
        <p>
          Signed in as <strong>{user.name}</strong>
          {isAdmin ? ' (admin)' : user.trusted ? ' (trusted creator)' : ' (community creator)'}
        </p>
        <nav className="studio-bar__actions" aria-label="Studio">
          <NavLink to="/studio" end className="studio-bar__link">My stories</NavLink>
          {isAdmin && (
            <NavLink to="/studio/review" className="studio-bar__link">
              Review{queue > 0 && <span className="count-badge" aria-label={`${queue} waiting`}>{queue}</span>}
            </NavLink>
          )}
          {isAdmin && <NavLink to="/studio/creators" className="studio-bar__link">Creators</NavLink>}
          <NavLink to="/studio/profile" className="studio-bar__link">Profile</NavLink>
          <Link to="/studio/new" className="btn btn--solid">New story</Link>
          <button className="btn btn--ghost" onClick={async () => { await logout(); navigate('/') }}>Sign out</button>
        </nav>
      </div>
    </div>
  )
}

/* ---------- My stories ---------- */

export function StudioHome() {
  usePageTitle('Studio')
  const { user } = useAuth()
  const location = useLocation()
  const { data, error, loading, reload } = useApi('/api/studio/articles')
  const [removing, setRemoving] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')

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
  const published = items.filter((a) => a.status === 'published')
  const reads = published.reduce((n, a) => n + a.views, 0)
  const waiting = items.filter((a) => a.status === 'pending').length

  return (
    <>
      <StudioBar />
      <section className="container studio">
        <header className="studio__head">
          <h1 className="info__title">{user.role === 'admin' ? 'All stories' : 'My stories'}</h1>
          {data && (
            <p className="studio__stats">
              {published.length} published{waiting > 0 && `, ${waiting} in review`}, {reads.toLocaleString('en-SG')} total reads
            </p>
          )}
        </header>
        {notice && <p className="studio__notice" role="status">{notice}</p>}
        {!user.publishesInstantly && (
          <p className="studio__info">
            Your stories are checked by an editor before they go live, usually within a day. Once you have a few approved stories, an editor can let you publish instantly. Read the <Link to="/guidelines">creator guidelines</Link>.
          </p>
        )}
        {loading && !data && <Loading />}
        {error && <LoadError error={error} onRetry={reload} />}
        {data && items.length === 0 && (
          <div className="form-done">
            <h2>No stories yet</h2>
            <p>Your stories will appear here, with their status and how many people read them.</p>
            <Link to="/studio/new" className="btn btn--solid">Write your first story</Link>
          </div>
        )}
        {items.length > 0 && (
          <div className="studio-table" role="table" aria-label="Stories">
            <div className="studio-table__row studio-table__row--head" role="row">
              <span role="columnheader">Story</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Updated</span>
              <span role="columnheader">Reads</span>
              <span role="columnheader"><span className="sr-only">Actions</span></span>
            </div>
            {items.map((a) => (
              <div key={a.slug} className="studio-table__row" role="row">
                <span role="cell" className="studio-table__title">
                  {a.breaking && <span className="tag tag--breaking">Breaking</span>}
                  <Link to={`/article/${a.slug}`}>{a.title}</Link>
                  <span className="studio-table__by">
                    {sectionBySlug(a.section)?.name}
                    {user.role === 'admin' && `, by ${a.author}`}
                  </span>
                  {a.status === 'rejected' && a.reviewNote && (
                    <span className="studio-table__note">Editor’s note: {a.reviewNote}</span>
                  )}
                </span>
                <span role="cell"><StatusBadge status={a.status} /></span>
                <span role="cell">{shortDate(new Date(a.publishedAt))}</span>
                <span role="cell">{a.status === 'published' ? a.views.toLocaleString('en-SG') : '–'}</span>
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

/* ---------- Write and edit ---------- */

const EMPTY = { title: '', dek: '', section: '', body: '', caption: '', quote: '', sourceName: '', sourceUrl: '', breaking: false }

export function StudioEditor() {
  const { slug } = useParams()
  const editing = Boolean(slug)
  usePageTitle(editing ? 'Edit story' : 'New story')
  const { user } = useAuth()
  const navigate = useNavigate()
  const existing = useApi(editing ? `/api/studio/articles/${slug}` : null)

  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (existing.data) {
      const { image, slug: _s, status: st, reviewNote: note, ...fields } = existing.data.article
      setForm({ ...EMPTY, ...fields })
      setStatus(st)
      setReviewNote(note)
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
    Object.entries(form).forEach(([k, v]) => body.append(k, typeof v === 'boolean' ? String(v) : v ?? ''))
    if (file) body.append('image', file)
    try {
      const res = await api(editing ? `/api/studio/articles/${slug}` : '/api/studio/articles', { method: editing ? 'PUT' : 'POST', form: body })
      if (res.status === 'pending') {
        navigate('/studio', { state: { notice: `“${form.title}” was sent for review. We’ll publish it once an editor approves it.` } })
      } else {
        navigate(`/article/${res.slug}`)
      }
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

  const action = user.publishesInstantly
    ? editing ? 'Save changes' : 'Publish story'
    : editing ? 'Save and send for review' : 'Send for review'

  return (
    <>
      <StudioBar />
      <section className="container studio studio--editor">
        <header className="studio__head">
          <h1 className="info__title">{editing ? 'Edit story' : 'New story'}</h1>
          {status && <StatusBadge status={status} />}
        </header>
        {message && <p className="studio__notice studio__notice--error" role="alert">{message}</p>}
        {status === 'rejected' && reviewNote && (
          <p className="studio__notice studio__notice--error">
            <strong>An editor asked for changes:</strong> {reviewNote} Make the changes, then send it for review again.
          </p>
        )}
        <p className="studio__info">
          {user.publishesInstantly
            ? 'Your stories go live as soon as you publish.'
            : 'An editor checks every story before it goes live. Write in your own words, and link to your source if you report on someone else’s news.'}
          {' '}<Link to="/guidelines">Creator guidelines</Link>
        </p>

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
            <p className="form__hint">JPG, PNG or WebP, up to 5 MB. Use your own photo or one you have permission to use.</p>
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

          {user.trusted && (
            <label className={`switch${form.breaking ? ' is-on' : ''}`}>
              <input type="checkbox" checked={form.breaking} onChange={(e) => setForm({ ...form, breaking: e.target.checked })} />
              <span className="switch__text">
                <span className="switch__title">Breaking news</span>
                <span className="switch__hint">Shows the story in the red banner and the Breaking section for 12 hours. Use it only for major, developing news.</span>
              </span>
            </label>
          )}

          <div className="form__actions">
            <button className="btn btn--solid" type="submit" disabled={busy}>{busy ? 'Saving…' : action}</button>
            <Link to="/studio" className="btn btn--ghost">Cancel</Link>
          </div>
        </form>
      </section>
    </>
  )
}

/* ---------- Profile ---------- */

export function StudioProfile() {
  usePageTitle('Your profile')
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ name: user.name, title: user.title, bio: user.bio || '' })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      const res = await api('/api/studio/profile', { method: 'PUT', json: form })
      setUser(res.user)
      setErrors({})
      setNotice('Profile saved.')
    } catch (err) {
      setErrors(err.fields || {})
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <StudioBar />
      <section className="container studio studio--editor">
        <header className="studio__head">
          <h1 className="info__title">Your profile</h1>
          <Link to={`/author/${user.slug}`} className="section-head__more">View public profile</Link>
        </header>
        {notice && <p className={`studio__notice${Object.keys(errors).length ? ' studio__notice--error' : ''}`} role="status">{notice}</p>}
        <div className="profile-preview">
          <span className="avatar avatar--lg" aria-hidden="true">{initials(form.name || user.name)}</span>
          <div>
            <p className="profile-preview__name">{form.name || 'Your name'}</p>
            <p className="profile-preview__role">{form.title || 'What you write about'}</p>
          </div>
        </div>
        <form className="form" onSubmit={save} noValidate>
          <div className="form__row">
            <label htmlFor="p-name">Name</label>
            <p className="form__hint">Shown on your stories and your profile page.</p>
            <input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} aria-invalid={!!errors.name} />
            {errors.name && <p className="form__error">{errors.name}</p>}
          </div>
          <div className="form__row">
            <label htmlFor="p-title">Short description</label>
            <p className="form__hint">For example “Freelance tech writer” or “Student journalist, NTU”.</p>
            <input id="p-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={60} aria-invalid={!!errors.title} />
            {errors.title && <p className="form__error">{errors.title}</p>}
          </div>
          <div className="form__row">
            <label htmlFor="p-bio">About you</label>
            <p className="form__hint">A sentence or two about what you cover. Up to 400 characters.</p>
            <textarea id="p-bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={400} />
          </div>
          <p className="form__hint">Signed in as {user.email}</p>
          <button className="btn btn--solid" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        </form>
      </section>
    </>
  )
}

/* ---------- Admin: review queue ---------- */

export function StudioReview() {
  usePageTitle('Review queue')
  const { data, error, loading, reload } = useApi('/api/studio/review')
  const [open, setOpen] = useState('')
  const [notes, setNotes] = useState({})
  const [noteErrors, setNoteErrors] = useState({})
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  const act = async (a, verb) => {
    setBusy(a.slug)
    setNotice('')
    try {
      await api(`/api/studio/review/${a.slug}/${verb}`, { method: 'POST', json: verb === 'reject' ? { note: notes[a.slug] || '' } : undefined })
      setNotice(verb === 'approve' ? `Published “${a.title}”.` : `Sent “${a.title}” back to ${a.author} with your note.`)
      setOpen('')
      reload()
    } catch (err) {
      if (err.fields?.note) setNoteErrors({ ...noteErrors, [a.slug]: err.fields.note })
      else setNotice(err.message)
    } finally {
      setBusy('')
    }
  }

  const items = (data?.items || []).map(normalize)

  return (
    <>
      <StudioBar queueCount={data ? items.length : undefined} />
      <section className="container studio">
        <header className="studio__head">
          <h1 className="info__title">Review queue</h1>
          {data && <p className="studio__stats">{items.length} {items.length === 1 ? 'story' : 'stories'} waiting, oldest first</p>}
        </header>
        {notice && <p className="studio__notice" role="status">{notice}</p>}
        {loading && !data && <Loading />}
        {error && <LoadError error={error} onRetry={reload} />}
        {data && items.length === 0 && (
          <div className="form-done">
            <h2>Nothing to review</h2>
            <p>New stories from community creators will appear here.</p>
          </div>
        )}
        <ul className="review-list">
          {items.map((a) => (
            <li key={a.slug} className="review-card">
              <div className="review-card__top">
                <img src={a.image} alt="" className="review-card__img" />
                <div className="review-card__main">
                  <p className="review-card__meta">
                    <span className="tag">{sectionBySlug(a.section)?.name}</span>
                    <span>Submitted {shortDate(new Date(a.submittedAt))}</span>
                  </p>
                  <h2 className="review-card__title">{a.title}</h2>
                  <p className="review-card__dek">{a.dek}</p>
                  <p className="review-card__by">
                    By <Link to={`/author/${a.authorSlug}`}>{a.author}</Link>, {a.authorEmail}, joined {shortDate(new Date(a.authorJoined))}
                  </p>
                  {a.source && (
                    <p className="review-card__by">Source: <a href={a.source.url} target="_blank" rel="noopener noreferrer">{a.source.name}</a></p>
                  )}
                </div>
              </div>

              <details className="review-card__body" open={open === a.slug} onToggle={(e) => e.currentTarget.open && setOpen(a.slug)}>
                <summary>Read the full story</summary>
                {a.body.map((p, i) => <p key={i}>{p}</p>)}
              </details>

              <div className="review-card__actions">
                <button className="btn btn--solid" onClick={() => act(a, 'approve')} disabled={busy === a.slug}>Approve and publish</button>
                <div className="review-card__reject">
                  <label htmlFor={`note-${a.slug}`} className="sr-only">Reason for sending back</label>
                  <input
                    id={`note-${a.slug}`}
                    placeholder="What should the creator change?"
                    value={notes[a.slug] || ''}
                    onChange={(e) => { setNotes({ ...notes, [a.slug]: e.target.value }); setNoteErrors({ ...noteErrors, [a.slug]: '' }) }}
                    aria-invalid={!!noteErrors[a.slug]}
                  />
                  <button className="btn btn--ghost btn--danger" onClick={() => act(a, 'reject')} disabled={busy === a.slug}>Send back</button>
                </div>
                {noteErrors[a.slug] && <p className="form__error">{noteErrors[a.slug]}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

/* ---------- Admin: creators ---------- */

export function StudioCreators() {
  usePageTitle('Creators')
  const { data, error, loading, reload } = useApi('/api/studio/creators')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')

  const update = async (c, change, message) => {
    if (change.status === 'suspended' && !window.confirm(`Suspend ${c.name}? Their stories will be hidden and they will be signed out.`)) return
    setBusy(c.slug)
    try {
      await api(`/api/studio/creators/${c.slug}`, { method: 'PATCH', json: change })
      setNotice(message)
      reload()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy('')
    }
  }

  const items = data?.items || []

  return (
    <>
      <StudioBar />
      <section className="container studio">
        <header className="studio__head">
          <h1 className="info__title">Creators</h1>
          {data && <p className="studio__stats">{items.length} accounts, {items.filter((c) => !c.trusted).length} community</p>}
        </header>
        <p className="studio__info">Trusted creators publish without review and can flag breaking news. Suspending an account hides its stories and signs it out.</p>
        {notice && <p className="studio__notice" role="status">{notice}</p>}
        {loading && !data && <Loading />}
        {error && <LoadError error={error} onRetry={reload} />}
        {items.length > 0 && (
          <div className="studio-table" role="table" aria-label="Creators">
            <div className="studio-table__row studio-table__row--head studio-table__row--creators" role="row">
              <span role="columnheader">Creator</span>
              <span role="columnheader">Joined</span>
              <span role="columnheader">Stories</span>
              <span role="columnheader">Access</span>
              <span role="columnheader"><span className="sr-only">Actions</span></span>
            </div>
            {items.map((c) => (
              <div key={c.slug} className="studio-table__row studio-table__row--creators" role="row">
                <span role="cell" className="studio-table__title">
                  <Link to={`/author/${c.slug}`}>{c.name}</Link>
                  <span className="studio-table__by">{c.email}</span>
                </span>
                <span role="cell">{shortDate(new Date(c.joinedAt))}</span>
                <span role="cell">{c.published} live{c.pending > 0 && `, ${c.pending} in review`}</span>
                <span role="cell">
                  {c.status === 'suspended'
                    ? <span className="status status--rejected">Suspended</span>
                    : c.trusted ? <span className="status status--published">Trusted</span> : <span className="status status--pending">Community</span>}
                </span>
                <span role="cell" className="studio-table__actions">
                  {c.status === 'active' && (
                    <button className="btn btn--ghost btn--sm" disabled={busy === c.slug}
                      onClick={() => update(c, { trusted: !c.trusted }, c.trusted ? `${c.name}’s stories will now be reviewed.` : `${c.name} can now publish without review.`)}>
                      {c.trusted ? 'Remove trust' : 'Trust'}
                    </button>
                  )}
                  <button className={`btn btn--ghost btn--sm${c.status === 'active' ? ' btn--danger' : ''}`} disabled={busy === c.slug}
                    onClick={() => update(c, { status: c.status === 'active' ? 'suspended' : 'active' }, c.status === 'active' ? `${c.name} is suspended.` : `${c.name} is active again.`)}>
                    {c.status === 'active' ? 'Suspend' : 'Reinstate'}
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
