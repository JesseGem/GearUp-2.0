import { getAPI, get, post, put, del } from './api';

export const vehicleService = {
  addVehicle: async (data: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color?: string;
    description?: string;
    type?: string;
    lastServicedDate?: string;
    mileage?: number;
    insuranceExpiry?: string;
    roadworthyExpiry?: string;
    notes?: string;
  }) => {
    const api = await getAPI();
    return await post(`${api.VEHICLE}/api/vehicles`, data, true);
  },

  getMyVehicles: async () => {
    const api = await getAPI();
    return await get(`${api.VEHICLE}/api/vehicles/my`);
  },

  getVehicleById: async (vehicleId: number) => {
    const api = await getAPI();
    return await get(`${api.VEHICLE}/api/vehicles/${vehicleId}`);
  },

  updateVehicle: async (vehicleId: number, data: object) => {
    const api = await getAPI();
    return await put(`${api.VEHICLE}/api/vehicles/${vehicleId}`, data);
  },

  deleteVehicle: async (vehicleId: number) => {
    const api = await getAPI();
    return await del(`${api.VEHICLE}/api/vehicles/${vehicleId}`);
  },
};