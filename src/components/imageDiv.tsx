import { ImageProps } from "./ImgVidProps";
import Link from 'next/link';
import Image from "next/image";

const ImageDiv: React.FC<ImageProps> = ({media,link = '',host}) => {
    const hostname: string = 'https://s3.amazonaws.com/post-s/';
    return(
        <>
            <Link href={link} className={link !== '' ? '' : 'contents'} onClick={(e) => link === '' && e.preventDefault()}>
                <Image src={host ? hostname + media : media} height={300} width={300} className="cursor-pointer h-full w-full" alt=""/>
            </Link>
        </>
    )
}
export default ImageDiv;