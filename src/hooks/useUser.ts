import { useState, useEffect, useCallback } from 'react';
import { setUserData } from '@/redux/userSlice';
import { useDispatch, useSelector } from 'react-redux';

export function useUser() {
    const dispatch = useDispatch();
    const userdata = useSelector((state: any) => state.user.userdata);
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


    const fetchUser = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/getuser');
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            const fetchedUserData = await response.json();
            dispatch(setUserData(fetchedUserData));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [dispatch]);

    useEffect(() => {
        if (!checkValuesNotEmpty(userdata)) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [userdata, fetchUser]);


  return { userdata, loading, error, refetchUser: fetchUser  };
}