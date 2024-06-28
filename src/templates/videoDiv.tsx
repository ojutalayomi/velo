import { MediaProps } from "./ImgVidProps";

const VideoDiv: React.FC<MediaProps> = ({media,host}) => {
    const hostname: string = 'https://s3.amazonaws.com/post-s/';
    return(
        <>
            <video autoPlay loop muted>
                <source src={host ? hostname + media : media}></source>
            </video>
        </>
    )
}
export default VideoDiv;