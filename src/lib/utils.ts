import { clsx, type ClassValue } from "clsx"
import crypto from "crypto";
import { twMerge } from "tailwind-merge"

const generateRandomToken = (length: number) => {
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