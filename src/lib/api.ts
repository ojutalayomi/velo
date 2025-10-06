import axios, { AxiosError } from 'axios';

import { networkMonitor } from '@/lib/network'

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_SOCKET_URL,
    headers: {
      'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    try {
        const networkStatus = networkMonitor.getNetworkStatus();
        if (!networkStatus?.online) {
            throw new Error('No internet connection');
        }
        return config;
    } catch {
        throw new Error('Network check failed');
    }
});
  
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);