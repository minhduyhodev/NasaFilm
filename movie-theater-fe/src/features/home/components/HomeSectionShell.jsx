import './HomeSectionShell.css';

export default function HomeSectionShell({
  id,
  children,
  variant = 'default',
  spacing = 'normal',
  eyebrow,
  title,
  subtitle,
  className = '',
  innerClassName = '',
}) {
  const shellClass = [
    'home-section-shell',
    variant === 'glass' ? 'home-section-shell--glass' : '',
    spacing === 'tight' ? 'home-section-shell--tight' : '',
    spacing === 'loose' ? 'home-section-shell--loose' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hasHeader = eyebrow || title || subtitle;

  return (
    <section id={id} className={shellClass}>
      <div className={`home-section-shell__inner ${innerClassName}`.trim()}>
        {hasHeader ? (
          <header className="home-section-shell__header">
            {eyebrow ? <p className="home-section-shell__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="home-section-shell__title">{title}</h2> : null}
            {subtitle ? <p className="home-section-shell__subtitle">{subtitle}</p> : null}
          </header>
        ) : null}
        {children}
      </div>
    </section>
  );
}
