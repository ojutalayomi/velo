import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useRouter } from "next/navigation";

export const useNavigateWithHistory = () => {
  const history = useSelector((state: RootState) => state.route.history);
  const router = useRouter();

  const navigate = (path = "/home") => {
    if (history.length > 1) {
      // Navigate to the previous route in the history
      const previousRoute = history[history.length - 2];
      // router.push(previousRoute);
      router.back();
    } else {
      // If no history is available, navigate to the default path
      router.push(path);
    }
  };

  return navigate;
};
