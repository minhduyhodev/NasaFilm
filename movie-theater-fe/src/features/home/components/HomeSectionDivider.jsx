import './HomeSectionDivider.css';

export default function HomeSectionDivider({ label }) {
  if (!label) return null;

  return (
    <div className="home-section-divider" aria-hidden>
      <span className="home-section-divider__label">{label}</span>
    </div>
  );
}
