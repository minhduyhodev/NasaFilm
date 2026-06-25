package com.thdpv.movietheater.payment.dto;

import java.math.BigDecimal;
import java.util.List;

public class WalletSummaryResponse {

    private BigDecimal balance;
    private String provider;
    private boolean mockMode;
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

    public List<WalletTransactionResponse> getRecentTransactions() {
        return recentTransactions;
    }

    public void setRecentTransactions(List<WalletTransactionResponse> recentTransactions) {
        this.recentTransactions = recentTransactions;
    }
}
