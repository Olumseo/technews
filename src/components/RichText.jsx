// Light formatting for story bodies. Each block is one paragraph from the editor (blocks are split by blank lines):
//   "## Heading"           → subheading
//   "- item" on each line  → bullet list
//   "[text](https://…)"    → link, anywhere in a paragraph or list item
// Everything is rendered as React text, so no HTML from a story can reach the page.

const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g

export function Inline({ text }) {
  const out = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer nofollow">{m[1]}</a>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function blockType(block) {
  if (block.startsWith('## ')) return 'heading'
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length && lines.every((l) => l.startsWith('- '))) return 'list'
  return 'paragraph'
}

export function Block({ block, className }) {
  const type = blockType(block)
  if (type === 'heading') return <h2 className="rich__heading"><Inline text={block.slice(3).trim()} /></h2>
  if (type === 'list') {
    const items = block.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.slice(2))
    return <ul className="rich__list">{items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ul>
  }
  return <p className={className}><Inline text={block} /></p>
}

// Plain text for read-aloud and previews: drops the formatting marks, keeps link text.
export function plainText(block) {
  return block
    .replace(LINK, '$1')
    .replace(/^## /, '')
    .split('\n')
    .map((l) => l.trim().replace(/^- /, ''))
    .join('. ')
}
