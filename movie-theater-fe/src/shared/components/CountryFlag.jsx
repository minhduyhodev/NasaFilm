import { useState } from 'react';
import { Globe } from 'lucide-react';
import { getCountryFlagUrl } from '../utils/countryFlagUrl';

/**
 * Small country flag from flagcdn, with Globe fallback.
 */
const CountryFlag = ({ code, name, className = '', size = 14 }) => {
  const [failed, setFailed] = useState(false);
  const src = getCountryFlagUrl(code, 40);

  if (!src || failed) {
    return <Globe className={`catalog-flag-fallback ${className}`.trim()} style={{ width: size, height: size }} aria-hidden />;
  }

  return (
    <img
      src={src}
      alt={name ? `Cờ ${name}` : ''}
      width={size}
      height={Math.round(size * 0.75)}
      className={`catalog-flag ${className}`.trim()}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};

export default CountryFlag;
