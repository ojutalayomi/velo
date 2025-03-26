import { clsx, type ClassValue } from "clsx"
import crypto from "crypto";
import { twMerge } from "tailwind-merge"

export const generateRandomToken = (length: number) => {
  return crypto.randomBytes(length).toString('hex')
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
