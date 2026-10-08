import { getAPI, get, post, put } from './api';

export const paymentService = {
  createPayment: async (data: {
    jobId: number;
    payeeId: number;
    amount: number;
    method: 'MOBILE_MONEY' | 'CASH' | 'BANK_TRANSFER';
    notes?: string;
  }) => {
    const api = await getAPI();
    return await post(`${api.PAYMENT}/api/payments`, data, true);
  },

  completePayment: async (paymentId: number) => {
    const api = await getAPI();
    return await put(`${api.PAYMENT}/api/payments/${paymentId}/complete`, {});
  },

  getPaymentByJob: async (jobId: number) => {
    const api = await getAPI();
    return await get(`${api.PAYMENT}/api/payments/job/${jobId}`);
  },

  getMyPaymentsAsPayer: async () => {
    const api = await getAPI();
    return await get(`${api.PAYMENT}/api/payments/my/payer`);
  },

  getMyPaymentsAsPayee: async () => {
    const api = await getAPI();
    return await get(`${api.PAYMENT}/api/payments/my/payee`);
  },
};