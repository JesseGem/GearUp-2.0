import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEFAULT_IP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const IP_STORAGE_KEY = 'dev_base_ip';

const getDefaultHost = (): string => {
  if (Platform.OS === 'web') return 'localhost';
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
};

export const getBaseIP = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(IP_STORAGE_KEY);
    return stored || getDefaultHost();
  } catch {
    return getDefaultHost();
  }
};

export const saveBaseIP = async (ip: string): Promise<void> => {
  await AsyncStorage.setItem(IP_STORAGE_KEY, ip);
};

export const getBackendBaseUrl = async (): Promise<string> => {
  const ip = await getBaseIP();
  return `http://${ip}:3000`;
};

export const getAPI = async () => {
  const baseUrl = await getBackendBaseUrl();
  return {
    BASE_URL: baseUrl,
    AUTH: baseUrl,
    USER: baseUrl,
    VEHICLE: baseUrl,
    JOB: baseUrl,
    PAYMENT: baseUrl,
    REVIEW: baseUrl,
    PARTS: baseUrl,
  };
};

export const API = {
  BASE_URL: `http://${DEFAULT_IP}:3000`,
  AUTH: `http://${DEFAULT_IP}:3000`,
  USER: `http://${DEFAULT_IP}:3000`,
  VEHICLE: `http://${DEFAULT_IP}:3000`,
  JOB: `http://${DEFAULT_IP}:3000`,
  PAYMENT: `http://${DEFAULT_IP}:3000`,
  REVIEW: `http://${DEFAULT_IP}:3000`,
  PARTS: `http://${DEFAULT_IP}:3000`,
};

export const setToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync('gearup_token', token);
  await AsyncStorage.setItem('token', token);
};

export const getToken = async (): Promise<string | null> => {
  try {
    const secureToken = await SecureStore.getItemAsync('gearup_token');
    if (secureToken) return secureToken;
  } catch {}

  return await AsyncStorage.getItem('token');
};

export const removeToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('gearup_token');
  } catch {}
  await AsyncStorage.removeItem('token');
};

export const authHeaders = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const extractErrorMessage = (data: any, fallback = 'Request failed'): string => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === 'string') return first;
    if (first?.defaultMessage) return first.defaultMessage;
    if (first?.field && first?.defaultMessage) return `${first.field}: ${first.defaultMessage}`;
  }

  if (data.message) return data.message;
  if (data.detail) return data.detail;
  if (data.title) return data.title;
  if (data.error) return data.error;

  return fallback;
};

export const request = async <T = any>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  body?: object | null,
  requiresAuth = true,
): Promise<T> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, `${method} request failed`));
  }

  return data as T;
};

export const post = async <T = any>(url: string, body: object, requiresAuth = false): Promise<T> => {
  return request<T>('POST', url, body, requiresAuth);
};

export const get = async <T = any>(url: string, requiresAuth = true): Promise<T> => {
  return request<T>('GET', url, undefined, requiresAuth);
};

export const put = async <T = any>(url: string, body: object, requiresAuth = true): Promise<T> => {
  return request<T>('PUT', url, body, requiresAuth);
};

export const patch = async <T = any>(url: string, body?: object | null, requiresAuth = true): Promise<T> => {
  return request<T>('PATCH', url, body, requiresAuth);
};

export const del = async (url: string, requiresAuth = true): Promise<void> => {
  await request('DELETE', url, undefined, requiresAuth);
};
