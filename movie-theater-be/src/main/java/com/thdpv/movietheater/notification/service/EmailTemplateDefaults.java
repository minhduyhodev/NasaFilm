package com.thdpv.movietheater.notification.service;

final class EmailTemplateDefaults {

    private EmailTemplateDefaults() {
    }

    static String vodTicketHtml() {
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#0b0e14;color:#ffffff;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;padding:40px 0;">
                    <tr><td align="center">
                      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#121824;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
                        <tr><td style="background:linear-gradient(135deg,#e50914,#9f060f);padding:28px;text-align:center;">
                          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:2px;">NASA FILM</h1>
                          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Vé xem phim trực tuyến</p>
                        </td></tr>
                        <tr><td style="padding:36px 30px;line-height:1.65;font-size:15px;color:#cbd5e1;">
                          <p style="margin-top:0;color:#fff;font-size:18px;font-weight:600;">Xin chào {{CUSTOMER_NAME}},</p>
                          <p>Cảm ơn bạn đã mua vé xem online phim <strong style="color:#fff;">{{MOVIE_TITLE}}</strong> trên NASA Film.</p>
                          <p>Dưới đây là mã vé dùng để kích hoạt quyền xem phim trên trang trực tuyến:</p>
                          <div style="text-align:center;margin:30px 0;">
                            <div style="display:inline-block;background:#1e293b;border:2px dashed #e50914;border-radius:12px;padding:14px 34px;">
                              <span style="font-family:'Courier New',monospace;font-size:30px;font-weight:800;letter-spacing:4px;color:#ff3b47;">{{TICKET_CODE}}</span>
                            </div>
                          </div>
                          <p>Bạn cũng có thể nhập mã booking: <span style="color:#ff3b47;font-family:monospace;">{{BOOKING_UUID}}</span></p>
                          <div style="text-align:center;margin:28px 0;">
                            <a href="{{ACTIVATION_URL}}" style="display:inline-block;background:linear-gradient(135deg,#e50914,#9f060f);color:#fff;padding:13px 34px;text-decoration:none;border-radius:8px;font-weight:700;">Kích hoạt xem phim</a>
                          </div>
                          <p style="margin-bottom:0;">Trân trọng,<br><strong style="color:#fff;">Đội ngũ NASA FILM</strong></p>
                        </td></tr>
                        <tr><td style="background:#0f131f;padding:18px 30px;text-align:center;border-top:1px solid #1e293b;">
                          <p style="margin:0;color:#64748b;font-size:12px;">&copy; 2026 NASA FILM. Email tự động, vui lòng không trả lời.</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """;
    }

    static String theaterTicketHtml() {
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#0b0e14;color:#ffffff;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;padding:40px 0;">
                    <tr><td align="center">
                      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#121824;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
                        <tr><td style="background:linear-gradient(135deg,#e50914,#9f060f);padding:28px;text-align:center;">
                          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:2px;">NASA FILM</h1>
                          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Vé xem phim tại rạp</p>
                        </td></tr>
                        <tr><td style="padding:36px 30px;line-height:1.65;font-size:15px;color:#cbd5e1;">
                          <p style="margin-top:0;color:#fff;font-size:18px;font-weight:600;">Xin chào {{CUSTOMER_NAME}},</p>
                          <p>Đặt vé thành công cho phim <strong style="color:#fff;">{{MOVIE_TITLE}}</strong>.</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#0f131f;border-radius:10px;border:1px solid #1e293b;">
                            <tr><td style="padding:16px 18px;font-size:14px;">
                              <p style="margin:0 0 8px;"><strong style="color:#fff;">Rạp:</strong> {{CINEMA_NAME}}</p>
                              <p style="margin:0 0 8px;"><strong style="color:#fff;">Suất chiếu:</strong> {{SHOWTIME}}</p>
                              <p style="margin:0 0 8px;"><strong style="color:#fff;">Ghế:</strong> {{SEATS}}</p>
                              <p style="margin:0 0 8px;"><strong style="color:#fff;">Combo:</strong> {{COMBOS}}</p>
                              <p style="margin:0;"><strong style="color:#fff;">Tổng tiền:</strong> {{TOTAL_PRICE}}</p>
                            </td></tr>
                          </table>
                          <p>Mã vé của bạn (xuất trình tại quầy hoặc cửa soát vé):</p>
                          <div style="text-align:center;margin:24px 0;">
                            <div style="display:inline-block;background:#1e293b;border:2px dashed #e50914;border-radius:12px;padding:14px 28px;">
                              <span style="font-family:'Courier New',monospace;font-size:22px;font-weight:800;letter-spacing:2px;color:#ff3b47;">{{TICKET_CODES}}</span>
                            </div>
                          </div>
                          <p>Mã booking: <span style="color:#ff3b47;font-family:monospace;">{{BOOKING_UUID}}</span></p>
                          <div style="text-align:center;margin:28px 0;">
                            <a href="{{PROFILE_URL}}" style="display:inline-block;background:linear-gradient(135deg,#e50914,#9f060f);color:#fff;padding:13px 34px;text-decoration:none;border-radius:8px;font-weight:700;">Xem vé trong tài khoản</a>
                          </div>
                          <p style="margin-bottom:0;">Chúc bạn xem phim vui vẻ!<br><strong style="color:#fff;">Đội ngũ NASA FILM</strong></p>
                        </td></tr>
                        <tr><td style="background:#0f131f;padding:18px 30px;text-align:center;border-top:1px solid #1e293b;">
                          <p style="margin:0;color:#64748b;font-size:12px;">&copy; 2026 NASA FILM. Email tự động, vui lòng không trả lời.</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """;
    }

    static String otpRegisterHtml() {
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#0b0e14;color:#ffffff;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;padding:40px 0;">
                    <tr><td align="center">
                      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#121824;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
                        <tr><td style="background:linear-gradient(135deg,#e50914,#9f060f);padding:30px;text-align:center;">
                          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:2px;">NASA FILM</h1>
                          <p style="margin:5px 0 0;color:rgba(255,255,255,0.8);font-size:14px;text-transform:uppercase;">Xác thực tài khoản</p>
                        </td></tr>
                        <tr><td style="padding:40px 30px;line-height:1.6;font-size:15px;color:#cbd5e1;">
                          <p>Mã OTP của bạn:</p>
                          <div style="text-align:center;margin:30px 0;">
                            <span style="font-family:monospace;font-size:36px;font-weight:800;letter-spacing:8px;color:#ff3b47;">{{OTP_CODE}}</span>
                          </div>
                          <p style="font-size:12px;color:#94a3b8;">Mã có hiệu lực trong 5 phút.</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """;
    }

    static String passwordResetHtml() {
        return """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#0b0e14;color:#ffffff;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;padding:40px 0;">
                    <tr><td align="center">
                      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#121824;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
                        <tr><td style="background:linear-gradient(135deg,#e50914,#9f060f);padding:30px;text-align:center;">
                          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;">NASA FILM</h1>
                          <p style="margin:5px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Đặt lại mật khẩu</p>
                        </td></tr>
                        <tr><td style="padding:40px 30px;line-height:1.6;font-size:15px;color:#cbd5e1;">
                          <p>Nhấn nút bên dưới để đặt lại mật khẩu:</p>
                          <div style="text-align:center;margin:30px 0;">
                            <a href="{{RESET_LINK}}" style="display:inline-block;background:linear-gradient(135deg,#e50914,#9f060f);color:#fff;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:600;">Đặt lại mật khẩu</a>
                          </div>
                          <p style="word-break:break-all;font-size:12px;color:#ff3b47;">{{RESET_LINK}}</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """;
    }
}
