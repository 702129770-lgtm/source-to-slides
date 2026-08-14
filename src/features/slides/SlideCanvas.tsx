import type { DeckPage } from '../../domain/deck'

function Title({ page }: { page: DeckPage }) {
  return <header className="slide-title"><h2>{page.title}</h2>{page.subtitle && <p>{page.subtitle}</p>}</header>
}

function BulletList({ page }: { page: DeckPage }) {
  return <ul>{page.bullets.map((item, index) => <li key={`${item}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ul>
}

function Media({ page, className = 'slide-media' }: { page: DeckPage; className?: string }) {
  const asset = page.assets[0]
  if (!asset) return null
  return <figure className={className}><img src={asset.url} alt={asset.name} /></figure>
}

function Body({ page }: { page: DeckPage }) {
  if (page.assets.length > 0 && (page.layout === 'text-image' || page.layout === 'image-text')) {
    const text = <div className="slide-media-copy"><p>{page.body}</p><BulletList page={page} /></div>
    return <div className={`slide-copy with-media ${page.layout}`}>
      {page.layout === 'image-text' && <Media page={page} />}
      {text}
      {page.layout === 'text-image' && <Media page={page} />}
    </div>
  }
  if (page.layout === 'process' || page.layout === 'timeline') {
    return <div className={`slide-flow ${page.layout}`}>{page.bullets.map((item, index) => <div key={`${item}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></div>)}</div>
  }
  if (page.layout === 'comparison') {
    return <div className="slide-comparison"><section><b>当前方式</b><p>{page.body}</p></section><section><b>采用方案后</b><BulletList page={page} /></section></div>
  }
  if (page.layout === 'data-proof') {
    return <div className="slide-data">{page.bullets.map((item, index) => <div key={`${item}-${index}`}><strong>0{index + 1}</strong><span>{item}</span></div>)}</div>
  }
  if (page.layout === 'logo-wall') {
    return <div className="slide-logos">{page.bullets.map((item, index) => <div key={`${item}-${index}`}>{item}</div>)}</div>
  }
  return <div className={`slide-copy ${page.layout}`}><p>{page.body}</p><BulletList page={page} /></div>
}

export function SlideCanvas({ page, compact = false }: { page: DeckPage; compact?: boolean }) {
  return (
    <article className={`slide-canvas layout-${page.layout} ${compact ? 'is-compact' : ''}`} role="img" aria-label={page.title} data-ratio="16:9">
      <div className="slide-contour" aria-hidden="true" />
      {page.layout === 'cover' ? (
        <><div className="cover-copy"><p>{page.subtitle}</p><h2>{page.title}</h2><div className="cover-rule" /><strong>{page.emphasis}</strong></div>{page.assets.length > 0 && <Media page={page} className="cover-media" />}</>
      ) : (
        <><Title page={page} /><Body page={page} />{page.emphasis && <footer className="slide-conclusion">{page.emphasis}</footer>}</>
      )}
    </article>
  )
}
