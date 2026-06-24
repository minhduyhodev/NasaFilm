export const SYSTEM_TEMPLATE_CODES = [
  'VOD_TICKET',
  'THEATER_TICKET',
  'OTP_REGISTER',
  'PASSWORD_RESET',
];

export const TEMPLATE_VARIABLES = {
  VOD_TICKET: ['CUSTOMER_NAME', 'MOVIE_TITLE', 'TICKET_CODE', 'BOOKING_UUID', 'ACTIVATION_URL'],
  THEATER_TICKET: [
    'CUSTOMER_NAME', 'MOVIE_TITLE', 'TICKET_CODE', 'TICKET_CODES', 'CINEMA_NAME',
    'SHOWTIME', 'SEATS', 'COMBOS', 'TOTAL_PRICE', 'BOOKING_UUID', 'PROFILE_URL',
  ],
  OTP_REGISTER: ['OTP_CODE'],
  PASSWORD_RESET: ['RESET_LINK'],
};

export const TEMPLATE_PRESETS = {
  VOD_TICKET: {
    name: 'Vé xem phim online (VOD)',
    purpose: 'Gửi mã vé kích hoạt xem phim trực tuyến sau khi mua vé online',
    subject: 'NASA FILM - Mã vé xem phim online {{MOVIE_TITLE}}',
    textBody: `Xin chào {{CUSTOMER_NAME}},

Cảm ơn bạn đã mua vé xem online phim {{MOVIE_TITLE}} trên NASA Film.

Mã vé kích hoạt:
{{TICKET_CODE}}

Mã booking: {{BOOKING_UUID}}

Nhấn liên kết để kích hoạt xem phim:
{{ACTIVATION_URL}}

Trân trọng,
Đội ngũ NASA FILM`,
  },
  THEATER_TICKET: {
    name: 'Vé xem phim tại rạp',
    purpose: 'Gửi mã vé và thông tin suất chiếu sau khi đặt vé rạp thành công',
    subject: 'NASA FILM - Vé rạp {{MOVIE_TITLE}} - {{SHOWTIME}}',
    textBody: `Xin chào {{CUSTOMER_NAME}},

Đặt vé thành công cho phim {{MOVIE_TITLE}}.

Rạp: {{CINEMA_NAME}}
Suất chiếu: {{SHOWTIME}}
Ghế: {{SEATS}}
Combo: {{COMBOS}}
Tổng tiền: {{TOTAL_PRICE}}

Mã vé (xuất trình tại quầy):
{{TICKET_CODES}}

Mã booking: {{BOOKING_UUID}}

Xem vé trong tài khoản:
{{PROFILE_URL}}

Chúc bạn xem phim vui vẻ!
Đội ngũ NASA FILM`,
  },
  OTP_REGISTER: {
    name: 'OTP đăng ký tài khoản',
    purpose: 'Gửi mã OTP khi người dùng đăng ký tài khoản mới',
    subject: 'NASA FILM - Mã xác thực đăng ký tài khoản',
    textBody: `Mã OTP của bạn:

{{OTP_CODE}}

Mã có hiệu lực trong 5 phút.`,
  },
  PASSWORD_RESET: {
    name: 'Đặt lại mật khẩu',
    purpose: 'Gửi liên kết đặt lại mật khẩu khi người dùng quên mật khẩu',
    subject: 'NASA FILM - Yêu cầu đặt lại mật khẩu',
    textBody: `Nhấn liên kết bên dưới để đặt lại mật khẩu:

{{RESET_LINK}}

Liên kết có hiệu lực trong thời gian giới hạn.`,
  },
};

const SUBTITLE_BY_CODE = {
  VOD_TICKET: 'Vé xem phim trực tuyến',
  THEATER_TICKET: 'Vé xem phim tại rạp',
  OTP_REGISTER: 'Xác thực tài khoản',
  PASSWORD_RESET: 'Đặt lại mật khẩu',
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
  OTP_CODE: '482916',
  RESET_LINK: 'https://nasafilm.vn/reset-password?token=xxx',
};

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
    .map((part) => {
      if (/^\{\{[A-Z0-9_]+\}\}$/.test(part)) return part;
      return escapeHtml(part);
    })
    .join('');
}

const URL_VARIABLES = new Set(['ACTIVATION_URL', 'PROFILE_URL', 'RESET_LINK']);

function isUrlVariableLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('http')) return true;
  const inner = trimmed.replace(/^\{\{|\}\}$/g, '');
  return URL_VARIABLES.has(inner);
}

function isHighlightVariableLine(line) {
  const trimmed = line.trim();
  return /^\{\{[A-Z0-9_]+\}\}$/.test(trimmed) && !isUrlVariableLine(trimmed);
}

function isUrlLine(line) {
  return isUrlVariableLine(line);
}

function blockToHtml(block) {
  const trimmed = block.trim();
  if (!trimmed) return '';

  if (isUrlLine(trimmed)) {
    const href = trimmed;
    const label = trimmed.includes('RESET_LINK') ? 'Đặt lại mật khẩu'
      : trimmed.includes('ACTIVATION_URL') ? 'Kích hoạt xem phim'
      : trimmed.includes('PROFILE_URL') ? 'Xem vé trong tài khoản'
      : 'Mở liên kết';
    return `<div style="text-align:center;margin:28px 0;"><a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#e50914,#9f060f);color:#fff;padding:13px 34px;text-decoration:none;border-radius:8px;font-weight:700;">${label}</a></div><p style="word-break:break-all;font-size:12px;color:#ff3b47;margin:0 0 14px;">${href}</p>`;
  }

  if (isHighlightVariableLine(trimmed)) {
    const isOtp = trimmed === '{{OTP_CODE}}';
    const fontSize = isOtp ? '36px' : '24px';
    const letterSpacing = isOtp ? '8px' : '2px';
    return `<div style="text-align:center;margin:24px 0;"><div style="display:inline-block;background:#1e293b;border:2px dashed #e50914;border-radius:12px;padding:14px 28px;"><span style="font-family:'Courier New',monospace;font-size:${fontSize};font-weight:800;letter-spacing:${letterSpacing};color:#ff3b47;">${trimmed}</span></div></div>`;
  }

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1 && lines.every((l) => l.includes(':'))) {
    const rows = lines
      .map((l) => `<p style="margin:0 0 8px;"><strong style="color:#fff;">${formatInline(l)}</strong></p>`)
      .join('');
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#0f131f;border-radius:10px;border:1px solid #1e293b;"><tr><td style="padding:16px 18px;font-size:14px;">${rows}</td></tr></table>`;
  }

  return `<p style="margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.65;">${formatInline(trimmed).replace(/\n/g, '<br>')}</p>`;
}

export function buildEmailHtml(textBody, code = '') {
  const subtitle = SUBTITLE_BY_CODE[code?.toUpperCase()] || 'Thông báo từ NASA FILM';
  const blocks = (textBody || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const inner = blocks.map(blockToHtml).join('\n');

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

export function htmlToEditableText(html) {
  if (!html?.trim()) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const contentCell =
      doc.querySelector('td[style*="padding:36px"]') ||
      doc.querySelector('td[style*="padding: 36px"]') ||
      doc.querySelector('td[style*="padding:40px"]') ||
      doc.body;

    const parts = [];
    contentCell.querySelectorAll('p, div, span, a, li').forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim();
      if (!text) return;
      if (tag === 'a' && el.getAttribute('href')?.startsWith('{{')) {
        parts.push(el.getAttribute('href'));
        return;
      }
      if (el.closest('table') && el.tagName === 'P' && el.parentElement?.tagName === 'TD') {
        parts.push(text);
      } else if (!el.querySelector('p, div, table') && tag !== 'span') {
        parts.push(text);
      } else if (tag === 'span' && /^\{\{[A-Z0-9_]+\}\}$/.test(text) && el.closest('div[style*="text-align:center"]')) {
        parts.push(text);
      }
    });

    const unique = [];
    const seen = new Set();
    parts.forEach((p) => {
      const key = p.replace(/\s+/g, ' ');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    });

    if (unique.length > 0) {
      return unique.join('\n\n');
    }

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

export function getVariableList(code) {
  return TEMPLATE_VARIABLES[code?.toUpperCase()] || [];
}

export function isSystemTemplate(code) {
  return SYSTEM_TEMPLATE_CODES.includes(code?.toUpperCase());
}
