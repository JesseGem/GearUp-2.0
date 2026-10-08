import { getAPI, get, post, put, del } from './api';

export const jobService = {
  createJob: async (data: {
    title: string;
    description: string;
    vehicleId: number;
    type: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    estimatedCost?: number;
    scheduledDate?: string;
    requestType?: 'GENERAL' | 'DIRECT';
    preferredMechanicId?: number;
  }) => {
    const api = await getAPI();
    return await post(`${api.JOB}/api/jobs`, data, true);
  },

  getMyJobsAsOwner: async () => {
    const api = await getAPI();
    return await get(`${api.JOB}/api/jobs/my/owner`);
  },

  getMyJobsAsMechanic: async () => {
    const api = await getAPI();
    return await get(`${api.JOB}/api/jobs/my/mechanic`);
  },

  getAvailableJobs: async () => {
    const api = await getAPI();
    return await get(`${api.JOB}/api/jobs/available`);
  },

  getJobById: async (jobId: number) => {
    const api = await getAPI();
    return await get(`${api.JOB}/api/jobs/${jobId}`);
  },

  acceptJob: async (jobId: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/accept`, {});
  },

  declineJob: async (jobId: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/decline`, {});
  },

  proposeChanges: async (jobId: number, data: { proposedCost?: number; proposedScheduledDate?: string; proposedNote?: string }) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/propose-changes`, data);
  },

  acceptCounterOffer: async (jobId: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/counter-offer/accept`, {});
  },

  rejectCounterOffer: async (jobId: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/counter-offer/reject`, {});
  },

  startJob: async (jobId: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/start`, {});
  },

  completeJob: async (jobId: number, finalCost: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/complete`, { finalCost });
  },

  updateFinalCost: async (jobId: number, finalCost: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/cost`, { finalCost });
  },

  cancelJob: async (jobId: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/cancel`, {});
  },

  proposeBid: async (jobId: number, data: { biddingCost: number; biddingNote?: string }) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/bid`, data);
  },

  acceptBid: async (jobId: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/bid/accept`, {});
  },

  declineBid: async (jobId: number) => {
    const api = await getAPI();
    return await put(`${api.JOB}/api/jobs/${jobId}/bid/decline`, {});
  },

  deleteJob: async (jobId: number) => {
    const api = await getAPI();
    return await del(`${api.JOB}/api/jobs/${jobId}`);
  },
};