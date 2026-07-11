import { authService } from '../../features/auth/api/authService';

class WalletService {
  async getWallet() {
    try {
      const response = await authService.api.get('/api/wallet');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getTransactions() {
    try {
      const response = await authService.api.get('/api/wallet/transactions');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async topUp(amount) {
    try {
      const response = await authService.api.post('/api/wallet/top-up', { amount });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createTopUpIntent(amount) {
    try {
      const response = await authService.api.post('/api/wallet/top-up/intent', { amount });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async confirmTopUp(paymentIntentId) {
    try {
      const response = await authService.api.post('/api/wallet/top-up/confirm', { paymentIntentId });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async withdraw(amount) {
    try {
      const response = await authService.api.post('/api/wallet/withdraw', { amount });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const walletService = new WalletService();
export default walletService;
