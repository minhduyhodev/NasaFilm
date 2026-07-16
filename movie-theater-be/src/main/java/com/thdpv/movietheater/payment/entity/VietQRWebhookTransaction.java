package com.thdpv.movietheater.payment.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "vietqr_webhook_transaction", indexes = {
        @Index(name = "idx_vietqr_tx_ref_code", columnList = "reference_code", unique = true),
        @Index(name = "idx_vietqr_tx_content", columnList = "transfer_content"),
        @Index(name = "idx_vietqr_tx_status", columnList = "status")
})
public class VietQRWebhookTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_code", nullable = false, unique = true)
    private String referenceCode; // Bank transaction ref ID, e.g., FT21098492098402

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "transfer_content", nullable = false)
    private String transferContent; // Message transferred, e.g., NASAFILM 9F8D2B

    @Column(name = "sub_account")
    private String subAccount; // Sub account of receiver

    @Column(name = "gateway")
    private String gateway; // E.g., MBBank

    @Column(name = "transaction_date")
    private OffsetDateTime transactionDate;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "UNUSED"; // UNUSED | USED

    @Column(name = "used_by_booking_uuid")
    private UUID usedByBookingUuid;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public VietQRWebhookTransaction() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReferenceCode() {
        return referenceCode;
    }

    public void setReferenceCode(String referenceCode) {
        this.referenceCode = referenceCode;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getTransferContent() {
        return transferContent;
    }

    public void setTransferContent(String transferContent) {
        this.transferContent = transferContent;
    }

    public String getSubAccount() {
        return subAccount;
    }

    public void setSubAccount(String subAccount) {
        this.subAccount = subAccount;
    }

    public String getGateway() {
        return gateway;
    }

    public void setGateway(String gateway) {
        this.gateway = gateway;
    }

    public OffsetDateTime getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(OffsetDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UUID getUsedByBookingUuid() {
        return usedByBookingUuid;
    }

    public void setUsedByBookingUuid(UUID usedByBookingUuid) {
        this.usedByBookingUuid = usedByBookingUuid;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
