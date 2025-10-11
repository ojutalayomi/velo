import axios, { AxiosError } from 'axios';

import { networkMonitor } from '@/lib/network'

const createApi = (url?: string) => {
    const instance = axios.create({
        baseURL: url || process.env.NEXT_PUBLIC_SOCKET_URL,
        headers: {
            'Content-Type': 'application/json',
        },
        withCredentials: true,
    });

    instance.interceptors.request.use(async (config) => {
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

    instance.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => Promise.reject(error)
    );
    return instance;
};

export const axiosApi = Object.assign(createApi, createApi());