import { getAPI, get, post } from './api';

export const reviewService = {
  createReview: async (data: {
    jobId: number;
    revieweeId: number;
    rating: number;
    comment?: string;
  }) => {
    const api = await getAPI();
    return await post(`${api.REVIEW}/api/reviews`, data, true);
  },

  getReviewsForUser: async (userId: number) => {
    const api = await getAPI();
    return await get(`${api.REVIEW}/api/reviews/user/${userId}`);
  },

  getMyReviews: async () => {
    const api = await getAPI();
    return await get(`${api.REVIEW}/api/reviews/my`);
  },

  getAverageRating: async (userId: number) => {
    const api = await getAPI();
    return await get(`${api.REVIEW}/api/reviews/rating/${userId}`);
  },
};