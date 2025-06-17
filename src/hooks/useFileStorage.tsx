import { createContext, useContext, useCallback, useState, ReactNode, useEffect } from 'react';

interface FileStorageContextType {
  files: File[];
  setFiles: (files: File[]) => void;
  addFile: (newFiles: File) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  groupDisplayPicture: File | null;
  setGroupDisplayPicture: (file: File | null) => void;
}

const FileStorageContext = createContext<FileStorageContextType | undefined>(undefined);

export const FileStorageProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [groupDisplayPicture, setGroupDisplayPicture] = useState<File | null>(null);

  const addFile = useCallback((newFiles: File) => {
    setFiles([...files, newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(currentFiles => currentFiles.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setGroupDisplayPicture(null);
  }, []);
  
  useEffect(() => {
    return () => {
      clearFiles();
    }
  }, []);

  return (
    <FileStorageContext.Provider 
      value={{ 
        files, 
        setFiles, 
        addFile, 
        removeFile, 
        clearFiles,
        groupDisplayPicture,
        setGroupDisplayPicture
      }}
    >
      {children}
    </FileStorageContext.Provider>
  );
};

export const useGlobalFileStorage = () => {
  const context = useContext(FileStorageContext);
  if (context === undefined) {
    throw new Error('useGlobalFileStorage must be used within a FileStorageProvider');
  }
  return context;
};