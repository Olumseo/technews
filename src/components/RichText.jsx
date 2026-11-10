// Light formatting for story bodies. Each block is one paragraph from the editor (blocks are split by blank lines):
//   "## Heading" / "### Heading"  → subheading / smaller subheading
//   "- item" on each line         → bullet list
//   "1. item" on each line        → numbered list
//   "[text](https://…)"           → link, anywhere in a paragraph or list item
//   "**text**"                    → bold, anywhere in a paragraph or list item
// Everything is rendered as React text, so no HTML from a story can reach the page.

const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g
const INLINE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*/g
const NUMBERED = /^\d+\.\s+/

export function Inline({ text }) {
  const out = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      m[3]
        ? <strong key={m.index}>{m[3]}</strong>
        : <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer nofollow">{m[1]}</a>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const linesOf = (block) => block.split('\n').map((l) => l.trim()).filter(Boolean)

export function blockType(block) {
  if (block.startsWith('### ')) return 'subheading'
  if (block.startsWith('## ')) return 'heading'
  const lines = linesOf(block)
  if (lines.length && lines.every((l) => l.startsWith('- '))) return 'list'
  if (lines.length && lines.every((l) => NUMBERED.test(l))) return 'numbered'
  return 'paragraph'
}

export function Block({ block, className }) {
  const type = blockType(block)
  if (type === 'heading') return <h2 className="rich__heading"><Inline text={block.slice(3).trim()} /></h2>
  if (type === 'subheading') return <h3 className="rich__subheading"><Inline text={block.slice(4).trim()} /></h3>
  if (type === 'list') {
    return <ul className="rich__list">{linesOf(block).map((l, i) => <li key={i}><Inline text={l.slice(2)} /></li>)}</ul>
  }
  if (type === 'numbered') {
    return <ol className="rich__list rich__list--numbered">{linesOf(block).map((l, i) => <li key={i}><Inline text={l.replace(NUMBERED, '')} /></li>)}</ol>
  }
  return <p className={className}><Inline text={block} /></p>
}

// Plain text for read-aloud and previews: drops the formatting marks, keeps link text.
export function plainText(block) {
  return block
    .replace(LINK, '$1')
    .replace(/\*\*/g, '')
    .replace(/^#{2,3} /, '')
    .split('\n')
    .map((l) => l.trim().replace(/^- /, '').replace(NUMBERED, ''))
    .join('. ')
}
