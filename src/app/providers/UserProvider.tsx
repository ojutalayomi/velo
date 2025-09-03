import { useState, useEffect, useCallback, useRef, createContext, ReactNode, useContext } from 'react';
import { setUserData } from '@/redux/userSlice';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/hooks';
import { networkMonitor, NetworkStatus } from '@/lib/network';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { delay } from '@/lib/utils';
import { UserData } from '@/lib/types/type';

interface UseUserReturn {
    userdata: UserData;
    loading: boolean;
    error: string | null;
    refetchUser: () => void;
}

const UserContext = createContext<UseUserReturn | undefined>(undefined)

const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const router = useRouter();
    const [status, setStatus] = useState<NetworkStatus>()
    const dispatch = useAppDispatch();
    const userdata = useSelector((state: RootState) => state.user.userdata);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const retriesRef = useRef(3);
    const fetchedSuccessfullyRef = useRef(false);
    const fetchUserRef = useRef<() => Promise<void>>(null);

    useEffect(() => {
        setStatus(networkMonitor.getNetworkStatus())
    }, [])

    const fetchUser = useCallback(async () => {
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
                    fetchedSuccessfullyRef.current = true;
                    toast({
                        title: 'User Data Is Loading',
                        description: `Please wait, your data is been fetched`,
                        variant: 'destructive'
                    });
                    await delay(30000);
                    fetchedSuccessfullyRef.current = false;
                } else if (data.message === 'login') {
                    fetchedSuccessfullyRef.current = true;
                    toast({
                        title: 'User needs to log in',
                        description: `We were not able to fetch your data. Please log in or create an account with us.`,
                        variant: 'destructive',
                        action: <Button onClick={() => router.push("/accounts/login")}> <User/> Log in</Button>
                    });
                }  else {
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
            if (retriesRef.current > 0) {
                retriesRef.current--
                return fetchUser();
            }
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    fetchUserRef.current = fetchUser;

    const debouncedFetchUser = useRef(
        debounce(() => fetchUserRef.current?.(), 300)
    ).current;

    const handleFetchUser = useCallback(() => {
        debouncedFetchUser();
    }, [debouncedFetchUser]);

    useEffect(() => {
        const hasValidUserData = !!userdata._id;

        if (!hasValidUserData && !fetchedSuccessfullyRef.current && status?.online === true) {
            handleFetchUser();
        } else {
            setLoading(false);
        }

        return () => {
            debouncedFetchUser.cancel();
        };
    }, [userdata, fetchedSuccessfullyRef.current, debouncedFetchUser, status]);

    return (
        <UserContext.Provider value={{ userdata, loading, error, refetchUser: handleFetchUser }}>
            {children}
        </UserContext.Provider>
    )
};

export default UserProvider

export const useUser = (): UseUserReturn => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}