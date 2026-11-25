export enum BUCKETNAME {
    ARTICLE = "post-s",
    PROFILE = "profile-display-images",
    BANNER = "profile-banner-images"
}

export type S3UploadBodyType = {
    filename: string,
    contentType: string,
    bucketName: BUCKETNAME
}

export const S3UploadBody = (payload: S3UploadBodyType) => {
    return JSON.stringify(payload)
}

/**
 * Public URL of an object uploaded with a presigned POST. The key contains the
 * original file name, so each path segment must be encoded (spaces, #, ?, %).
 */
export const s3ObjectUrl = (url: string, key: string) =>
    url + key.split("/").map(encodeURIComponent).join("/")
