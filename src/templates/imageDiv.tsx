import { MediaProps } from "./ImgVidProps";
import Image from "next/image";

const ImageDiv: React.FC<MediaProps> = ({media,host}) => {
    const hostname: string = 'https://s3.amazonaws.com/post-s/';
    return(
        <>
            <Image src={host ? hostname + media : media} alt=""/>
        </>
    )
}
export default ImageDiv;