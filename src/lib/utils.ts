import { clsx, type ClassValue } from "clsx"
import crypto from "crypto";
import { twMerge } from "tailwind-merge"
import { FileValidationConfig } from "./types/type";

export const generateRandomToken = (length: number) => {
  return crypto.randomBytes(length).toString('hex')
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function timeFormatter(){
  const time = new Date().toLocaleString()
  const [datePart, _] = time.split(', ');
  let [month, day, year] = datePart.split('/');
  const formattedDate = year + '/' + month + '/' + day;
  return formattedDate;

}
export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

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
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
};
export const validateFile = (file: File, config: FileValidationConfig) => {
    // Check file size
    if (file.size > config.maxFileSize) {
        throw new Error(`File ${file.name} is too large. Maximum size is ${formatFileSize(config.maxFileSize)}`);
    }

    // Check file type
    if (!config.allowedFileTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed for ${file.name}`);
    }

    return true;
};
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
