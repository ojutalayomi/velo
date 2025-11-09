import {
  File, // Default file
  Folder, // Archives
  FileText, // Text files
  Image, // Images
  FileVideo, // Videos
  FileAudio, // Audio
  FileCode, // Code files
  FileSpreadsheet, // Spreadsheets
  FileType, // Font files
  Mail, // Email files
} from "lucide-react";
import React, { useMemo } from "react";

import { Attachment } from "@/lib/types/type";
import { cn } from "@/lib/utils"; // Assuming you're using shadcn/ui utils

interface DocCardProps {
  file: File | Attachment;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const DocCard: React.FC<DocCardProps> = ({ file, className }) => {
  const fileType = useMemo(() => {
    const type = file.type.split("/")[1];
    if (type === "vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return "docx";
    } else if (type === "vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      return "xlxs";
    }
    return type || "unknown";
  }, [file.type]);

  const fileSize = useMemo(() => {
    if (file.size) return formatFileSize(file.size);
  }, [file.size]);

  const FileIcon = useMemo(() => {
    switch (fileType.toLowerCase()) {
      // Archives
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
      case "bz2":
        return Folder;

      // Documents
      case "pdf":
        return FileText;
      case "doc":
      case "docx":
      case "txt":
      case "rtf":
      case "odt":
        return FileText;

      // Spreadsheets
      case "xls":
      case "xlsx":
      case "csv":
      case "ods":
        return FileSpreadsheet;

      // Presentations
      case "ppt":
      case "pptx":
      case "odp":
        return FileVideo;

      // Images
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "bmp":
      case "svg":
      case "webp":
        return Image;

      // Videos
      case "mp4":
      case "avi":
      case "mov":
      case "wmv":
      case "flv":
      case "webm":
      case "mkv":
        return FileVideo;

      // Audio
      case "mp3":
      case "wav":
      case "ogg":
      case "aac":
      case "m4a":
        return FileAudio;

      // Code files
      case "html":
      case "css":
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      case "json":
      case "xml":
      case "php":
      case "py":
      case "java":
      case "cpp":
      case "c":
      case "cs":
      case "rb":
      case "go":
      case "rust":
        return FileCode;

      // Font files
      case "ttf":
      case "otf":
      case "woff":
      case "woff2":
      case "eot":
        return FileType;

      // Email files
      case "eml":
      case "msg":
        return Mail;

      // Default
      default:
        return File;
    }
  }, [fileType]);

  // You might also want to add color mapping for different file types:
  const getIconColor = useMemo(() => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return "text-red-500";
      case "doc":
      case "docx":
        return "text-blue-500";
      case "xls":
      case "xlsx":
      case "csv":
        return "text-green-500";
      case "ppt":
      case "pptx":
        return "text-orange-500";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "text-purple-500";
      case "mp4":
      case "avi":
      case "mov":
        return "text-pink-500";
      case "mp3":
      case "wav":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  }, [fileType]);

  return (
    <div className={cn("w-full", className)}>
      <div className="w-full max-w-[70vw] rounded-xl bg-transparent p-8 shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <div className="flex flex-col items-center space-y-6">
          {/* Icon Container */}
          <div className="group relative">
            <div
              className="flex size-24 transform items-center justify-center rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-xl backdrop-blur-lg 
                          transition-all duration-300 ease-in-out group-hover:rotate-3 group-hover:scale-110"
            >
              <FileIcon className={cn("w-12 h-12", getIconColor)} />
            </div>

            {/* File Type Badge */}
            <div
              className="absolute -right-3 -top-3 rounded-xl bg-white p-2 shadow-lg 
                          transition-transform duration-200 hover:scale-110"
            >
              <span className="text-xs font-medium uppercase text-brand">{fileType}</span>
            </div>
          </div>

          {/* File Info */}
          <div className="w-[90%] space-y-2 text-center">
            <h2
              className="max-w-[600px] cursor-default truncate text-xl font-semibold text-brand 
                         transition-colors duration-200 hover:text-brand/60 group-hover:text-brand"
              title={file.name}
            >
              {file.name}
            </h2>

            <div className="flex items-center justify-center gap-2">
              <span className="min-w-28 rounded-full px-4 py-1 text-sm text-gray-500">
                {fileSize}
              </span>
              {file.lastModified && (
                <span className="text-sm text-gray-400">
                  {new Date(file.lastModified).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Optional: Add prop types validation
DocCard.displayName = "DocCard";
