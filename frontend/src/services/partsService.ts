import { getAPI, get, post, put, del } from './api';

export const partsService = {
  createListing: async (data: {
    name: string;
    description: string;
    price: number;
    brand?: string;
    carMake?: string;
    carModel?: string;
    condition?: string;
    imageUrl?: string;
  }) => {
    const api = await getAPI();
    return await post(`${api.PARTS}/api/parts`, data, true);
  },

  uploadImage: async (fileUri: string): Promise<string> => {
    const api = await getAPI();
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('file', { uri: fileUri, name: filename, type } as any);

    const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('token');
    const response = await fetch(`${api.PARTS}/api/parts/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      throw new Error(data?.message || text || 'Image upload failed');
    }
    if (!data?.imageUrl) {
      throw new Error('Upload succeeded but no image URL was returned');
    }
    return `${api.PARTS}${data.imageUrl}`;
  },

  getAvailableParts: async () => {
    const api = await getAPI();
    return await get(`${api.PARTS}/api/parts/available`, false);
  },

  getMyListings: async () => {
    const api = await getAPI();
    return await get(`${api.PARTS}/api/parts/my`);
  },

  searchByName: async (name: string) => {
    const api = await getAPI();
    return await get(`${api.PARTS}/api/parts/search?name=${name}`, false);
  },

  searchByCarMake: async (carMake: string) => {
    const api = await getAPI();
    return await get(`${api.PARTS}/api/parts/search?carMake=${carMake}`, false);
  },

  getPartById: async (partId: number) => {
    const api = await getAPI();
    return await get(`${api.PARTS}/api/parts/${partId}`, false);
  },

  updateListing: async (partId: number, data: object) => {
    const api = await getAPI();
    return await put(`${api.PARTS}/api/parts/${partId}`, data);
  },

  markAsSold: async (partId: number) => {
    const api = await getAPI();
    return await put(`${api.PARTS}/api/parts/${partId}/sold`, {});
  },

  deleteListing: async (partId: number) => {
    const api = await getAPI();
    return await del(`${api.PARTS}/api/parts/${partId}`);
  },

  createOrder: async (partId: number) => {
    const api = await getAPI();
    return await post(`${api.PARTS}/api/parts/${partId}/order`, {}, true);
  },

  getMyOrders: async () => {
    const api = await getAPI();
    return await get(`${api.PARTS}/api/parts/orders/my`);
  },
  getOrdersForPart: async (partId: number) => {
    const api = await getAPI();
    return await get(`${api.PARTS}/api/parts/${partId}/orders`);
  },
  getOrderById: async (orderId: number) => {
    const api = await getAPI();
    return await get(`${api.PARTS}/api/parts/orders/${orderId}`, false);
  },
  acceptOrder: async (orderId: number) => {
    const api = await getAPI();
    return await put(`${api.PARTS}/api/parts/orders/${orderId}/accept`, {});
  },
  declineOrder: async (orderId: number) => {
    const api = await getAPI();
    return await put(`${api.PARTS}/api/parts/orders/${orderId}/decline`, {});
  },
  cancelOrder: async (orderId: number) => {
    const api = await getAPI();
    return await put(`${api.PARTS}/api/parts/orders/${orderId}/cancel`, {});
  },
  completeOrder: async (orderId: number) => {
    const api = await getAPI();
    return await put(`${api.PARTS}/api/parts/orders/${orderId}/complete`, {});
  },
  proposePartPrice: async (orderId: number, proposedPrice: number) => {
    const api = await getAPI();
    return await put(`${api.PARTS}/api/parts/orders/${orderId}/propose-price`, { proposedPrice });
  },
  acceptProposedPartPrice: async (orderId: number) => {
    const api = await getAPI();
    return await put(`${api.PARTS}/api/parts/orders/${orderId}/accept-price`, {});
  },
  rejectProposedPartPrice: async (orderId: number) => {
    const api = await getAPI();
    return await put(`${api.PARTS}/api/parts/orders/${orderId}/reject-price`, {});
  },
};