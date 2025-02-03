import { ChevronDown } from "lucide-react";
import React, { useState } from "react";
import { Attachment } from '@/lib/types/type';
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import ImageDiv from "@/components/imageDiv";
import VideoDiv from "@/templates/videoDiv";
// import { DocCard } from "@/components/DocCard";

export const MediaCollage = ({media}:{media: Attachment[]}) => {
    const [mediaDialog, toggleMediaDialog] = useState(false)
    const mediaLength = media.length
    const moreThanFour = mediaLength > 4
    const excess = mediaLength - 4
    return (
        <div className="w-full bg-gray-900 rounded-lg overflow-hidden">
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
            <div className="grid grid-cols-2 gap-2 p-2 text-xs">
                {media.map((m, key) => {
                    if(moreThanFour && key > 2) return
                    return (
                        <div 
                        key={m.name}
                        onClick={() => toggleMediaDialog(true)} 
                        className={`${(key === 2 && mediaLength === 3) ? 'col-span-2 row-span-1 aspect-video' : 'aspect-square'} relative cursor-pointer bg-white rounded-lg overflow-hidden group hover:ring-2 hover:ring-gray-300 transition`}>
                            <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                            {/* <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-white">8:21 PM</div> */}
                        </div>
                    )
                })}
                {moreThanFour && (
                    <div className="relative">
                        <div onClick={() => toggleMediaDialog(true)} className="relative aspect-square cursor-pointer bg-white rounded-lg overflow-hidden group hover:ring-2 hover:ring-gray-300 transition">
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
        </div> 
    )
}

interface FileValidationConfig {
    maxFileSize: number; // in bytes
    maxTotalSize: number; // in bytes
    maxFiles: number;
    allowedFileTypes: string[];
}

const FILE_VALIDATION_CONFIG: FileValidationConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB per file
    maxTotalSize: 50 * 1024 * 1024, // 50MB total
    maxFiles: 5, // Maximum 5 files
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
};

const MediaDialog = ({files, mediaDialog, toggleMediaDialog}: {files: Attachment[], mediaDialog: boolean, toggleMediaDialog: React.Dispatch<React.SetStateAction<boolean>>}) => {

    return (
        <Dialog open={mediaDialog} 
        onOpenChange={() => {
            if (mediaDialog) {
                toggleMediaDialog(!mediaDialog)
            }
        }}>
            <DialogTrigger className="hidden"></DialogTrigger>
            <DialogContent className="backdrop-blur-xl bg-transparent flex flex-col w-screen h-screen max-w-none">
                <DialogHeader>
                    <DialogTitle className="dark:text-white text-black">
                        Preview
                        <b className="block text-sm font-medium text-white dark:text-gray-700">
                            Attach Files ({files.length}/{FILE_VALIDATION_CONFIG.maxFiles})
                        </b>
                    </DialogTitle>
                    <DialogDescription>
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 flex rounded-md max-h-[90%] backdrop-blur-xl shadow-xl h-full">
                    {files && (
                        <Carousel className="w-full flex flex-1 items-center max-h-full">
                            <CarouselContent className="flex max-h-[100%] h-full gap-2 sm:aspect-auto p-6">
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
                                                // <DocCard className="w-auto" file={file}/>
                                                <></>
                                        }
                                    </CarouselItem>
                                )
                            })}
                            </CarouselContent>
                            <CarouselPrevious className="hidden sm:flex left-2" />
                            <CarouselNext className="hidden sm:flex right-2" />
                        </Carousel>
                    )}
                </div>
                <DialogFooter className="!flex-col items-center gap-2">
                    {/* Total Size Indicator */}
                    <div className="text-sm text-white dark:text-gray-600">
                        {/* Total Size: {formatFileSize(files.reduce((acc, file) => acc + file.size, 0))} */}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-2 w-full sm:max-w-96">
                        
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    )
}