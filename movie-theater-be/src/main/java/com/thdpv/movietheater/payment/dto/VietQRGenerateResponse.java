package com.thdpv.movietheater.payment.dto;

public class VietQRGenerateResponse {

    private String qrImageUrl;
    private String bankName;
    private String bankLogo;
    private String accountNo;
    private String accountName;
    private Long amount;
    private String transferContent;
    private String transferCode;

    public VietQRGenerateResponse() {
    }

    public VietQRGenerateResponse(String qrImageUrl, String bankName, String bankLogo,
            String accountNo, String accountName, Long amount, String transferContent, String transferCode) {
        this.qrImageUrl = qrImageUrl;
        this.bankName = bankName;
        this.bankLogo = bankLogo;
        this.accountNo = accountNo;
        this.accountName = accountName;
        this.amount = amount;
        this.transferContent = transferContent;
        this.transferCode = transferCode;
    }

    public String getTransferCode() {
        return transferCode;
    }

    public void setTransferCode(String transferCode) {
        this.transferCode = transferCode;
    }


    public String getQrImageUrl() {
        return qrImageUrl;
    }

    public void setQrImageUrl(String qrImageUrl) {
        this.qrImageUrl = qrImageUrl;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getBankLogo() {
        return bankLogo;
    }

    public void setBankLogo(String bankLogo) {
        this.bankLogo = bankLogo;
    }

    public String getAccountNo() {
        return accountNo;
    }

    public void setAccountNo(String accountNo) {
        this.accountNo = accountNo;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getTransferContent() {
        return transferContent;
    }

    public void setTransferContent(String transferContent) {
        this.transferContent = transferContent;
    }
}
