import React from "react";
export interface MediaData {
  media: string;
}

export interface MediaProps {
  media: string;
  host: boolean;
}

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  media: string;
  link?: string;
  host: boolean;
}

export interface VideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  media: string;
  link?: string;
  host: boolean;
}
