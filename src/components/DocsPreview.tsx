import React, { ChangeEvent, useState } from 'react';
import PDFPreview from './PDFPreview';
import DocPreview from './DocPreview';

export const FilePreview = ({ file }:{file: File}) => {
  if (file.type === 'application/pdf') {
    return <PDFPreview file={file} />;
  } else if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return <DocPreview file={file} />;
  } else {
    return <p>Unsupported file type</p>;
  }
};