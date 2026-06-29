import React from 'react';
import { Star } from 'lucide-react';

const StarRating = ({
  value = 0,
  onChange,
  size = 20,
  readOnly = false,
  className = '',
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} role={readOnly ? 'img' : 'group'} aria-label={`${value} trên 5 sao`}>
      {stars.map((star) => {
        const filled = star <= value;
        const StarIcon = (
          <Star
            className={`transition-colors ${
              filled ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
            } ${!readOnly ? 'hover:text-amber-300 hover:fill-amber-300' : ''}`}
            style={{ width: size, height: size }}
          />
        );

        if (readOnly || !onChange) {
          return (
            <span key={star} aria-hidden="true">
              {StarIcon}
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 bg-transparent border-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded"
            aria-label={`${star} sao`}
          >
            {StarIcon}
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
