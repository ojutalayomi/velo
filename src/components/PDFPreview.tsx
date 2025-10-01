import React, { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set up PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PDFPreview = ({ file }: { file: File }) => {
  const [numPages, setNumPages] = useState<number>();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pageWidth, setPageWidth] = useState<number>(window.innerWidth * 0.8);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    setError(error);
    setIsLoading(false);
  };

  useEffect(() => {
    const handleResize = () => {
      setPageWidth(window.innerWidth * 0.8); // Adjust the multiplier as needed
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isLoading) {
    return <div>Loading PDF...</div>;
  }

  if (error) {
    return <div>Error loading PDF: {error.message}</div>;
  }

  return (
    <Document
      file={file}
      className="h-full overflow-auto space-y-2"
      onLoadSuccess={onDocumentLoadSuccess}
      onLoadError={onDocumentLoadError}
    >
      {numPages &&
        Array.from(new Array(numPages), (el, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1} />
        ))}
    </Document>
  );
};

export default PDFPreview;
