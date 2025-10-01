import { PostSchema } from "@/lib/types/type";
import moment from "moment";

export interface Post {
  post: PostSchema;
  message: string;
}

export interface Comments {
  comments: PostSchema[];
  message: string;
}

export interface PostProps {
  postData: PostSchema;
}

export function formatNo(no: number) {
  if (no >= 1000000) {
    return (no / 1000000).toFixed(1) + "M";
  } else if (no >= 1000) {
    return (no / 1000).toFixed(1) + "K";
  } else {
    return no;
  }
}

export function timeFormatter(Time: string, year = true, hour = true) {
  const date = moment(Time, moment.ISO_8601);
  const formattedDate = date.format(
    "MMM D" + (year ? ", YYYY" : "") + (hour ? ",  h:mm:ss A" : "")
  );
  return formattedDate;
}

// Function to update the countdown
export function updateLiveTime(response: "countdown" | "getlivetime", Time: string): string {
  const formattedDate: string = timeFormatter(Time);

  const time = new Date(formattedDate).getTime();
  const now = new Date().getTime();
  let distance: number;

  if (response === "countdown") {
    // Find the distance between now an the count down date
    distance = time - now;
  } else if (response === "getlivetime") {
    // Find the distance between now an the count up date
    distance = now - time;
  } else {
    throw new Error("Invalid response type. Expected 'countdown' or 'getlivetime'.");
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  let liveTime: string;
  /*
  if (years > 0) {
    liveTime = years + (years === 1 ? " yr" : " yrs");
  } else if (months > 0) {
    liveTime = months + (months === 1 ? " month" : " months");
  } else if (weeks > 0) {
    liveTime = weeks + (weeks === 1 ? " week" : " weeks");
  } else if (days > 0) {
    liveTime = days + (days === 1 ? " day" : " days");
  } else if (hours > 0) {
    liveTime = hours + (hours === 1 ? " hr" : " hrs");
  } else if (minutes > 0) {
    liveTime = minutes + (minutes === 1 ? " min" : " mins");
  } else {
    liveTime = seconds + (seconds === 1 ? " sec" : " secs");
  }*/
  if (days > 0) {
    const [date /*,time*/] = formattedDate.split(",");
    liveTime = date;
  } else if (hours > 0) {
    liveTime = hours + (hours === 1 ? " hr" : " hrs");
  } else if (minutes > 0) {
    liveTime = minutes + (minutes === 1 ? " min" : " mins");
  } else {
    liveTime = seconds + (seconds === 1 ? " sec" : " secs");
  }
  return liveTime;
}
