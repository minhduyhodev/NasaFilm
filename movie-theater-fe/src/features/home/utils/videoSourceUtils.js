const DIRECT_MEDIA_PATTERN =
  /\.(mp4|webm|ogg|ogv|mov|m4v|mkv|avi|wmv|flv|3gp|ts)(\?.*)?$/i;

const HLS_PATTERN = /\.(m3u8|m3u)(\?.*)?$/i;

const GOOGLE_DRIVE_HOST_PATTERN =
  /drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com/i;

const GOOGLE_DRIVE_FOLDER_PATTERN = /\/(?:drive\/)?folders\//i;

const extractGoogleDriveId = (url) => {
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch) return fileMatch[1];

  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (openMatch) return openMatch[1];

  const ucMatch = url.match(/\/uc\?(?:[^&#]*&)?id=([a-zA-Z0-9_-]+)/i);
  if (ucMatch) return ucMatch[1];

  return null;
};

const parseGoogleDriveSource = (url) => {
  if (!GOOGLE_DRIVE_HOST_PATTERN.test(url)) {
    return null;
  }

  if (GOOGLE_DRIVE_FOLDER_PATTERN.test(url)) {
    return {
      type: 'unsupported',
      provider: 'drive-folder',
      message:
        'Link thư mục Google Drive không thể phát trực tiếp. Vui lòng mở thư mục → chuột phải vào file video → "Chia sẻ" → "Sao chép liên kết" → dán link dạng drive.google.com/file/d/.../view',
    };
  }

  const driveId = extractGoogleDriveId(url);
  if (!driveId) {
    return {
      type: 'unsupported',
      provider: 'drive',
      message:
        'Link Google Drive không hợp lệ. Cần link file video (không phải thư mục), ví dụ: https://drive.google.com/file/d/ID/view?usp=sharing',
    };
  }

  return {
    type: 'direct',
    provider: 'drive',
    id: driveId,
    url: `https://drive.google.com/uc?export=download&id=${driveId}`,
    fallbackUrls: [
      `https://drive.google.com/uc?export=preview&id=${driveId}`,
      `https://drive.google.com/uc?id=${driveId}&export=download`,
    ],
  };
};

const extractYouTubeId = (url) => {
  if (!/youtube|youtu\.be/i.test(url)) return null;

  const watchMatch = url.match(/[?&]v=([^&#/?]+)/i);
  if (watchMatch) return watchMatch[1];

  const shortMatch = url.match(/youtu\.be\/([^/?#&]+)/i);
  if (shortMatch) return shortMatch[1];

  const embedMatch = url.match(/youtube\.com\/embed\/([^/?#&]+)/i);
  if (embedMatch) return embedMatch[1];

  const shortsMatch = url.match(/youtube\.com\/shorts\/([^/?#&]+)/i);
  if (shortsMatch) return shortsMatch[1];

  return null;
};

const extractVimeoId = (url) => {
  const match = url.match(/vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/|)(\d+)/i);
  return match?.[1] || null;
};

const extractDailymotionId = (url) => {
  const match = url.match(/(?:dailymotion\.com\/(?:video|embed\/video)|dai\.ly)\/([^/?#&]+)/i);
  return match?.[1] || null;
};

const extractStreamableId = (url) => {
  const match = url.match(/streamable\.com\/(?:e\/)?([a-z0-9]+)/i);
  return match?.[1] || null;
};

const extractMegaEmbed = (url) => {
  const match = url.match(/mega\.nz\/(?:file|embed)\/([^#/?]+)(?:#(.+))?/i);
  if (!match) return null;
  return {
    id: match[1],
    key: match[2] || '',
  };
};

const toDropboxDirectUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('dropbox.com')) return null;

    parsed.hostname = 'dl.dropboxusercontent.com';
    parsed.searchParams.set('raw', '1');
    parsed.searchParams.delete('dl');
    return parsed.toString();
  } catch {
    return url
      .replace(/^https?:\/\/(www\.)?dropbox\.com/i, 'https://dl.dropboxusercontent.com')
      .replace(/(\?|&)dl=[01]/gi, '')
      .concat(url.includes('?') ? '&raw=1' : '?raw=1');
  }
};

const toOneDriveEmbedUrl = (url) => {
  if (/\/embed/i.test(url)) return url;

  try {
    const parsed = new URL(url);
    const resid = parsed.searchParams.get('resid') || parsed.searchParams.get('id');
    const cid = parsed.searchParams.get('cid');
    const authkey = parsed.searchParams.get('authkey');

    if (resid && cid) {
      const embed = new URL('https://onedrive.live.com/embed');
      embed.searchParams.set('cid', cid);
      embed.searchParams.set('resid', resid);
      if (authkey) embed.searchParams.set('authkey', authkey);
      return embed.toString();
    }
  } catch {
    /* fall through */
  }

  return null;
};

const buildEmbedSource = (provider, embedUrl, id = null) => ({
  type: 'embed',
  provider,
  embedUrl,
  id,
});

const buildDirectSource = (provider, directUrl) => ({
  type: 'direct',
  provider,
  url: directUrl,
});

const buildHlsSource = (provider, streamUrl) => ({
  type: 'hls',
  provider,
  url: streamUrl,
});

export const VIDEO_PROVIDER_LABELS = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  drive: 'Google Drive',
  'drive-folder': 'Google Drive (thư mục)',
  dropbox: 'Dropbox',
  onedrive: 'OneDrive',
  dailymotion: 'Dailymotion',
  streamable: 'Streamable',
  mega: 'MEGA',
  facebook: 'Facebook',
  twitch: 'Twitch',
  bilibili: 'Bilibili',
  archive: 'Archive.org',
  direct: 'Video trực tiếp',
  hls: 'HLS Stream',
};

export const getVideoSource = (url) => {
  if (!url || typeof url !== 'string') {
    return { type: 'none', provider: 'none' };
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return { type: 'none', provider: 'none' };
  }

  const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

  const driveSource = parseGoogleDriveSource(normalized);
  if (driveSource) {
    return driveSource;
  }

  const youtubeId = extractYouTubeId(normalized);
  if (youtubeId) {
    return buildEmbedSource(
      'youtube',
      `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      youtubeId
    );
  }

  const vimeoId = extractVimeoId(normalized);
  if (vimeoId) {
    return buildEmbedSource(
      'vimeo',
      `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
      vimeoId
    );
  }

  if (/1drv\.ms/i.test(normalized)) {
    return buildEmbedSource('onedrive', normalized);
  }

  if (/dropbox\.com/i.test(normalized)) {
    const directUrl = toDropboxDirectUrl(normalized);
    if (directUrl) {
      return buildDirectSource('dropbox', directUrl);
    }
  }

  const oneDriveEmbed = toOneDriveEmbedUrl(normalized);
  if (oneDriveEmbed && /onedrive\.live\.com/i.test(normalized)) {
    return buildEmbedSource('onedrive', oneDriveEmbed);
  }

  const archiveMatch = normalized.match(/archive\.org\/(?:embed|details)\/([^/?#&]+)/i);
  if (archiveMatch) {
    return buildEmbedSource('archive', `https://archive.org/embed/${archiveMatch[1]}`, archiveMatch[1]);
  }

  const dailymotionId = extractDailymotionId(normalized);
  if (dailymotionId) {
    return buildEmbedSource(
      'dailymotion',
      `https://www.dailymotion.com/embed/video/${dailymotionId}?autoplay=1`,
      dailymotionId
    );
  }

  const streamableId = extractStreamableId(normalized);
  if (streamableId) {
    return buildEmbedSource('streamable', `https://streamable.com/e/${streamableId}`, streamableId);
  }

  const mega = extractMegaEmbed(normalized);
  if (mega) {
    return buildEmbedSource(
      'mega',
      `https://mega.nz/embed/${mega.id}${mega.key ? `#${mega.key}` : ''}`,
      mega.id
    );
  }

  const facebookMatch = normalized.match(
    /facebook\.com\/(?:[^/]+\/videos\/|watch\/\?v=|video\.php\?v=)(\d+)/i
  );
  if (facebookMatch) {
    return buildEmbedSource(
      'facebook',
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized)}&show_text=false&autoplay=true`,
      facebookMatch[1]
    );
  }

  const twitchMatch = normalized.match(
    /(?:twitch\.tv\/videos\/(\d+)|clips\.twitch\.tv\/([^/?#]+)|twitch\.tv\/[^/]+\/clip\/([^/?#]+))/i
  );
  if (twitchMatch) {
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    if (twitchMatch[1]) {
      return buildEmbedSource(
        'twitch',
        `https://player.twitch.tv/?video=${twitchMatch[1]}&parent=${parent}&autoplay=true`,
        twitchMatch[1]
      );
    }
    const clipId = twitchMatch[2] || twitchMatch[3];
    return buildEmbedSource(
      'twitch',
      `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parent}&autoplay=true`,
      clipId
    );
  }

  const bilibiliMatch = normalized.match(/bilibili\.com\/video\/(BV[\w]+|av\d+)/i);
  if (bilibiliMatch) {
    return buildEmbedSource(
      'bilibili',
      `https://player.bilibili.com/player.html?bvid=${bilibiliMatch[1]}&autoplay=1`,
      bilibiliMatch[1]
    );
  }

  if (HLS_PATTERN.test(normalized)) {
    return buildHlsSource('hls', normalized);
  }

  if (DIRECT_MEDIA_PATTERN.test(normalized)) {
    return buildDirectSource('direct', normalized);
  }

  if (/cloudinary\.com/i.test(normalized) && /\/video\/upload\//i.test(normalized)) {
    return buildDirectSource('direct', normalized);
  }

  if (/^https?:\/\//i.test(normalized)) {
    return buildDirectSource('direct', normalized);
  }

  return { type: 'none', provider: 'none' };
};

export const isEmbeddableSource = (source) => source?.type === 'embed';

export const isDirectSource = (source) => source?.type === 'direct';

export const isHlsSource = (source) => source?.type === 'hls';

export const isUnsupportedSource = (source) => source?.type === 'unsupported';

export const getPlaybackUrl = (source) => {
  if (!source) return '';
  if (source.type === 'embed') return source.embedUrl || '';
  return source.url || '';
};

export const getProviderLabel = (source) =>
  VIDEO_PROVIDER_LABELS[source?.provider] || 'Nguồn phát';
