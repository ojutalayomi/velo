import { ImageProps } from "./ImgVidProps";
import Link from 'next/link';
import Image from "next/image";

const ImageDiv: React.FC<ImageProps> = ({ media, link = '', host }) => {
    const hostname = 'https://s3.amazonaws.com/post-s/';
    return (
        <>
            {link ? (
                <Link href={link}>
                    <Image 
                        src={host ? hostname + media : media} 
                        height={1000} 
                        width={1000} 
                        className="cursor-pointer object-contain max-h-[calc(100vh-200px)] w-auto h-auto" 
                        alt=""
                        style={{ minHeight: '100%' ,minWidth: '100%' }}
                    />
                </Link>
            ) : (
                <Image 
                    src={host ? hostname + media : media} 
                    height={1000} 
                    width={1000} 
                    className="cursor-pointer object-contain max-h-[calc(100vh-200px)] w-auto h-auto" 
                    alt=""
                    style={{ minHeight: '100%' ,minWidth: '100%' }}
                />
            )}
        </>
    );
}

export default ImageDiv;