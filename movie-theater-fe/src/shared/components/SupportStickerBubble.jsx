import React, { useState } from 'react';
import { parseSupportStickerMessage } from '../constants/supportStickers';
import './SupportStickerBubble.css';

const SupportStickerBubble = ({ message, compact = false, showCaption = true }) => {
  const parsed = parseSupportStickerMessage(message);
  const [useFallback, setUseFallback] = useState(false);

  if (parsed.type !== 'sticker' || !parsed.sticker) {
    return <span>{message}</span>;
  }

  const { sticker, text } = parsed;
  const imageSrc = useFallback && sticker.fallbackSrc ? sticker.fallbackSrc : sticker.src;

  return (
    <div className={`support-sticker-bubble ${compact ? 'support-sticker-bubble--compact' : ''}`.trim()}>
      <img
        src={imageSrc}
        alt={sticker.label}
        className="support-sticker-bubble__image"
        onError={() => {
          if (!useFallback && sticker.fallbackSrc) {
            setUseFallback(true);
          }
        }}
      />
      {showCaption ? (
        <p className="support-sticker-bubble__caption">{text}</p>
      ) : null}
    </div>
  );
};

export default SupportStickerBubble;
