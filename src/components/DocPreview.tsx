import React, { useState } from "react";
import mammoth from "mammoth";

const DocPreview = ({ file }: { file: File }) => {
  const [htmlContent, setHtmlContent] = useState("");

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target) return;
      const arrayBuffer = e.target.result as ArrayBuffer;
      mammoth
        .extractRawText({ arrayBuffer })
        .then((result) => {
          setHtmlContent(result.value);
        })
        .catch((error) => {
          console.error("Error reading DOCX file:", error);
        });
    };
    reader.readAsArrayBuffer(file);
  };

  React.useEffect(() => {
    if (file) {
      readFile(file);
    }
  }, [file]);

  return (
    <div className="h-full overflow-auto space-y-2bg-white flex p-6 space-y-2 text-black w-full">
      <pre>{htmlContent}</pre>
    </div>
  );
};

export default DocPreview;
