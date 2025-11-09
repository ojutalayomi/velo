import Image from "next/image";
import Link from "next/link";

import { ImageProps } from "./ImgVidProps";

const ImageDiv: React.FC<ImageProps> = ({ media, link = "", host }) => {
  const hostname = "https://s3.amazonaws.com/post-s/";
  const imageProps = {
    src: host ? hostname + media : media,
    height: 1000,
    width: 1000,
    className: "cursor-pointer object-contain max-h-[calc(100vh-200px)] w-auto h-auto",
    alt: "",
    style: { minHeight: "100%", minWidth: "100%" },
    loading: "lazy" as const,
    priority: false,
    sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  };

  return (
    <>
      {link ? (
        <Link href={link}>
          <Image {...imageProps} />
        </Link>
      ) : (
        <Image {...imageProps} />
      )}
    </>
  );
};

export default ImageDiv;
