package com.thdpv.movietheater.preshow.enums;

public enum PreShowRitualStatus {
    PREPARE("Chuẩn bị nhiệm vụ"),
    SOON("Sắp cất cánh"),
    BOARDING("Lên máy bay"),
    SHOWING("Đang chiếu"),
    COMPLETE("Hoàn thành nhiệm vụ");

    private final String label;

    PreShowRitualStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
