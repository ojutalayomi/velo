import { ChevronDown, Download, File, Share } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Attachment } from '@/lib/types/type';
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, CarouselApi } from "@/components/ui/carousel";
import ImageDiv from "@/components/imageDiv";
import VideoDiv from "@/templates/videoDiv";
import { DocCard } from "@/components/DocCard";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { saveAs } from 'file-saver';

const downloadFile = (url: string, filename: string) => {
    saveAs(url, filename);
};  

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const MediaCollage = ({media}:{media: Attachment[]}) => {
    const [mediaDialog, toggleMediaDialog] = useState({open: false, index: 0})
    const mediaLength = media.length
    const moreThanFour = mediaLength > 4
    const excess = mediaLength - 4
    const mediaType = media.map(m => m.type.split('/')[0])[0]

    const fileColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'pdf':
                return 'red-500';
            case 'doc':
            case 'docx':
                return 'blue-500';
            case 'xls':
            case 'xlsx':
            case 'csv':
                return 'green-500';
            case 'ppt':
            case 'pptx':
                return 'orange-500';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return 'purple-500';
            case 'mp4':
            case 'avi':
            case 'mov':
                return 'pink-500';
            case 'mp3':
            case 'wav':
                return 'yellow-500';
            default:
                return 'gray-500';
        }
    }

    return (
        <div className={`w-full ${mediaType === 'image' ? "bg-gray-100" : "bg-transparent"} dark:bg-zinc-800 rounded-lg overflow-hidden`}>
            {/* <div className="p-4 text-xs border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-pink-400">~Dara🤫</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">+234 708 933 73</span>
                    <ChevronDown className="text-gray-400 transform transition hover:rotate-180"/>
                </div>
            </div> */}
            <MediaDialog files={media} mediaDialog={mediaDialog} toggleMediaDialog={toggleMediaDialog}/>
            {mediaType === 'image' ? (
                <div className="grid grid-cols-2 gap-2 p-2 text-xs">
                    {media.map((m, key) => {
                        if(moreThanFour && key > 2) return
                        return (
                            <div 
                            key={m.name}
                            onClick={() => toggleMediaDialog({open: true, index: key})} 
                            className={`${(key === 2 && mediaLength === 3) ? 'col-span-2 row-span-1 aspect-video' : 'aspect-square'} ${mediaLength === 1 && 'col-span-2'} relative cursor-pointer bg-white rounded-lg overflow-hidden group hover:ring-2 hover:ring-gray-300 transition`}>
                                <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                                {/* <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-white">8:21 PM</div> */}
                            </div>
                        )
                    })}
                    {moreThanFour && (
                        <div onClick={() => toggleMediaDialog({open: true, index: 3})} className="relative">
                            <div className="relative aspect-square cursor-pointer bg-white rounded-lg overflow-hidden group hover:ring-2 hover:ring-gray-300 transition">
                                <img
                                    src={media[3].url}
                                    alt={media[3].name}
                                    className="w-full h-full object-cover"
                                />
                                {/* <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-white text-sm">8:21 PM</div> */}
                            </div>
                            <div className="absolute inset-0 backdrop-blur-sm aspect-square rounded-lg flex items-center justify-center text-gray-400 text-2xl font-light group hover:bg-gray-700 transition">
                                +{excess}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col p-1 gap-2">
                    {media.map((m, key) => {
                        const type = m.type.split('/')[1];
                        const type1 = () => {
                            if(type === "vnd.openxmlformats-officedocument.wordprocessingml.document"){
                                return 'docx'
                            } else if(type === "vnd.openxmlformats-officedocument.spreadsheetml.sheet"){
                                return 'xlxs'
                            }
                            return type
                        }
                        const clr = fileColor(type1())
                        return (
                            <div 
                            key={m.name}
                            // onClick={() => toggleMediaDialog({open: true, index: key})} 
                            className={`flex items-center gap-2 p-2 shadow-lg text-xs bg-gray-100 dark:bg-neutral-950 rounded-lg overflow-hidden group hover:ring-1 hover:ring-gray-300 transition`}>
                                <div aria-label={m.name} className="dark:bg-zinc-800 shadow-md p-2 aspect-square rounded-lg flex items-center justify-center relative">
                                    <div className={`absolute bg-gray-100 text-${clr} border dark:bg-neutral-950 -right-1.5 p-1 top-0 text-xs rounded-lg`}>{type1()?.toUpperCase()}</div>
                                    <File className={`text-${clr}`} size={40}/>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-gray-400">{m.name}</span>
                                    {m.size && <span className="text-gray-500 text-xs">{formatFileSize(m.size)}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                <HoverCard>
                                    <HoverCardTrigger asChild>
                                        <ChevronDown className="text-gray-400 transform transition hover:rotate-180"/>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="mr-2 p-2 w-auto">
                                        <button
                                            type="button"
                                            className='flex w-full items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded'
                                            onClick={(e) => {
                                                e.preventDefault()
                                                downloadFile(m.url || '', m.name)
                                            }}
                                        >
                                            <Download size={16} className="text-gray-400"/>
                                            <span className="text-gray-400">Download</span>
                                        </button>
                                    </HoverCardContent>
                                </HoverCard>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div> 
    )
}


const MediaDialog = ({files, mediaDialog, toggleMediaDialog}: {files: Attachment[], mediaDialog: {open: boolean, index: number}, toggleMediaDialog: React.Dispatch<React.SetStateAction<{
    open: boolean;
    index: number;
}>>}) => {
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const [count, setCount] = useState(0)
    const [showControls, setShowControls] = useState(false)

    useEffect(() => {
        if (!api) return
        api.scrollTo(mediaDialog.index, true)
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
        if (files.length > 1) {
            setShowControls(true)
        }
    }, [files])

    return (
        <Dialog open={mediaDialog.open} 
        onOpenChange={() => {
            if (mediaDialog) {
                toggleMediaDialog({ ...mediaDialog, open: !mediaDialog })
            }
        }}>
            <DialogTrigger className="hidden"></DialogTrigger>
            <DialogContent className="backdrop-blur-xl bg-transparent border-none flex flex-col gap-0 justify-evenly w-screen h-screen max-w-none">
                <DialogHeader>
                    <DialogTitle className="text-white">
                        Preview
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-white">
                        Files ({current}/{count})
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 flex rounded-md max-h-[85%] backdrop-blur-xl shadow-xl h-full">
                    {files && (
                        <Carousel setApi={setApi} className="w-full flex flex-1 items-center max-h-full">
                            <CarouselContent className="flex max-h-[100%] h-full gap-2 sm:aspect-auto">
                            {files.map((file, key) => {
                                const objectURL = file.url as string;
                                const [_,fileType] = file.type.split('/')
                                // console.log(fileType)
                                const isImage = fileType === 'png' || fileType === 'jpeg' || fileType === 'jpeg'
                                const isVideo = fileType === 'mp4' || fileType === 'mov' || fileType === 'mkv'

                                return(
                                    <CarouselItem key={key+file.name} className="flex items-center justify-center h-full w-full">
                                        {
                                            isImage ?
                                                <ImageDiv
                                                media={objectURL} 
                                                host={false}
                                                /> :
                                            isVideo ?
                                                <VideoDiv
                                                    media={objectURL} 
                                                    host={false}
                                                /> :
                                                <DocCard className="w-auto" file={file}/>
                                                // <></>
                                        }
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
                    )}
                </div>
                <DialogFooter className="!flex-col items-center gap-2">
                    {/* Total Size Indicator */}
                    <div className="text-sm text-white dark:text-gray-600">
                        {/* Total Size: {formatFileSize(files.reduce((acc, file) => acc + file.size, 0))} */}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-2 w-full sm:max-w-96">
                        <button
                            type="button"
                            className='flex items-center gap-3 py-3 group rounded px-2'
                            onClick={(e) => {
                                e.preventDefault()
                                downloadFile(files[current].url || '', files[current].name)
                            }}
                        >
                            <Download size={16} className="text-gray-400 group-hover:text-green-500"/>
                            <span className="text-gray-400 group-hover:text-green-500">Download</span>
                        </button><button
                            type="button"
                            className='flex items-center gap-3 py-3 group rounded px-2'
                            onClick={(e) => {
                                e.preventDefault()
                            }}
                        >
                            <Share size={16} className="text-gray-400 group-hover:text-green-500"/>
                            <span className="text-gray-400 group-hover:text-green-500">Share</span>
                        </button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    )
}