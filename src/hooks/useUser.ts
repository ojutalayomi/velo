import { useState, useEffect, useCallback, useRef } from 'react';
import { setUserData, UserData } from '@/redux/userSlice';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash';
import { RootState } from '@/redux/store';

interface UseUserReturn {
    userdata: UserData;
    loading: boolean;
    error: string | null;
    refetchUser: () => void;
}

export const useUser = (): UseUserReturn => {
    const dispatch = useDispatch();
    const userdata = useSelector((state: RootState) => state.user.userdata);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fetchedSuccessfullyRef = useRef(false);
    const fetchUserRef = useRef<() => Promise<void>>(null);

    const fetchUser = useCallback(async (retries = 3) => {
        if (fetchedSuccessfullyRef.current) {
            setLoading(false);
            return;
        }

        const cachedData = localStorage.getItem('userData');
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (Date.now() - parsedData.timestamp < 60000) {
                dispatch(setUserData(parsedData.data));
                setLoading(false);
                setError(null);
                fetchedSuccessfullyRef.current = true;
                return;
            }
        }

        setLoading(true);

        try {
            const response = await fetch('/api/getuser');
            if (!response.ok) {
                const data = await response.json();
                if (data.message === 'Too many requests') {
                    throw new Error('Too many requests');
                } else if (data.message === 'login') {
                    setLoading(false);
                } else {
                    throw new Error('Failed to fetch user data');
                }
            }
            const fetchedUserData = await response.json();
            dispatch(setUserData(fetchedUserData));
            localStorage.setItem('userData', JSON.stringify({
                data: fetchedUserData,
                timestamp: Date.now()
            }));
            setError(null);
            fetchedSuccessfullyRef.current = true;
        } catch (err) {
            if (retries > 0) {
                return fetchUser(retries - 1);
            }
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [dispatch]);

    fetchUserRef.current = fetchUser;

    const debouncedFetchUser = useRef(
        debounce(() => fetchUserRef.current?.(), 300)
    ).current;

    const handleFetchUser = useCallback(() => {
        debouncedFetchUser();
    }, [debouncedFetchUser]);

    useEffect(() => {
        const hasValidUserData = !!userdata._id;

        if (!hasValidUserData && !fetchedSuccessfullyRef.current) {
            handleFetchUser();
        } else {
            setLoading(false);
        }

        return () => {
            debouncedFetchUser.cancel();
        };
    }, [userdata, handleFetchUser, debouncedFetchUser]);

    return { userdata, loading, error, refetchUser: handleFetchUser };
};