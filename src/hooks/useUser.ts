import { useState, useEffect, useCallback } from 'react';
import { setUserData, UserData } from '@/redux/userSlice';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash';
import { fetchChats } from '@/redux/chatSlice';

interface UseUserReturn {
    userdata: UserData;
    loading: boolean;
    error: string | null;
    refetchUser: () => void;
}

const debouncedFetchUser = debounce((callback) => {
    callback();
}, 300);

export const useUser = (): UseUserReturn => {
    const dispatch = useDispatch();
    const userdata = useSelector((state: any) => state.user.userdata );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // if (loading) console.log('loading...');

    const checkValuesNotEmpty = (obj: { [key: string]: string }) => {
        for (let key in obj) {
            if (obj[key] === '') {
                return false; // returns false if a property is empty
            }
        }
        return true; // returns true if all properties are not empty
    }


    const fetchUser = useCallback(async (retries = 3) => {
        const cachedData = localStorage.getItem('userData');
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (Date.now() - parsedData.timestamp < 60000) { // Cache for 1 minute
            dispatch(setUserData(parsedData.data));
            setLoading(false);
            setError(null)
            return;
            }
        }
        
        setLoading(true);
        try {
            const response = await fetch('/api/getuser');
            if (!response.ok) {
            throw new Error('Failed to fetch user data');
            }
            const fetchedUserData = await response.json();
            dispatch(setUserData(fetchedUserData));
            localStorage.setItem('userData', JSON.stringify({
            data: fetchedUserData,
            timestamp: Date.now()
            }));
            setError(null)
        } catch (err) {
          if (retries > 0) {
            console.log(`Retrying... (${retries} attempts left)`);
            return fetchUser(retries - 1);
          }
          setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
          setLoading(false);
        }
    }, [dispatch]);

    const handleFetchUser = useCallback(() => {
        debouncedFetchUser(fetchUser);
    }, [fetchUser]);

    useEffect(() => {
        if (!checkValuesNotEmpty(userdata)) {
            handleFetchUser();
        } else {
            setLoading(false);
        }
    }, [userdata, handleFetchUser]);


  return { userdata, loading, error, refetchUser: handleFetchUser  };
}