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