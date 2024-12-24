import ImageDiv from "@/components/imageDiv"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi
} from "@/components/ui/carousel"
import VideoDiv from "./videoDiv"
import { PostData } from "./PostProps"
import { useEffect, useState } from "react"

const MediaSlide = ({postData, isLink = false}:{postData: PostData, isLink?: boolean}) => {
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const [count, setCount] = useState(0)
    const [showControls, setShowControls] = useState(false)

    useEffect(() => {
        if (!api) {
            return
        }

        // Update count and current slide position
        setCount(api.scrollSnapList().length)
        setCurrent(api.selectedScrollSnap() + 1)

        // Listen for slide changes
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1)
        })
    }, [api])

    // Only show controls if there are multiple media items
    useEffect(() => {
        if (postData.Image && postData.Image.length > 1) {
            setShowControls(true)
        }
    }, [postData.Image])

    return (
        <div className="relative w-full flex items-center justify-center">
            <Carousel setApi={setApi} className="w-full h-full">
                <CarouselContent className="h-full">
                    {postData.Image?.map((media, index) => {
                        const isImage = media.includes('png') || media.includes('jpg') || media.includes('jpeg')
                        const isHosted = !media.includes('https') && !media.startsWith('/')
                        const link = `/${postData.Username}/posts/${postData.PostID}/photo/${index}`
                        
                        return (
                            <CarouselItem 
                                key={`${media}-${index}`}
                                className="flex items-center justify-center"
                            >
                                <div className="max-h-full w-full flex items-center justify-center">
                                    {isImage ? (
                                        <ImageDiv 
                                            {...(isLink ? {link} : {})}
                                            media={media} 
                                            host={isHosted}
                                        />
                                    ) : (
                                        <VideoDiv
                                            {...(isLink ? {link} : {})}
                                            media={media}
                                            host={isHosted} 
                                        />
                                    )}
                                </div>
                            </CarouselItem>
                        )
                    })}
                </CarouselContent>

                {showControls && (
                    <>
                        <CarouselPrevious className="hidden sm:flex left-2" />
                        <CarouselNext className="hidden sm:flex right-2" />
                    </>
                )}
            </Carousel>

            {showControls && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-black/50 text-white px-2 py-1 rounded-full text-sm">
                        {current} / {count}
                    </span>
                </div>
            )}
        </div>
    )
}

export default MediaSlide;