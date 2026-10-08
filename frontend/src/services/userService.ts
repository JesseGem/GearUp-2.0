import { getAPI, get, post, put, del } from './api';

export const userService = {
  getMyProfile: async () => {
    const api = await getAPI();
    return await get(`${api.USER}/api/users/me`);
  },

  getAllMechanics: async () => {
    const api = await getAPI();
    return await get(`${api.USER}/api/users/mechanics`);
  },

  updateProfile: async (data: {
    name?: string;
    phone?: string;
    profileImage?: string;
    bio?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const api = await getAPI();
    return await put(`${api.USER}/api/users/me`, data);
  },

  getUserById: async (userId: number) => {
    const api = await getAPI();
    return await get(`${api.USER}/api/users/${userId}`);
  },

  getFavorites: async () => {
    const api = await getAPI();
    return await get(`${api.USER}/api/users/favorites`);
  },

  getFavoriteIds: async () => {
    const api = await getAPI();
    return await get(`${api.USER}/api/users/favorites/ids`);
  },

  addFavorite: async (mechanicId: number) => {
    const api = await getAPI();
    return await post(`${api.USER}/api/users/favorites/${mechanicId}`, {}, true);
  },

  removeFavorite: async (mechanicId: number) => {
    const api = await getAPI();
    return await del(`${api.USER}/api/users/favorites/${mechanicId}`);
  },
};