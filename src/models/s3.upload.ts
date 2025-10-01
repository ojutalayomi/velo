import path from "path";
import multer from "multer";
import multerS3 from "multer-s3";
// import { v4 as uuidv4 } from 'uuid';
import { S3Client } from "@aws-sdk/client-s3";

// Configure AWS SDK
const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

function timeFormatter1(time: string) {
  // console.log(time)
  // Split the input date into its components
  const [datePart, timePart] = time.split(", ");
  let [month, day, year] = datePart.split("/");
  const [hour, minute, second] = timePart.split(":");
  if (parseInt(day) < 10) {
    day = "0" + day;
  }
  if (parseInt(month) < 10) {
    month = "0" + month;
  }
  // Create a new Date object with the components
  const formattedDate = year + "/" + month + "/" + day;
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
