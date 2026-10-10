import { CREDITS } from './asset-credits'

const link = (href, text) => (href ? <a href={href} target="_blank" rel="noreferrer">{text}</a> : text)

/** Small attribution line in the bottom-left corner for third-party assets. */
export function Credits() {
  const credits = CREDITS.filter((c) => c.author)
  if (!credits.length) return null
  return (
    <p className="credits">
      {credits.map((c, i) => (
        <span key={c.what}>
          {i > 0 && ' · '}
          {c.what} by {c.source ? c.author : link(c.url, c.author)}
          {c.license && <> [{link(c.licenseUrl, c.license)}]</>}
          {c.source && <> via {link(c.url, c.source)}</>}
        </span>
      ))}
    </p>
  )
}
