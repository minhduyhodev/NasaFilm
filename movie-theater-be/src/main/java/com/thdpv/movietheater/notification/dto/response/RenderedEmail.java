package com.thdpv.movietheater.notification.dto.response;

public class RenderedEmail {

    private final String subject;
    private final String htmlBody;

    public RenderedEmail(String subject, String htmlBody) {
        this.subject = subject;
        this.htmlBody = htmlBody;
    }

    public String getSubject() {
        return subject;
    }

    public String getHtmlBody() {
        return htmlBody;
    }
}
