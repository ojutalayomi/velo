import { MediaProps } from "./ImgVidProps";
import Image from "next/image";

const ImageDiv: React.FC<MediaProps> = ({media,host}) => {
    const hostname: string = 'https://s3.amazonaws.com/post-s/';
    return(
        <>
            <Image src={host ? hostname + media : media} height={300} width={300} style={{ width: '100%', height: 'auto' }} alt=""/>
        </>
    )
}
export default ImageDiv;