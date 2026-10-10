import { LINKS } from './links'

export function Header() {
  return (
    <header className="header">
      <span className="header-name">
        R3F Sketch Material <span className="header-author">· Abhishek Verma</span>
      </span>
      <nav className="header-links" aria-label="Profiles">
        {LINKS.filter((l) => l.href).map(({ label, href, icon: Icon }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
            <Icon aria-hidden="true" />
          </a>
        ))}
      </nav>
    </header>
  )
}
