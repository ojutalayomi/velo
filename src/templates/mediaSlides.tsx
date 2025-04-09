'use client'
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
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"

const MediaSlide = ({ className, postData, isLink = false, ...props }: { className?: string, postData: PostData, isLink?: boolean, props?: HTMLDivElement}) => {
    const [api, setApi] = useState<CarouselApi>()
    const { index } = useParams() as { index: string }
    const [current, setCurrent] = useState(0)
    const [count, setCount] = useState(0)
    const [showControls, setShowControls] = useState(false)

    useEffect(() => {
        if (!api || !index) return
        api.scrollTo(parseInt(index), true)
    }, [api])

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
        <div className={cn(`relative w-full flex items-center justify-center flex-1`, className)} {...props}>
            <Carousel setApi={setApi} className="w-full h-full">
                <CarouselContent className="h-full items-center">
                    {postData.Image?.map((media, index) => {
                        const isImage = media.includes('png') || media.includes('jpg') || media.includes('jpeg')
                        const isHosted = !media.includes('https') && !media.startsWith('/')
                        const link = `/${postData.Username}/posts/${postData.PostID}/photo/${index}`
                        
                        return (
                            <CarouselItem 
                                key={`${media}-${index}`}
                                className="flex items-center justify-center bg-primary/10 h-full w-full"
                            >
                                {isImage ? (
                                    <ImageDiv 
                                        {...(isLink ? {link} : {})}
                                        media={media} 
                                        host={isHosted}
                                    />
                                ) : (
                                    <VideoDiv
                                        media={media}
                                        host={isHosted} 
                                    />
                                )}
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