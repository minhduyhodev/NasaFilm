package com.thdpv.movietheater.notification.service;

final class EmailTemplateBlockPresets {

    private EmailTemplateBlockPresets() {
    }

    static String vodTicketBlocks() {
        return """
                {"version":1,"blocks":[
                  {"type":"paragraph","parts":[
                    {"type":"text","value":"Xin chào "},
                    {"type":"field","key":"CUSTOMER_NAME"}
                  ]},
                  {"type":"paragraph","parts":[
                    {"type":"text","value":"Cảm ơn bạn đã mua vé xem online phim "},
                    {"type":"field","key":"MOVIE_TITLE"},
                    {"type":"text","value":" trên NASA Film."}
                  ]},
                  {"type":"text","value":"Mã vé kích hoạt:"},
                  {"type":"field","key":"TICKET_CODE"},
                  {"type":"paragraph","parts":[
                    {"type":"text","value":"Mã booking: "},
                    {"type":"field","key":"BOOKING_UUID"}
                  ]},
                  {"type":"field","key":"ACTIVATION_URL"},
                  {"type":"text","value":"Trân trọng,\\nĐội ngũ NASA FILM"}
                ]}
                """;
    }

    static String theaterTicketBlocks() {
        return """
                {"version":1,"blocks":[
                  {"type":"paragraph","parts":[
                    {"type":"text","value":"Xin chào "},
                    {"type":"field","key":"CUSTOMER_NAME"}
                  ]},
                  {"type":"paragraph","parts":[
                    {"type":"text","value":"Đặt vé thành công cho phim "},
                    {"type":"field","key":"MOVIE_TITLE"},
                    {"type":"text","value":"."}
                  ]},
                  {"type":"info_table","rows":[
                    {"label":"Rạp","key":"CINEMA_NAME"},
                    {"label":"Suất chiếu","key":"SHOWTIME"},
                    {"label":"Ghế","key":"SEATS"},
                    {"label":"Combo","key":"COMBOS"},
                    {"label":"Tổng tiền","key":"TOTAL_PRICE"}
                  ]},
                  {"type":"field","key":"QR_CHECKIN_SECTION"},
                  {"type":"text","value":"Mã vé (xuất trình tại quầy):"},
                  {"type":"field","key":"TICKET_CODES"},
                  {"type":"paragraph","parts":[
                    {"type":"text","value":"Mã booking: "},
                    {"type":"field","key":"BOOKING_UUID"}
                  ]},
                  {"type":"field","key":"BOARDING_URL"},
                  {"type":"field","key":"PROFILE_URL"},
                  {"type":"text","value":"Chúc bạn xem phim vui vẻ!\\nĐội ngũ NASA FILM"}
                ]}
                """;
    }

    static String otpRegisterBlocks() {
        return """
                {"version":1,"blocks":[
                  {"type":"text","value":"Mã OTP của bạn:"},
                  {"type":"field","key":"OTP_CODE"},
                  {"type":"text","value":"Mã có hiệu lực trong 5 phút."}
                ]}
                """;
    }

    static String passwordResetBlocks() {
        return """
                {"version":1,"blocks":[
                  {"type":"text","value":"Nhấn liên kết bên dưới để đặt lại mật khẩu:"},
                  {"type":"field","key":"RESET_LINK"},
                  {"type":"text","value":"Liên kết có hiệu lực trong thời gian giới hạn."}
                ]}
                """;
    }
}
