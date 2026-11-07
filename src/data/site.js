// Static site configuration shared by the frontend and the API server.

export const SECTIONS = [
  { slug: 'world', name: 'World', blurb: 'Diplomacy, conflict and the decisions shaping the planet, explained from a Singapore desk.' },
  { slug: 'asia', name: 'Asia', blurb: 'From Jakarta to Tokyo, the region that sets the pace of the century.' },
  { slug: 'singapore', name: 'Singapore', blurb: 'Housing, transport, policy and the everyday life of a city-state.' },
  { slug: 'business', name: 'Business', blurb: 'Markets, trade and the companies moving money through the region.' },
  { slug: 'tech', name: 'Tech', blurb: 'Chips, cables, AI and the people building Southeast Asia’s digital economy.' },
  { slug: 'climate', name: 'Climate', blurb: 'Heat, water and adaptation on the frontline of a warming equator.' },
  { slug: 'opinion', name: 'Opinion', blurb: 'Arguments worth having, from our columnists.' },
  { slug: 'sport', name: 'Sport', blurb: 'Results, rivalries and the stories behind them.' },
  { slug: 'life', name: 'Life', blurb: 'Food, design, culture and how we live now.' },
]

export const sectionBySlug = (slug) => SECTIONS.find((s) => s.slug === slug)
export const isSection = (slug) => SECTIONS.some((s) => s.slug === slug)

export const NEWSLETTERS = [
  { id: 'morning', name: 'The TNS Morning Brief', when: 'Every day, 7am', about: 'Five stories that matter, in about four minutes.' },
  { id: 'tech', name: 'Tech Weekly', when: 'Fridays', about: 'The week in chips, AI, start-ups and the apps we use.' },
  { id: 'markets', name: 'Markets at the Close', when: 'Weekdays, 5.30pm', about: 'How Asian markets ended the day, and why.' },
  { id: 'weekend', name: 'Weekend Reads', when: 'Saturdays', about: 'Longer stories, food picks and things to do.' },
]

export const CITIES = [
  { name: 'Singapore', tz: 'Asia/Singapore' },
  { name: 'Tokyo', tz: 'Asia/Tokyo' },
  { name: 'Sydney', tz: 'Australia/Sydney' },
  { name: 'Dubai', tz: 'Asia/Dubai' },
  { name: 'London', tz: 'Europe/London' },
  { name: 'New York', tz: 'America/New_York' },
]

export const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    // Keep URLs short, but end on a whole word rather than mid-word.
    .replace(/^(.{0,80})(-.*)?$/, '$1')
    .slice(0, 80)
