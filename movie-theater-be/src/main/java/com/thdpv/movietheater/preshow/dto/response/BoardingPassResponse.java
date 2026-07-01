package com.thdpv.movietheater.preshow.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class BoardingPassResponse {

    private UUID bookingUuid;
    private String missionCode;
    private String movieTitle;
    private String posterUrl;
    private String showtimeDisplay;
    private OffsetDateTime showtimeStart;
    private OffsetDateTime showtimeEnd;
    private String launchPadName;
    private String cinemaAddress;
    private String entranceNote;
    private String chamberLabel;
    private String crewAssignment;
    private List<String> seatLabels;
    private String primaryTicketCode;
    private String qrData;
    private String mapsUrl;
    private String boardingPassPath;
    private String ritualStatus;
    private String ritualStatusLabel;
    private String memberTierLabel;
    private String memberTierBadge;
    private boolean checkedIn;

    public UUID getBookingUuid() {
        return bookingUuid;
    }

    public void setBookingUuid(UUID bookingUuid) {
        this.bookingUuid = bookingUuid;
    }

    public String getMissionCode() {
        return missionCode;
    }

    public void setMissionCode(String missionCode) {
        this.missionCode = missionCode;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public String getPosterUrl() {
        return posterUrl;
    }

    public void setPosterUrl(String posterUrl) {
        this.posterUrl = posterUrl;
    }

    public String getShowtimeDisplay() {
        return showtimeDisplay;
    }

    public void setShowtimeDisplay(String showtimeDisplay) {
        this.showtimeDisplay = showtimeDisplay;
    }

    public OffsetDateTime getShowtimeStart() {
        return showtimeStart;
    }

    public void setShowtimeStart(OffsetDateTime showtimeStart) {
        this.showtimeStart = showtimeStart;
    }

    public OffsetDateTime getShowtimeEnd() {
        return showtimeEnd;
    }

    public void setShowtimeEnd(OffsetDateTime showtimeEnd) {
        this.showtimeEnd = showtimeEnd;
    }

    public String getLaunchPadName() {
        return launchPadName;
    }

    public void setLaunchPadName(String launchPadName) {
        this.launchPadName = launchPadName;
    }

    public String getCinemaAddress() {
        return cinemaAddress;
    }

    public void setCinemaAddress(String cinemaAddress) {
        this.cinemaAddress = cinemaAddress;
    }

    public String getEntranceNote() {
        return entranceNote;
    }

    public void setEntranceNote(String entranceNote) {
        this.entranceNote = entranceNote;
    }

    public String getChamberLabel() {
        return chamberLabel;
    }

    public void setChamberLabel(String chamberLabel) {
        this.chamberLabel = chamberLabel;
    }

    public String getCrewAssignment() {
        return crewAssignment;
    }

    public void setCrewAssignment(String crewAssignment) {
        this.crewAssignment = crewAssignment;
    }

    public List<String> getSeatLabels() {
        return seatLabels;
    }

    public void setSeatLabels(List<String> seatLabels) {
        this.seatLabels = seatLabels;
    }

    public String getPrimaryTicketCode() {
        return primaryTicketCode;
    }

    public void setPrimaryTicketCode(String primaryTicketCode) {
        this.primaryTicketCode = primaryTicketCode;
    }

    public String getQrData() {
        return qrData;
    }

    public void setQrData(String qrData) {
        this.qrData = qrData;
    }

    public String getMapsUrl() {
        return mapsUrl;
    }

    public void setMapsUrl(String mapsUrl) {
        this.mapsUrl = mapsUrl;
    }

    public String getBoardingPassPath() {
        return boardingPassPath;
    }

    public void setBoardingPassPath(String boardingPassPath) {
        this.boardingPassPath = boardingPassPath;
    }

    public String getRitualStatus() {
        return ritualStatus;
    }

    public void setRitualStatus(String ritualStatus) {
        this.ritualStatus = ritualStatus;
    }

    public String getRitualStatusLabel() {
        return ritualStatusLabel;
    }

    public void setRitualStatusLabel(String ritualStatusLabel) {
        this.ritualStatusLabel = ritualStatusLabel;
    }

    public String getMemberTierLabel() {
        return memberTierLabel;
    }

    public void setMemberTierLabel(String memberTierLabel) {
        this.memberTierLabel = memberTierLabel;
    }

    public String getMemberTierBadge() {
        return memberTierBadge;
    }

    public void setMemberTierBadge(String memberTierBadge) {
        this.memberTierBadge = memberTierBadge;
    }

    public boolean isCheckedIn() {
        return checkedIn;
    }

    public void setCheckedIn(boolean checkedIn) {
        this.checkedIn = checkedIn;
    }
}
