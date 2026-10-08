import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAPI, post, removeToken, setToken } from './api';

export type AppRole = 'customer' | 'mechanic' | 'admin';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyRegistrationData {
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  code?: string;
}

const normalizeRole = (role?: string | null): AppRole => {
  const normalized = (role ?? '').toString().trim().toLowerCase();

  if (normalized === 'owner' || normalized === 'car_owner' || normalized === 'customer') return 'customer';
  if (normalized === 'mechanic') return 'mechanic';
  if (normalized === 'admin') return 'admin';

  return 'customer';
};

const normalizeUser = (payload: any) => {
  const user = payload?.user ?? payload ?? {};

  return {
    ...user,
    id: user.id ?? user.userId ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? null,
    role: normalizeRole(user.role),
    isActive: user.isActive ?? true,
  };
};

const normalizeAuthSession = (payload: any) => {
  const token = payload?.accessToken ?? payload?.token ?? null;
  const user = normalizeUser(payload);

  return {
    token,
    accessToken: token,
    user,
  };
};

const unsupportedFeature = (feature: string): never => {
  throw new Error(`${feature} is not available on the current backend.`);
};

export const authService = {
  register: async (data: RegisterData) => {
    const api = await getAPI();
    const response = await post(`${api.USER}/users`, {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      ...(data.phone ? { phone: data.phone } : {}),
    });

    return normalizeUser(response);
  },

  sendRegistrationCode: async (data: RegisterData | VerifyRegistrationData) => {
    if ('firstName' in data || 'lastName' in data || 'name' in data) {
      const payload = {
        firstName: data.firstName ?? (typeof (data as any).name === 'string' ? (data as any).name.split(' ')[0] || '' : ''),
        lastName: data.lastName ?? (typeof (data as any).name === 'string' ? (data as any).name.split(' ').slice(1).join(' ') || '' : ''),
        email: data.email,
        password: data.password,
        phone: (data as any).phone,
      } satisfies RegisterData;
      return authService.register(payload);
    }

    return authService.register(data as RegisterData);
  },

  verifyRegistration: async (data: VerifyRegistrationData) => {
    const payload: RegisterData = {
      firstName: data.firstName || (typeof data.name === 'string' ? data.name.split(' ')[0] || '' : ''),
      lastName: data.lastName || (typeof data.name === 'string' ? data.name.split(' ').slice(1).join(' ') || '' : ''),
      email: data.email,
      password: data.password,
      phone: data.phone,
    };

    return authService.register(payload);
  },

  forgotPassword: async (_email: string) => {
    unsupportedFeature('Password reset');
  },

  verifyResetCode: async (_email: string, _code: string) => {
    unsupportedFeature('Password reset verification');
  },

  resetPassword: async (_email: string, _code: string, _newPassword: string) => {
    unsupportedFeature('Password reset');
  },

  getDeletionRequestStatus: async () => false,

  sendAccountDeletionCode: async () => {
    unsupportedFeature('Account deletion verification');
  },

  verifyAccountDeletion: async (_code: string) => {
    unsupportedFeature('Account deletion verification');
  },

  cancelAccountDeletion: async () => {
    unsupportedFeature('Account deletion cancellation');
  },

  login: async (data: LoginData) => {
    const api = await getAPI();
    const response = await post(`${api.AUTH}/auth/login`, data, false);
    const session = normalizeAuthSession(response);

    if (session.token) {
      await setToken(session.token);
      await AsyncStorage.setItem('user', JSON.stringify(session.user));
    }

    return session;
  },

  logout: async () => {
    await removeToken();
    await AsyncStorage.removeItem('user');
  },

  getStoredUser: async () => {
    const user = await AsyncStorage.getItem('user');
    if (!user) return null;

    try {
      return normalizeUser(JSON.parse(user));
    } catch {
      return null;
    }
  },
};
