import path from "path";

import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
// import { v4 as uuidv4 } from 'uuid';

// Configure AWS SDK
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

function timeFormatter1(time: string) {
  // console.log(time)
  // Split the input date into its components
  const [ddmmyyyy] = time.split(", ");
  let [dd, mm, yyyy] = ddmmyyyy.split("/");
  if (parseInt(dd) < 10) {
    dd = "0" + dd;
  }
  if (parseInt(mm) < 10) {
    mm = "0" + mm;
  }
  // Create a new Date object with the components
  const formattedDate = yyyy + "/" + mm + "/" + dd;
  // console.log(formattedDateString);
  return formattedDate;
}

// Function to upload a file to S3
export const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: function (
      req: any,
      file: { fieldname: string },
      cb: (arg0: null, arg1: string) => void
    ) {
      let bucketName = "appsave"; // Default bucket name
      if (file.fieldname === "displayPicture") {
        bucketName = "profile-display-images"; // Destination folder for displayPictures
      } else if (file.fieldname === "coverPhoto") {
        bucketName = "profile-banner-images"; // Destination folder for coverPhotos
      }
      cb(null, bucketName);
    },
    metadata: function (
      req: any,
      file: { fieldname: any },
      cb: (arg0: null, arg1: { fieldName: any }) => void
    ) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (
      req: any,
      file: { originalname: string },
      cb: (arg0: null, arg1: string) => void
    ) {
      const filename =
        timeFormatter1(new Date().toLocaleString()) +
        "/" +
        Math.round(Math.random() * 100000000000) +
        path.extname(file.originalname);
      cb(null, filename);
    },
  }),
});

// Function to upload a file to S3
export const postUpload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: "post-s",
    metadata: function (
      req: any,
      file: { fieldname: any },
      cb: (arg0: null, arg1: { fieldName: any }) => void
    ) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (
      req: any,
      file: { originalname: string },
      cb: (arg0: null, arg1: string) => void
    ) {
      const filename =
        timeFormatter1(new Date().toLocaleString()) +
        "/" +
        Math.round(Math.random() * 100000000000) +
        path.extname(file.originalname);
      cb(null, filename);
    },
  }),
});
