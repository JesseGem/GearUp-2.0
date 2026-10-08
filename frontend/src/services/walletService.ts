import { getAPI, get, post, put } from './api';

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'JOB_PAYMENT_SENT' | 'JOB_PAYMENT_RECEIVED';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type AccountType = 'MOBILE_MONEY' | 'BANK';

export interface WalletDto {
  id: number;
  userId: number;
  balance: number;
}

export interface WalletTransactionDto {
  id: number;
  walletId: number;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  paystackReference: string | null;
  jobId: number | null;
  paymentId: number | null;
  status: TransactionStatus;
  description: string | null;
  createdAt: string;
}

export interface BankAccountDto {
  id: number;
  userId: number;
  accountType: AccountType;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt: string;
}

export const walletService = {
  getWallet: async (): Promise<WalletDto> => {
    const api = await getAPI();
    return await get(`${api.PAYMENT}/api/wallet/me`);
  },

  // Called after a Paystack checkout completes on the frontend — reference must
  // be independently verified by the backend before the wallet is credited.
  verifyDeposit: async (reference: string, amount: number): Promise<WalletDto> => {
    const api = await getAPI();
    return await post(`${api.PAYMENT}/api/wallet/deposit/verify`, { reference, amount }, true);
  },

  getTransactions: async (): Promise<WalletTransactionDto[]> => {
    const api = await getAPI();
    return await get(`${api.PAYMENT}/api/wallet/transactions`);
  },

  saveBankAccount: async (data: {
    accountType: AccountType;
    bankCode: string;
    bankName: string;
    accountNumber: string;
  }): Promise<BankAccountDto> => {
    const api = await getAPI();
    return await post(`${api.PAYMENT}/api/wallet/bank-account`, data, true);
  },

  // Returns null if no bank account has been saved yet (204/empty body case handled by parseResponse in api.ts)
  getBankAccount: async (): Promise<BankAccountDto | null> => {
    const api = await getAPI();
    return await get(`${api.PAYMENT}/api/wallet/bank-account`);
  },

  withdraw: async (amount: number): Promise<WalletTransactionDto> => {
    const api = await getAPI();
    return await post(`${api.PAYMENT}/api/wallet/withdraw`, { amount }, true);
  },
};