import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../lib.js'

function InfoPage({ title, lede, children }) {
  usePageTitle(title)
  return (
    <article className="container info">
      <header className="info__head">
        <h1 className="info__title">{title}</h1>
        {lede && <p className="info__lede">{lede}</p>}
      </header>
      <div className="info__body">{children}</div>
    </article>
  )
}

export function About() {
  return (
    <InfoPage
      title="About us"
      lede="Tech News Singapore reports on technology, business and the world from a city at the crossroads of Asia."
    >
      <h2>What we cover</h2>
      <p>We focus on the stories that shape daily life in Singapore and the region: how people work, travel, pay, build and adapt. We follow technology closely, but we write for everyone, not only for experts.</p>
      <p>Many of our stories are short explainers of news first reported elsewhere. We write them in our own words and link to the original report at the end of each story, so you can always read the full source.</p>
      <h2>How we work</h2>
      <ul>
        <li>We explain what happened, why it matters and what happens next.</li>
        <li>We name our sources whenever we can, and tell you when we cannot.</li>
        <li>We correct mistakes quickly and openly on our <Link to="/corrections">corrections page</Link>.</li>
        <li>We keep news and opinion clearly apart. Opinion pieces are labelled.</li>
      </ul>
      <h2>Our newsroom</h2>
      <p>Our writers cover Singapore, Southeast Asia and the wider world. Every writer has a page listing their stories, linked from their name on each article.</p>
    </InfoPage>
  )
}

export function Corrections() {
  return (
    <InfoPage
      title="Corrections"
      lede="When we get something wrong, we fix it and say so. Here are our most recent corrections."
    >
      <p className="corrections__empty">There are no corrections to show right now. When we change a story because of a mistake, we will list it here with the date and what changed.</p>
      <h2>Spotted a mistake?</h2>
      <p>Tell us on the <Link to="/contact">contact page</Link>. Please include the story’s headline and what you think is wrong.</p>
    </InfoPage>
  )
}

export function Privacy() {
  return (
    <InfoPage title="Privacy" lede="A short, plain explanation of what this site does with your information.">
      <h2>What we collect</h2>
      <p>If you sign up for a newsletter, we store your email address and which newsletters you chose. We do not sell it or share it with advertisers.</p>
      <h2>Cookies</h2>
      <p>This site does not use advertising or tracking cookies.</p>
      <h2>Your choices</h2>
      <p>Every newsletter has an unsubscribe link at the bottom. You can also ask us to delete your details at any time through the <Link to="/contact">contact page</Link>.</p>
      <p className="info__note">The newsletter and contact forms on this site are not connected to an email service yet, so they do not send or store anything.</p>
    </InfoPage>
  )
}

export function Guidelines() {
  return (
    <InfoPage
      title="Creator guidelines"
      lede="Anyone can write for Tech News Singapore. These rules keep the site trustworthy for readers and fair for every creator."
    >
      <h2>Be accurate</h2>
      <ul>
        <li>Only report what you can check. If a detail is unconfirmed, say so, or leave it out.</li>
        <li>Link to your sources. If you’re summarising someone else’s reporting, name the outlet and link to the original.</li>
        <li>Fix mistakes quickly. Edit your story in the studio and tell readers what changed.</li>
      </ul>
      <h2>Use your own words and your own photos</h2>
      <ul>
        <li>Don’t copy other people’s articles. Short quotes are fine if you credit them.</li>
        <li>Only upload photos you took or have permission to use, and say where they came from in the caption.</li>
        <li>Don’t pass off AI-written or AI-generated content as your own reporting.</li>
      </ul>
      <h2>Be fair and safe</h2>
      <ul>
        <li>No hate, harassment or content that targets private individuals.</li>
        <li>No scams, spam, hidden advertising or paid posts you don’t disclose.</li>
        <li>Don’t publish private information, such as someone’s address or phone number.</li>
      </ul>
      <h2>How review works</h2>
      <p>An editor reads every new creator’s stories before they go live, usually within a day. If something needs to change, the story comes back to you with a note. After a few approved stories, editors can let you publish instantly.</p>
      <p>Only trusted creators can flag a story as breaking news. Editors can remove stories or suspend accounts that break these rules.</p>
      <p><Link to="/join">Create a creator account</Link> or <Link to="/contact">contact the newsroom</Link> with questions.</p>
    </InfoPage>
  )
}

const TOPICS = ['A story tip', 'A correction', 'Newsletters', 'Something else']

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', topic: TOPICS[0], message: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter an email address like name@example.com.'
    if (form.message.trim().length < 10) next.message = 'Write at least a sentence so we know how to help.'
    setErrors(next)
    if (!Object.keys(next).length) setSent(true)
  }

  return (
    <InfoPage title="Contact the newsroom" lede="Send us a story tip, report a mistake or ask a question. We read every message.">
      {sent ? (
        <div className="form-done" role="status">
          <h2>Thanks, {form.name.split(' ')[0]}</h2>
          <p>Our contact form is not connected to email yet, so this message was not sent. Once it is, a member of the newsroom will reply to {form.email}.</p>
          <button className="btn btn--ghost" onClick={() => { setSent(false); setForm({ ...form, message: '' }) }}>Write another message</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <div className="form__row">
            <label htmlFor="c-name">Your name</label>
            <input id="c-name" value={form.name} onChange={set('name')} aria-invalid={!!errors.name} aria-describedby="c-name-err" autoComplete="name" />
            {errors.name && <p id="c-name-err" className="form__error">{errors.name}</p>}
          </div>
          <div className="form__row">
            <label htmlFor="c-email">Email address</label>
            <input id="c-email" type="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} aria-describedby="c-email-err" autoComplete="email" />
            {errors.email && <p id="c-email-err" className="form__error">{errors.email}</p>}
          </div>
          <div className="form__row">
            <label htmlFor="c-topic">What is it about?</label>
            <select id="c-topic" value={form.topic} onChange={set('topic')}>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form__row">
            <label htmlFor="c-msg">Message</label>
            <textarea id="c-msg" rows={6} value={form.message} onChange={set('message')} aria-invalid={!!errors.message} aria-describedby="c-msg-err" />
            {errors.message && <p id="c-msg-err" className="form__error">{errors.message}</p>}
          </div>
          <button className="btn btn--solid" type="submit">Send message</button>
        </form>
      )}
    </InfoPage>
  )
}
