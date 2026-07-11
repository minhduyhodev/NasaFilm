package com.thdpv.movietheater.payment.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class WalletSummaryResponse {

    private BigDecimal balance;
    private String provider;
    private boolean mockMode;
    private BigDecimal minTopUp;
    private BigDecimal maxTopUp;
    private List<BigDecimal> quickAmounts = new ArrayList<>();
    private List<WalletTransactionResponse> recentTransactions;

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public boolean isMockMode() {
        return mockMode;
    }

    public void setMockMode(boolean mockMode) {
        this.mockMode = mockMode;
    }

    public BigDecimal getMinTopUp() {
        return minTopUp;
    }

    public void setMinTopUp(BigDecimal minTopUp) {
        this.minTopUp = minTopUp;
    }

    public BigDecimal getMaxTopUp() {
        return maxTopUp;
    }

    public void setMaxTopUp(BigDecimal maxTopUp) {
        this.maxTopUp = maxTopUp;
    }

    public List<BigDecimal> getQuickAmounts() {
        return quickAmounts;
    }

    public void setQuickAmounts(List<BigDecimal> quickAmounts) {
        this.quickAmounts = quickAmounts != null ? quickAmounts : new ArrayList<>();
    }

    public List<WalletTransactionResponse> getRecentTransactions() {
        return recentTransactions;
    }

    public void setRecentTransactions(List<WalletTransactionResponse> recentTransactions) {
        this.recentTransactions = recentTransactions;
    }
}
