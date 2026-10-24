import { Link } from 'react-router-dom'
import { SECTIONS } from '../data/articles.js'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__about">
            <p className="footer__mission">Independent reporting on technology, business and the world, from a city where a quarter of the world’s trade passes by every day.</p>
          </div>
          <nav aria-label="Sections">
            <h2 className="footer__head">Sections</h2>
            <ul>
              {SECTIONS.map((s) => (
                <li key={s.slug}><Link to={`/section/${s.slug}`}>{s.name}</Link></li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="footer__head">Read more</h2>
            <ul>
              <li><Link to="/newsletters">Newsletters</Link></li>
              <li><Link to="/section/opinion">Opinion</Link></li>
              <li><Link to="/section/climate">Climate desk</Link></li>
              <li><Link to="/section/tech">Tech desk</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="footer__head">About</h2>
            <ul>
              <li><Link to="/about">About us</Link></li>
              <li><Link to="/contact">Contact the newsroom</Link></li>
              <li><Link to="/corrections">Corrections</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <p className="footer__mark" aria-hidden="true">Tech News Singapore</p>
        <p className="footer__legal">© {new Date().getFullYear()} Tech News Singapore. A design demo. All stories on this site are fictional.</p>
      </div>
    </footer>
  )
}
