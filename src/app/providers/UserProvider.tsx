import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { networkMonitor, NetworkStatus } from "@/lib/network";
import { UserData } from "@/lib/types/user";
import { delay } from "@/lib/utils";
import { fetchChats } from "@/redux/chatSlice";
import { useAppDispatch } from "@/redux/hooks";
import { RootState } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";

import { useSocket } from "./SocketProvider";

const CACHE_KEY = "userData";
const CACHE_TTL_MS = 60_000;
const MAX_RETRIES = 3;
const RATE_LIMIT_WAIT_MS = 30_000;
const DEBOUNCE_MS = 300;

interface UseUserReturn {
  userdata: UserData;
  loading: boolean;
  error: string | null;
  refetchUser: () => void;
}

type FetchOutcome =
  | { kind: "ok"; data: UserData }
  | { kind: "rate_limited" }
  | { kind: "login_required" };

const UserContext = createContext<UseUserReturn | undefined>(undefined);

/* ---------- helpers ---------- */

function readCachedUser(): UserData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Date.now() - parsed.timestamp < CACHE_TTL_MS ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCachedUser(data: UserData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Storage unavailable or full; caching is best-effort.
  }
}

async function requestUser(): Promise<FetchOutcome> {
  const response = await fetch("/api/getuser");
  const body = await response.json();

  if (response.ok) return { kind: "ok", data: body };
  if (body?.message === "Too many requests") return { kind: "rate_limited" };
  if (body?.message === "login") return { kind: "login_required" };
  throw new Error("Failed to fetch user data");
}

async function requestUserWithRetry(retries = MAX_RETRIES): Promise<FetchOutcome> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await requestUser();
    } catch (err) {
      if (attempt >= retries) throw err;
    }
  }
}

/* ---------- provider ---------- */

const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const socket = useSocket();
  const userdata = useSelector((state: RootState) => state.user.userdata);
  const { success } = useSelector((state: RootState) => state.signups);

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchedRef = useRef(false);

  useEffect(() => {
    setNetworkStatus(networkMonitor.getNetworkStatus());
  }, []);

  // One fetch attempt. Resolves to true when the caller should try again
  // (after a rate-limit wait), false otherwise.
  const loadUser = useCallback(async (): Promise<boolean> => {
    if (fetchedRef.current) {
      setLoading(false);
      return false;
    }

    const cached = readCachedUser();
    if (cached) {
      dispatch(setUserData(cached));
      setError(null);
      setLoading(false);
      fetchedRef.current = true;
      return false;
    }

    setLoading(true);
    let retryAfterRateLimit = false;

    try {
      const outcome = await requestUserWithRetry();

      switch (outcome.kind) {
        case "ok":
          dispatch(setUserData(outcome.data));
          writeCachedUser(outcome.data);
          setError(null);
          fetchedRef.current = true;
          break;

        case "rate_limited":
          // Block further fetches while we wait, then allow them again.
          fetchedRef.current = true;
          toast.error("User Data Is Loading", {
            description: "Please wait, your data is being fetched",
          });
          await delay(RATE_LIMIT_WAIT_MS);
          fetchedRef.current = false;
          retryAfterRateLimit = true;
          break;

        case "login_required":
          fetchedRef.current = true;
          toast.error("User needs to log in", {
            description:
              "We were not able to fetch your data. Please log in or create an account with us.",
            action: {
              label: "Log in",
              onClick: () => router.push("/accounts/login"),
            },
          });
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }

    return retryAfterRateLimit;
  }, [dispatch, router]);

  const fetchUser = useCallback(async () => {
    while (await loadUser()) {
      // Rate limited: loadUser already waited, so go again.
    }
  }, [loadUser]);

  const debouncedFetchUser = useMemo(
    () => debounce(fetchUser, DEBOUNCE_MS),
    [fetchUser]
  );

  const refetchUser = useCallback(() => {
    debouncedFetchUser();
  }, [debouncedFetchUser]);

  const hasUser = !!userdata._id;
  const isOnline = networkStatus?.online === true;

  // Initial user fetch
  useEffect(() => {
    if (!hasUser && !fetchedRef.current && isOnline) {
      refetchUser();
    } else {
      setLoading(false);
    }

    return () => {
      debouncedFetchUser.cancel();
    };
  }, [hasUser, isOnline, refetchUser, debouncedFetchUser]);

  // After a fresh login/signup (`success` set via dispatch(setSuccess(true))),
  // load the session's chats once.
  useEffect(() => {
    if (!success) return;

    (async () => {
      try {
        await fetchChats(dispatch);
      } catch (err) {
        console.error("Failed to fetch chats", err);
      }
    })();
  }, [success, dispatch]);

  // Register this user with the socket server after login/signup.
  // Kept separate from the chat fetch so socket changes don't refetch chats.
  useEffect(() => {
    if (!success || !socket || !userdata._id) return;

    const register = () => socket.emit("register", userdata._id);

    // "connect" won't fire again if the socket is already connected.
    if (socket.connected) register();
    socket.on("connect", register);

    return () => {
      socket.off("connect", register);
    };
  }, [success, socket, userdata._id]);

  const value = useMemo<UseUserReturn>(
    () => ({ userdata, loading, error, refetchUser }),
    [userdata, loading, error, refetchUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;

export const useUser = (): UseUserReturn => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};