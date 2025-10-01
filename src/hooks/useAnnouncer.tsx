import { useEffect, useState } from "react";

type State = string[];

type Announcer = {
  status: boolean;
  message: string;
  action?: () => void;
};

const timeout = 10000;

export function useAnnouncer() {
  const [state, setState] = useState<State>([]);
  const [displayAnnouncement, setDisplayAnnouncement] = useState<Announcer>({
    status: !true,
    message: "This is a test. Please ignore",
  });

  useEffect(() => {
    if (displayAnnouncement.status) {
      setTimeout(() => {
        setDisplayAnnouncement({ status: false, message: "" });
      }, timeout);
    }
  }, [displayAnnouncement.status]);

  return {
    ...state,
    displayAnnouncement,
    setDisplayAnnouncement,
  };
}
