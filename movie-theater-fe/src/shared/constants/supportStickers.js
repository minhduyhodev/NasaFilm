export const SUPPORT_STICKER_PREFIX = '[[sticker:';
export const SUPPORT_STICKER_SUFFIX = ']]';

/**
 * Nhãn cảm ơn — phải là file GIF thật trong public/support-stickers/
 * (Cursor chat chỉ lưu được 1 frame tĩnh khi paste, nên cần copy .gif gốc vào thư mục đó)
 */
export const SUPPORT_THANK_YOU_STICKER = {
  id: 'thank-you-nasa',
  label: 'Cảm ơn',
  caption: 'Cảm ơn bạn đã tin tưởng NASAFilm!',
  src: '/support-stickers/thank-you-nasa.gif',
  fallbackSrc: '/support-stickers/thank-you-nasa.jpg',
};

/** Chỉ một nhãn cảm ơn duy nhất */
export const SUPPORT_THANK_YOU_STICKERS = [SUPPORT_THANK_YOU_STICKER];

export const DEFAULT_THANK_YOU_STICKER_ID = SUPPORT_THANK_YOU_STICKER.id;

const STICKER_MESSAGE_PATTERN = /^\[\[sticker:([a-z0-9-]+)\]\]$/i;

export const encodeSupportStickerMessage = (stickerId = DEFAULT_THANK_YOU_STICKER_ID) =>
  `${SUPPORT_STICKER_PREFIX}${stickerId || DEFAULT_THANK_YOU_STICKER_ID}${SUPPORT_STICKER_SUFFIX}`;

export const parseSupportStickerMessage = (message = '') => {
  const trimmed = `${message || ''}`.trim();
  const match = trimmed.match(STICKER_MESSAGE_PATTERN);
  if (!match) {
    return { type: 'text', text: message };
  }

  return {
    type: 'sticker',
    stickerId: match[1],
    sticker: SUPPORT_THANK_YOU_STICKER,
    text: SUPPORT_THANK_YOU_STICKER.caption,
  };
};

export const getSupportStickerById = () => SUPPORT_THANK_YOU_STICKER;
