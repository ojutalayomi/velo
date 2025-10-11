import crypto from "crypto";

import { clsx, type ClassValue } from "clsx";
import moment from "moment";
import { twMerge } from "tailwind-merge";

import { FileValidationConfig } from "./types/type";

export const generateRandomToken = (length: number) => {
  return crypto.randomBytes(length).toString("hex");
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function timeFormatter() {
  const time = new Date().toLocaleString();
  const [datePart] = time.split(", ");
  const [month, day, year] = datePart.split("/");
  const formattedDate = year + "/" + month + "/" + day;
  return formattedDate;
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const FILE_VALIDATION_CONFIG: FileValidationConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB per file
  maxTotalSize: 50 * 1024 * 1024, // 50MB total
  maxFiles: 5, // Maximum 5 files
  allowedFileTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
    "image/heic",
    "image/heif",
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/avi",
    "video/mpeg",
    "video/quicktime",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export const validateFile = (file: File, config: FileValidationConfig) => {
  // Check file size
  if (file.size > config.maxFileSize) {
    throw new Error(
      `File ${file.name} is too large. Maximum size is ${formatFileSize(config.maxFileSize)}`
    );
  }

  // Check file type
  if (!config.allowedFileTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed for ${file.name}`);
  }

  return true;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const generateObjectId = () => {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
  const machineId = Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0");
  const processId = Math.floor(Math.random() * 65535)
    .toString(16)
    .padStart(4, "0");
  const counter = Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0");

  return timestamp + machineId + processId + counter;
};

export const Time = (params: string | Date) => {
  const dateObj = new Date(params);

  // Define options for formatting the date
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };

  // Format the Date object to the desired format
  const formattedDateStr = dateObj.toLocaleString("en-US", options);

  // Print the result
  return formattedDateStr;
};
export function formatTime(Time: string) {
  const date = moment(Time, moment.ISO_8601);
  const formattedDate = date.format("MMM D, YYYY h:mm:ss A");
  return formattedDate;
}

export function updateLiveTime(
  response: "countdown" | "getlivetime" | "chat-time",
  Time: string
): string {
  const time = new Date(formatTime(Time)).getTime();
  const now = new Date().getTime();
  let distance: number;

  if (response === "countdown") {
    // Find the distance between now an the count down date
    distance = time - now;
  } else if (response === "getlivetime") {
    // Find the distance between now an the count up date
    distance = now - time;
  } else if (response === "chat-time") {
    // Add hh:mm am/pm
    const timeObj = new Date(Time);
    const formattedTime = timeObj.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return formattedTime;
  } else {
    throw new Error("Invalid response type. Expected 'countdown' or 'getlivetime' or 'chat-time'.");
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  let liveTime: string;

  if (days > 0) {
    const [date] = Time.split(",");
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

