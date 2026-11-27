import { BUCKETNAME, S3UploadBody, s3ObjectUrl } from "@/lib/types/s3";

/** Uploads a wallpaper image to our storage and returns its public link. */
export async function uploadWallpaper(file: File): Promise<string> {
  const presign = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: S3UploadBody({ filename: file.name, contentType: file.type, bucketName: BUCKETNAME.ARTICLE }),
  });
  if (!presign.ok) throw new Error("Couldn't prepare the upload. Try again.");
  const { url, fields } = await presign.json();
  const form = new FormData();
  Object.keys(fields).forEach((key) => form.append(key, fields[key]));
  form.append("file", file);
  const upload = await fetch(url, { method: "POST", body: form });
  if (!upload.ok) throw new Error("Couldn't upload that image. Try again.");
  return s3ObjectUrl(url, fields.key);
}
