import { useEffect, useState } from 'react'

const SG = 'Asia/Singapore'

export function timeAgo(minutes) {
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  if (minutes < 7 * 1440) return `${Math.floor(minutes / 1440)}d ago`
  return shortDate(new Date(Date.now() - minutes * 60000))
}

export function shortDate(date) {
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric', timeZone: SG })
}

// Clock time for today's stories, short date for anything older.
export function publishedAt(minutes, now = Date.now()) {
  const date = new Date(now - minutes * 60000)
  if (minutes >= 1440) return shortDate(date)
  return date.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SG })
}

export function fullDate(iso) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: SG })}, ${d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SG })} SGT`
}

export function formatClock(date, timeZone = SG) {
  return date.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone })
}

export function formatDate(date, timeZone = SG) {
  return date.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone })
}

export function useNow(interval = 30000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

const SITE = 'Tech News Singapore'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : SITE
    return () => { document.title = SITE }
  }, [title])
}

export function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
}

