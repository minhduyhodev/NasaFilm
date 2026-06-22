import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { normalizeAvatarUrl } from '../utils/avatarUrl';

const UserAvatar = ({
  src,
  name,
  className = 'w-10 h-10',
  iconClassName = 'w-4 h-4',
  fallbackClassName = 'bg-gradient-to-br from-amber-900/40 to-orange-950/40',
  borderClassName = 'border border-[#1A2238]',
}) => {
  const [failed, setFailed] = useState(false);
  const url = normalizeAvatarUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!url || failed) {
    const initial = name?.trim()?.charAt(0)?.toUpperCase();
    return (
      <div
        className={`rounded-full shrink-0 overflow-hidden flex items-center justify-center ${borderClassName} ${fallbackClassName} ${className}`}
      >
        {initial ? (
          <span className="text-xs font-bold text-amber-400">{initial}</span>
        ) : (
          <User className={`text-amber-500 ${iconClassName}`} />
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-full shrink-0 overflow-hidden ${borderClassName} ${className}`}>
      <img
        src={url}
        alt={name ? `Avatar ${name}` : 'Avatar'}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

export default UserAvatar;
