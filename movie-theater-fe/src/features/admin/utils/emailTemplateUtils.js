export const SYSTEM_TEMPLATE_CODES = [
  'VOD_TICKET',
  'THEATER_TICKET',
  'OTP_REGISTER',
  'PASSWORD_RESET',
  'WALLET_TOP_UP',
  'WALLET_WITHDRAW',
];

/** Metadata for each merge field — shown in Vietnamese in the admin UI. */
export const TEMPLATE_FIELD_META = {
  CUSTOMER_NAME: { label: 'Tên khách hàng', group: 'Khách hàng', style: 'inline' },
  MOVIE_TITLE: { label: 'Tên phim', group: 'Phim', style: 'inline' },
  TICKET_CODE: { label: 'Mã vé (đơn)', group: 'Vé', style: 'highlight' },
  TICKET_CODES: { label: 'Danh sách mã vé', group: 'Vé', style: 'highlight' },
  BOOKING_UUID: { label: 'Mã booking', group: 'Đặt vé', style: 'inline' },
  ACTIVATION_URL: { label: 'Liên kết kích hoạt xem phim', group: 'Liên kết', style: 'link' },
  CINEMA_NAME: { label: 'Tên rạp', group: 'Suất chiếu', style: 'inline' },
  SHOWTIME: { label: 'Giờ chiếu', group: 'Suất chiếu', style: 'inline' },
  SEATS: { label: 'Ghế ngồi', group: 'Suất chiếu', style: 'inline' },
  COMBOS: { label: 'Combo đã mua', group: 'Suất chiếu', style: 'inline' },
  TOTAL_PRICE: { label: 'Tổng tiền', group: 'Thanh toán', style: 'inline' },
  PROFILE_URL: { label: 'Liên kết xem vé trong tài khoản', group: 'Liên kết', style: 'link' },
  BOARDING_URL: { label: 'Liên kết thẻ lên máy bay', group: 'Liên kết', style: 'link' },
  QR_CHECKIN_SECTION: { label: 'Khối mã QR check-in', group: 'Rạp', style: 'html_block' },
  OTP_CODE: { label: 'Mã OTP', group: 'Xác thực', style: 'highlight' },
  RESET_LINK: { label: 'Liên kết đặt lại mật khẩu', group: 'Xác thực', style: 'link' },
  AMOUNT: { label: 'Số tiền giao dịch', group: 'Ví', style: 'inline' },
  BALANCE_AFTER: { label: 'Số dư sau giao dịch', group: 'Ví', style: 'inline' },
  METHOD: { label: 'Phương thức', group: 'Ví', style: 'inline' },
  WALLET_URL: { label: 'Liên kết trang Ví NASA', group: 'Liên kết', style: 'link' },
};

export const TEMPLATE_VARIABLES = {
  VOD_TICKET: ['CUSTOMER_NAME', 'MOVIE_TITLE', 'TICKET_CODE', 'BOOKING_UUID', 'ACTIVATION_URL'],
  THEATER_TICKET: [
    'CUSTOMER_NAME', 'MOVIE_TITLE', 'TICKET_CODE', 'TICKET_CODES', 'CINEMA_NAME',
    'SHOWTIME', 'SEATS', 'COMBOS', 'TOTAL_PRICE', 'BOOKING_UUID', 'PROFILE_URL',
    'BOARDING_URL', 'QR_CHECKIN_SECTION',
  ],
  OTP_REGISTER: ['OTP_CODE'],
  PASSWORD_RESET: ['RESET_LINK'],
  WALLET_TOP_UP: ['CUSTOMER_NAME', 'AMOUNT', 'BALANCE_AFTER', 'METHOD', 'WALLET_URL'],
  WALLET_WITHDRAW: ['CUSTOMER_NAME', 'AMOUNT', 'BALANCE_AFTER', 'METHOD', 'WALLET_URL'],
};

export const BLOCK_PRESETS = {
  VOD_TICKET: {
    name: 'Vé xem phim online (VOD)',
    purpose: 'Gửi mã vé kích hoạt xem phim trực tuyến sau khi mua vé online',
    subject: 'NASA FILM - Mã vé xem phim online {{MOVIE_TITLE}}',
    blocks: [
      { type: 'paragraph', parts: [{ type: 'text', value: 'Xin chào ' }, { type: 'field', key: 'CUSTOMER_NAME' }] },
      {
        type: 'paragraph',
        parts: [
          { type: 'text', value: 'Cảm ơn bạn đã mua vé xem online phim ' },
          { type: 'field', key: 'MOVIE_TITLE' },
          { type: 'text', value: ' trên NASA Film.' },
        ],
      },
      { type: 'text', value: 'Mã vé kích hoạt:' },
      { type: 'field', key: 'TICKET_CODE' },
      { type: 'paragraph', parts: [{ type: 'text', value: 'Mã booking: ' }, { type: 'field', key: 'BOOKING_UUID' }] },
      { type: 'field', key: 'ACTIVATION_URL' },
      { type: 'text', value: 'Trân trọng,\nĐội ngũ NASA FILM' },
    ],
  },
  THEATER_TICKET: {
    name: 'Vé xem phim tại rạp',
    purpose: 'Gửi mã vé và thông tin suất chiếu sau khi đặt vé rạp thành công',
    subject: 'NASA FILM - Vé rạp {{MOVIE_TITLE}} - {{SHOWTIME}}',
    blocks: [
      { type: 'paragraph', parts: [{ type: 'text', value: 'Xin chào ' }, { type: 'field', key: 'CUSTOMER_NAME' }] },
      {
        type: 'paragraph',
        parts: [
          { type: 'text', value: 'Đặt vé thành công cho phim ' },
          { type: 'field', key: 'MOVIE_TITLE' },
          { type: 'text', value: '.' },
        ],
      },
      {
        type: 'info_table',
        rows: [
          { label: 'Rạp', key: 'CINEMA_NAME' },
          { label: 'Suất chiếu', key: 'SHOWTIME' },
          { label: 'Ghế', key: 'SEATS' },
          { label: 'Combo', key: 'COMBOS' },
          { label: 'Tổng tiền', key: 'TOTAL_PRICE' },
        ],
      },
      { type: 'field', key: 'QR_CHECKIN_SECTION' },
      { type: 'text', value: 'Mã vé (xuất trình tại quầy):' },
      { type: 'field', key: 'TICKET_CODES' },
      { type: 'paragraph', parts: [{ type: 'text', value: 'Mã booking: ' }, { type: 'field', key: 'BOOKING_UUID' }] },
      { type: 'field', key: 'BOARDING_URL' },
      { type: 'field', key: 'PROFILE_URL' },
      { type: 'text', value: 'Chúc bạn xem phim vui vẻ!\nĐội ngũ NASA FILM' },
    ],
  },
  OTP_REGISTER: {
    name: 'OTP đăng ký tài khoản',
    purpose: 'Gửi mã OTP khi người dùng đăng ký tài khoản mới',
    subject: 'NASA FILM - Mã xác thực đăng ký tài khoản',
    blocks: [
      { type: 'text', value: 'Mã OTP của bạn:' },
      { type: 'field', key: 'OTP_CODE' },
      { type: 'text', value: 'Mã có hiệu lực trong 5 phút.' },
    ],
  },
  PASSWORD_RESET: {
    name: 'Đặt lại mật khẩu',
    purpose: 'Gửi liên kết đặt lại mật khẩu khi người dùng quên mật khẩu',
    subject: 'NASA FILM - Yêu cầu đặt lại mật khẩu',
    blocks: [
      { type: 'text', value: 'Nhấn liên kết bên dưới để đặt lại mật khẩu:' },
      { type: 'field', key: 'RESET_LINK' },
      { type: 'text', value: 'Liên kết có hiệu lực trong thời gian giới hạn.' },
    ],
  },
  WALLET_TOP_UP: {
    name: 'Nạp tiền ví',
    purpose: 'Gửi thông báo khi khách hàng nạp tiền vào Ví NASA thành công',
    subject: 'NASA FILM - Nạp {{AMOUNT}} vào Ví NASA thành công',
    blocks: [
      { type: 'paragraph', parts: [{ type: 'text', value: 'Xin chào ' }, { type: 'field', key: 'CUSTOMER_NAME' }, { type: 'text', value: '!' }] },
      { type: 'text', value: 'Giao dịch nạp tiền vào Ví NASA của bạn đã thành công.' },
      {
        type: 'info_table',
        rows: [
          { label: 'Số tiền nạp', key: 'AMOUNT' },
          { label: 'Số dư sau giao dịch', key: 'BALANCE_AFTER' },
          { label: 'Phương thức', key: 'METHOD' },
        ],
      },
      { type: 'field', key: 'WALLET_URL' },
      { type: 'text', value: 'Trân trọng,\nĐội ngũ NASA FILM' },
    ],
  },
  WALLET_WITHDRAW: {
    name: 'Rút tiền ví',
    purpose: 'Gửi thông báo khi khách hàng rút tiền từ Ví NASA thành công',
    subject: 'NASA FILM - Rút {{AMOUNT}} từ Ví NASA thành công',
    blocks: [
      { type: 'paragraph', parts: [{ type: 'text', value: 'Xin chào ' }, { type: 'field', key: 'CUSTOMER_NAME' }, { type: 'text', value: '!' }] },
      { type: 'text', value: 'Giao dịch rút tiền từ Ví NASA của bạn đã thành công.' },
      {
        type: 'info_table',
        rows: [
          { label: 'Số tiền rút', key: 'AMOUNT' },
          { label: 'Số dư sau giao dịch', key: 'BALANCE_AFTER' },
          { label: 'Phương thức', key: 'METHOD' },
        ],
      },
      { type: 'field', key: 'WALLET_URL' },
      { type: 'text', value: 'Nếu bạn không thực hiện giao dịch này, vui lòng liên hệ hỗ trợ ngay.\nTrân trọng,\nĐội ngũ NASA FILM' },
    ],
  },
};

const SAMPLE_VALUES = {
  CUSTOMER_NAME: 'Nguyễn Văn A',
  MOVIE_TITLE: 'MINIONS & MONSTERS',
  TICKET_CODE: 'AB12CD34',
  TICKET_CODES: 'AB12CD34, EF56GH78',
  BOOKING_UUID: '9530651F-XXXX',
  ACTIVATION_URL: 'https://nasafilm.vn/profile',
  CINEMA_NAME: 'NASA Film - Quận 1',
  SHOWTIME: '19:30 | 24/06/2026',
  SEATS: 'A1, A2',
  COMBOS: 'Combo bắp nước x1',
  TOTAL_PRICE: '170.000đ',
  PROFILE_URL: 'https://nasafilm.vn/profile',
  BOARDING_URL: 'https://nasafilm.vn/boarding-pass',
  QR_CHECKIN_SECTION: '[Mã QR check-in]',
  OTP_CODE: '482916',
  RESET_LINK: 'https://nasafilm.vn/reset-password?token=xxx',
  AMOUNT: '200.000 đ',
  BALANCE_AFTER: '600.000 đ',
  METHOD: 'VietQR',
  WALLET_URL: 'https://nasafilm.vn/wallet',
};

const SUBTITLE_BY_CODE = {
  VOD_TICKET: 'Vé xem phim trực tuyến',
  THEATER_TICKET: 'Vé xem phim tại rạp',
  OTP_REGISTER: 'Xác thực tài khoản',
  PASSWORD_RESET: 'Đặt lại mật khẩu',
  WALLET_TOP_UP: 'Nạp tiền Ví NASA',
  WALLET_WITHDRAW: 'Rút tiền Ví NASA',
};

let blockIdCounter = 0;
export const createBlockId = () => `blk_${Date.now()}_${++blockIdCounter}`;

export function normalizeBlocks(blocks = []) {
  return (blocks || []).map((block) => ({
    ...block,
    id: block.id || createBlockId(),
    parts: block.parts?.map((part) => ({ ...part })),
    rows: block.rows?.map((row) => ({ ...row })),
  }));
}

export function createContentDocument(blocks = []) {
  return { version: 1, blocks: normalizeBlocks(blocks) };
}

export function parseContentDocument(raw) {
  if (!raw) return createContentDocument([]);
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return createContentDocument(parsed.blocks || []);
  } catch {
    return createContentDocument([]);
  }
}

export function serializeContentDocument(doc) {
  const payload = {
    version: 1,
    blocks: (doc?.blocks || []).map(({ id: _id, ...block }) => block),
  };
  return JSON.stringify(payload);
}

export function getFieldLabel(key) {
  return TEMPLATE_FIELD_META[key]?.label || key;
}

export function getFieldMeta(key) {
  return TEMPLATE_FIELD_META[key] || { label: key, group: 'Khác', style: 'inline' };
}

export function getVariableList(code) {
  return TEMPLATE_VARIABLES[code?.toUpperCase()] || [];
}

export function getFieldOptions(code) {
  const keys = getVariableList(code);
  if (keys.length) {
    return keys.map((key) => ({ key, ...getFieldMeta(key) }));
  }
  return Object.keys(TEMPLATE_FIELD_META).map((key) => ({ key, ...getFieldMeta(key) }));
}

export function isSystemTemplate(code) {
  return SYSTEM_TEMPLATE_CODES.includes(code?.toUpperCase());
}

export function getPresetBlocks(code) {
  const preset = BLOCK_PRESETS[code?.toUpperCase()];
  return preset ? normalizeBlocks(preset.blocks) : [createTextBlock('')];
}

export function createTextBlock(value = '') {
  return { id: createBlockId(), type: 'text', value };
}

export function createFieldBlock(key) {
  return { id: createBlockId(), type: 'field', key };
}

export function createParagraphBlock(parts = [{ type: 'text', value: '' }]) {
  return { id: createBlockId(), type: 'paragraph', parts };
}

export function createInfoTableBlock(rows = [{ label: 'Nhãn', key: getVariableList('THEATER_TICKET')[0] || 'CINEMA_NAME' }]) {
  return { id: createBlockId(), type: 'info_table', rows };
}

export function blocksToPlainText(blocks = []) {
  return blocks
    .map((block) => {
      if (block.type === 'text') return block.value || '';
      if (block.type === 'field') return `{{${block.key}}}`;
      if (block.type === 'paragraph') {
        return (block.parts || [])
          .map((part) => (part.type === 'field' ? `{{${part.key}}}` : part.value || ''))
          .join('');
      }
      if (block.type === 'info_table') {
        return (block.rows || []).map((row) => `${row.label}: {{${row.key}}}`).join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

export function textBodyToBlocks(textBody = '') {
  const blocks = (textBody || '')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (/^\{\{[A-Z0-9_]+\}\}$/.test(chunk)) {
        return createFieldBlock(chunk.replace(/^\{\{|\}\}$/g, ''));
      }
      if (chunk.includes('{{')) {
        const parts = [];
        const regex = /(\{\{[A-Z0-9_]+\}\})/g;
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(chunk)) !== null) {
          if (match.index > lastIndex) {
            parts.push({ type: 'text', value: chunk.slice(lastIndex, match.index) });
          }
          parts.push({ type: 'field', key: match[1].replace(/^\{\{|\}\}$/g, '') });
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < chunk.length) {
          parts.push({ type: 'text', value: chunk.slice(lastIndex) });
        }
        return parts.length ? createParagraphBlock(parts) : createTextBlock(chunk);
      }
      if (chunk.includes(':') && chunk.split('\n').every((line) => line.includes(':'))) {
        const rows = chunk.split('\n').map((line) => {
          const [label, ...rest] = line.split(':');
          const value = rest.join(':').trim();
          const key = value.replace(/^\{\{|\}\}$/g, '');
          return { label: label.trim(), key };
        });
        return createInfoTableBlock(rows);
      }
      return createTextBlock(chunk);
    });
  return normalizeBlocks(blocks);
}

export function resolveTemplateBlocks(template, code) {
  if (template?.contentBlocks) {
    const doc = parseContentDocument(template.contentBlocks);
    if (doc.blocks.length) return doc.blocks;
  }
  if (BLOCK_PRESETS[code?.toUpperCase()]) {
    return getPresetBlocks(code);
  }
  return textBodyToBlocks(htmlToEditableText(template?.htmlBody || ''));
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInline(text) {
  const parts = text.split(/(\{\{[A-Z0-9_]+\}\})/g);
  return parts
    .map((part) => (/^\{\{[A-Z0-9_]+\}\}$/.test(part) ? part : escapeHtml(part)))
    .join('');
}

const URL_VARIABLES = new Set(['ACTIVATION_URL', 'PROFILE_URL', 'RESET_LINK', 'BOARDING_URL']);

function blockToHtml(block) {
  if (block.type === 'text') {
    const trimmed = (block.value || '').trim();
    if (!trimmed) return '';
    return `<p style="margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.65;">${formatInline(trimmed).replace(/\n/g, '<br>')}</p>`;
  }

  if (block.type === 'paragraph') {
    const inner = (block.parts || [])
      .map((part) => (part.type === 'field' ? `{{${part.key}}}` : escapeHtml(part.value || '')))
      .join('');
    if (!inner.trim()) return '';
    return `<p style="margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.65;">${formatInline(inner)}</p>`;
  }

  if (block.type === 'field') {
    const key = block.key;
    const token = `{{${key}}}`;
    if (key === 'QR_CHECKIN_SECTION') return token;
    if (URL_VARIABLES.has(key)) {
      const label = key === 'RESET_LINK' ? 'Đặt lại mật khẩu'
        : key === 'ACTIVATION_URL' ? 'Kích hoạt xem phim'
        : key === 'PROFILE_URL' ? 'Xem vé trong tài khoản'
        : key === 'BOARDING_URL' ? 'Thẻ lên máy bay'
        : 'Mở liên kết';
      return `<div style="text-align:center;margin:28px 0;"><a href="${token}" style="display:inline-block;background:linear-gradient(135deg,#e50914,#9f060f);color:#fff;padding:13px 34px;text-decoration:none;border-radius:8px;font-weight:700;">${label}</a></div><p style="word-break:break-all;font-size:12px;color:#ff3b47;margin:0 0 14px;">${token}</p>`;
    }
    const fontSize = key === 'OTP_CODE' ? '36px' : '24px';
    const letterSpacing = key === 'OTP_CODE' ? '8px' : '2px';
    return `<div style="text-align:center;margin:24px 0;"><div style="display:inline-block;background:#1e293b;border:2px dashed #e50914;border-radius:12px;padding:14px 28px;"><span style="font-family:'Courier New',monospace;font-size:${fontSize};font-weight:800;letter-spacing:${letterSpacing};color:#ff3b47;">${token}</span></div></div>`;
  }

  if (block.type === 'info_table') {
    const rows = (block.rows || [])
      .map((row) => `<p style="margin:0 0 8px;"><strong style="color:#fff;">${escapeHtml(row.label)}:</strong> {{${row.key}}}</p>`)
      .join('');
    if (!rows) return '';
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#0f131f;border-radius:10px;border:1px solid #1e293b;"><tr><td style="padding:16px 18px;font-size:14px;">${rows}</td></tr></table>`;
  }

  return '';
}

export function buildEmailHtmlFromBlocks(blocks, code = '') {
  const subtitle = SUBTITLE_BY_CODE[code?.toUpperCase()] || 'Thông báo từ NASA FILM';
  const inner = (blocks || []).map(blockToHtml).filter(Boolean).join('\n');
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#0b0e14;color:#ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#121824;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#e50914,#9f060f);padding:28px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:2px;">NASA FILM</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(subtitle)}</p>
        </td></tr>
        <tr><td style="padding:36px 30px;line-height:1.65;font-size:15px;color:#cbd5e1;">
          ${inner}
        </td></tr>
        <tr><td style="background:#0f131f;padding:18px 30px;text-align:center;border-top:1px solid #1e293b;">
          <p style="margin:0;color:#64748b;font-size:12px;">&copy; 2026 NASA FILM. Email tự động, vui lòng không trả lời.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** @deprecated use buildEmailHtmlFromBlocks */
export function buildEmailHtml(textBody, code = '') {
  return buildEmailHtmlFromBlocks(textBodyToBlocks(textBody), code);
}

export function htmlToEditableText(html) {
  if (!html?.trim()) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const contentCell =
      doc.querySelector('td[style*="padding:36px"]') ||
      doc.querySelector('td[style*="padding: 36px"]') ||
      doc.body;
    return (contentCell.textContent || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch {
    return html.replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n\n').trim();
  }
}

export function applyTemplateVariables(text, variables = SAMPLE_VALUES) {
  if (!text) return '';
  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  });
  return result;
}

export function previewBlocks(blocks, variables = SAMPLE_VALUES) {
  return (blocks || [])
    .map((block) => {
      if (block.type === 'text') return applyTemplateVariables(block.value, variables);
      if (block.type === 'field') return applyTemplateVariables(`{{${block.key}}}`, variables);
      if (block.type === 'paragraph') {
        const text = (block.parts || [])
          .map((part) => (part.type === 'field' ? `{{${part.key}}}` : part.value || ''))
          .join('');
        return applyTemplateVariables(text, variables);
      }
      if (block.type === 'info_table') {
        return (block.rows || [])
          .map((row) => `${row.label}: ${applyTemplateVariables(`{{${row.key}}}`, variables)}`)
          .join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

export function previewBlockLabel(block) {
  if (block.type === 'field') return getFieldLabel(block.key);
  if (block.type === 'info_table') return 'Bảng thông tin suất chiếu';
  if (block.type === 'paragraph') {
    const fields = (block.parts || []).filter((p) => p.type === 'field').map((p) => getFieldLabel(p.key));
    return fields.length ? `Đoạn văn có ${fields.join(', ')}` : 'Đoạn văn';
  }
  return 'Đoạn văn bản';
}

/** @deprecated use BLOCK_PRESETS */
export const TEMPLATE_PRESETS = Object.fromEntries(
  Object.entries(BLOCK_PRESETS).map(([code, preset]) => [
    code,
    { ...preset, textBody: blocksToPlainText(preset.blocks) },
  ]),
);
