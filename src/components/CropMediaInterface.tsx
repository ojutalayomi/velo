import { TextOverlay } from "@/lib/types/type";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from "./ui/dialog";
import { Crop, Sliders, MessageSquare, Type, Flag, ChevronLeft, ChevronRight, AlignLeft, Bold, Italic, AlignCenter, AlignRight, Maximize2, Search, MinusCircle, PlusCircle, ImageIcon, Loader, Loader2 } from "lucide-react";
import { ChangeEvent, MouseEvent, ReactNode, useEffect, useRef, useState } from "react";
import { DialogHeader, DialogFooter } from "./ui/dialog";
import { Property } from 'csstype';
import { useTheme } from "@/app/providers/ThemeProvider";

const CropMediaInterface = ({children, files, setFiles, imageIndex}:{children: ReactNode, files: File[], setFiles: (files: File[]) => void, imageIndex: number}) => {
  const { theme } = useTheme();
  const [zoomLevel, setZoomLevel] = useState(0);
  const [activeTab, setActiveTab] = useState('crop');
  const [aspectRatio, setAspectRatio] = useState('original');
  const [altText, setAltText] = useState('');
  const [activeFilter, setActiveFilter] = useState('none');
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Content warning states
  const [hasContentWarning, setHasContentWarning] = useState(false);
  const [contentWarningType, setContentWarningType] = useState('none');
  const [customWarning, setCustomWarning] = useState('');
  
  // Text overlay states
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [activeTextId, setActiveTextId] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textAlign, setTextAlign] = useState('left');
  
  // Media Carousel States
  const sliderRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false)
  
  // Function to add new text overlay
  const addTextOverlay = () => {
    if (!textInput.trim() || !imageContainerRef.current) return;
    
    const newTextId = Date.now().toString();
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    
    const newTextOverlay = {
      id: newTextId,
      text: textInput,
      x: containerRect.width / 2 - 75, // Center horizontally
      y: containerRect.height / 2 - 20, // Center vertically
      color: textColor,
      fontSize,
      fontFamily,
      bold: textBold,
      italic: textItalic,
      align: textAlign,
      isDragging: false,
      dragOffset: { x: 0, y: 0 }
    };
    
    setTextOverlays([...textOverlays, newTextOverlay]);
    setActiveTextId(newTextId);
    setTextInput('');
  };
  
  // Text drag handlers
  const handleTextMouseDown = (e: MouseEvent, id: string) => {
    e.preventDefault();
    
    const textElement = textOverlays.find(t => t.id === id);
    if (!textElement) return;
    
    // Calculate offset from mouse position to text element position
    const offsetX = e.clientX - textElement.x;
    const offsetY = e.clientY - textElement.y;
    
    // Update the text overlay
    setTextOverlays(textOverlays.map(item => 
      item.id === id 
        ? { ...item, isDragging: true, dragOffset: { x: offsetX, y: offsetY } } 
        : item
    ));
    
    setActiveTextId(id);
  };
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!activeTextId || !imageContainerRef.current) return;
    
    const draggingText = textOverlays.find(t => t.id === activeTextId && t.isDragging);
    if (!draggingText) return;
    
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const boundedX = Math.max(0, Math.min(
      e.clientX - draggingText.dragOffset.x,
      containerRect.width - 150 // Approximate text width
    ));
    
    const boundedY = Math.max(0, Math.min(
      e.clientY - draggingText.dragOffset.y,
      containerRect.height - 40 // Approximate text height
    ));
    
    setTextOverlays(textOverlays.map(item => 
      item.id === activeTextId 
        ? { ...item, x: boundedX, y: boundedY }
        : item
    ));
  };
  
  const handleMouseUp = () => {
    setTextOverlays(textOverlays.map(item => 
      item.isDragging ? { ...item, isDragging: false } : item
    ));
  };
  
  // Function to update active text properties
  const updateActiveText = (property: string, value: any) => {
    if (!activeTextId) return;
    
    setTextOverlays(textOverlays.map(item => 
      item.id === activeTextId 
        ? { ...item, [property]: value } 
        : item
    ));
  };
  
  // Function to delete active text
  const deleteActiveText = () => {
    if (!activeTextId) return;
    
    setTextOverlays(textOverlays.filter(item => item.id !== activeTextId));
    setActiveTextId('');
  };
  
  // Function to toggle content warning
  const toggleContentWarning = () => {
    setHasContentWarning(!hasContentWarning);
    if (!hasContentWarning && contentWarningType === 'none') {
      setContentWarningType('sensitive');
    }
  };
  
  // Aspect ratio calculations
  const getAspectRatioDimensions = () => {
    if (!imageRef.current) return {};
    
    // console.log(imageRef.current.width / 2, imageRef.current.height / 2);
    const containerWidth = imageRef.current.width / 2; // Base container width
    let width, height;
    
    switch (aspectRatio) {
      case '1:1':
        width = containerWidth;
        height = containerWidth;
        break;
      case '16:9':
        width = containerWidth;
        height = containerWidth * (9/16);
        break;
      case '4:3':
        width = containerWidth;
        height = containerWidth * (3/4);
        break;
      case 'original':
      default:
        width = containerWidth;
        height = containerWidth * (4/3); // Assuming original is 4:3 for demo
        break;
    }
    
    return { width: `${width}px`, height: `${height}px` };
  };
  
  // Filter styles
  const getFilterStyles = () => {
    let filterStyle = `brightness(${brightness/50}) contrast(${contrast/50})`;
    
    switch (activeFilter) {
      case 'vivid':
        filterStyle += ' saturate(1.5)';
        break;
      case 'b&w':
        filterStyle += ' grayscale(1)';
        break;
      case 'retro':
        filterStyle += ' sepia(0.5) hue-rotate(-30deg)';
        break;
      case 'none':
      default:
        break;
    }
    
    return filterStyle;
  };
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 5, 100));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 5, 0));
  };
  
  const handleSliderClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    setZoomLevel(Math.max(0, Math.min(100, percentage)));
  };
  
  const handleSliderDrag = (e: MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleSliderClick(e);
  };
  
  const handleBrightnessChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBrightness(Number(e.target.value));
  };
  
  const handleContrastChange = (e: ChangeEvent<HTMLInputElement>) => {
    setContrast(Number(e.target.value));
  };

  // Tab configuration
  const tabs = [
    { id: 'crop', icon: <Crop className="h-6 w-6" />, label: 'Crop' },
    { id: 'adjust', icon: <Sliders className="h-6 w-6" />, label: 'Adjust' },
    { id: 'filters', icon: <ImageIcon className="h-6 w-6" />, label: 'Filters' },
    { id: 'alt', icon: <MessageSquare className="h-6 w-6" />, label: 'Alt Text' },
    { id: 'text', icon: <Type className="h-6 w-6" />, label: 'Text' },
    { id: 'flag', icon: <Flag className="h-6 w-6" />, label: 'Flag' }
  ];

  const processImage = async (file: File, textOverlays: TextOverlay[], filters: string, zoomLevel: number) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
  
    // Load the image
    const img = new Image();
    img.src = URL.createObjectURL(file);
  
    await new Promise((resolve) => {
      img.onload = resolve;
    });
  
    // Set canvas dimensions based on the image and zoom level
    const scale = 0.5 + (zoomLevel / 100) * 1.5;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
  
    // Apply filters
    ctx.filter = filters;
  
    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
    // Draw text overlays
    textOverlays.forEach((overlay) => {
      ctx.font = `${overlay.bold ? 'bold' : ''} ${overlay.italic ? 'italic' : ''} ${overlay.fontSize}px ${overlay.fontFamily}`;
      ctx.fillStyle = overlay.color;
      ctx.textAlign = overlay.align as CanvasTextAlign;
      ctx.fillText(overlay.text, overlay.x * scale, overlay.y * scale);
    });
  
    // Export the canvas as a new image
    return new Promise<File | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const editedFile = new File([blob], `edited-${file.name}`, { type: file.type });
          resolve(editedFile);
        } else {
          resolve(null);
        }
      }, file.type);
    });
  };
  
  const handleSave = async () => {
    if (imageIndex < 0 || imageIndex >= files.length) return; // Ensure the index is valid
  
    setIsLoading(true);
  
    try {
      // Process only the active image
      const editedFile = await processImage(
        files[imageIndex], // Active image
        textOverlays,
        getFilterStyles(),
        zoomLevel
      );
  
      if (editedFile) {
        // Replace the active image in the files array with the edited version
        const updatedFiles = [...files];
        updatedFiles[imageIndex] = editedFile;
        setFiles(updatedFiles);
      }
  
      // Close the modal
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error processing the image:", error);
    } finally {
      setIsLoading(false); // Ensure loading state is reset
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-white max-h-screen h-[95%] gap-0 px-6 py-0 dark:bg-zinc-900 overflow-hidden mb:h-full flex flex-col">
        <DialogHeader className='dark:text-white'>
          <DialogTitle className='text-center'></DialogTitle>
          <DialogDescription className="flex justify-between items-center px-4 py-2 border-b border-gray-800">
            <span className="flex items-center gap-4">
              <DialogClose>
                <ChevronLeft className="h-6 w-6" />
              </DialogClose>
              <span className="text-xl font-bold">Crop media</span>
            </span>
            <span className="flex items-center gap-2">
              {/* <button disabled={!api?.canScrollPrev()} onClick={() => api?.scrollPrev()} className="disabled:cursor-not-allowed p-2 rounded-full dark:bg-gray-800">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button disabled={!api?.canScrollNext()} onClick={() => api?.scrollNext()} className="disabled:cursor-not-allowed p-2 rounded-full dark:bg-gray-800">
                <ChevronRight className="h-5 w-5" />
              </button> */}
              <button disabled={isLoading} onClick={handleSave} className={`flex items-center bg-brand text-white font-semibold py-2 px-6 rounded-full ml-2`}>
                {isLoading ? 'Saving' : 'Save'}
                {isLoading && <Loader2 className="animate-spin"/>}
              </button>
            </span>
          </DialogDescription>

          {/* Toolbar with Tab Control */}
          <div className="flex justify-between items-center p-2">
            <div className="flex items-center gap-8">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`flex flex-col items-center px-4 py-2 relative ${
                      activeTab === tab.id ? 'text-brand' : 'text-gray-500'
                    } transition-colors hover:text-brand/90`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.icon}
                    <span className="text-xs mt-1">{tab.label}</span>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-brand rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            {/* <div className="text-gray-400 text-lg font-medium">
              {activeTab === 'alt' && 'ALT Text'}
              {activeTab === 'flag' && 'Content Warning'}
            </div> */}
          </div>

        </DialogHeader>
        
        {/* Main Content Area */}
        <div
          className="relative w-full flex items-center justify-center flex-1 overflow-hidden"
          style={{ flexShrink: 1, maxHeight: 'calc(100% - 120px)' }} // Adjust height dynamically
        >
          <div className="absolute inset-0 bg-black bg-opacity-70 z-30 flex flex-col items-center justify-center max-h-full">
           
              <div 
                ref={imageContainerRef}
                className={`border-4 border-brand max-h-full overflow-hidden absolute -translate-x-1/2 -translate-y-1/2 bg-transparent top-1/2 left-1/2 z-30`}
                style={{
                  ...getAspectRatioDimensions(),
                  boxShadow: `0 0 0 9999px rgba(${theme === 'dark' ? '0, 0, 0' : '255, 255, 255'}, 0.9)`, // Create the cut-out effect
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                >
                  {/* Content warning overlay */}
                  {hasContentWarning && activeTab === 'flag' && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 z-30 flex items-center justify-center flex-col p-4">
                      <Flag className="h-10 w-10 text-yellow-500 mb-2" />
                      <h3 className="text-lg font-bold text-white">Content Warning</h3>
                      <p className="text-center text-white mt-1">
                        {contentWarningType === 'custom' 
                        ? customWarning || 'Custom warning' 
                        : contentWarningType === 'sensitive' 
                          ? 'Sensitive Content'
                          : contentWarningType === 'violence'
                          ? 'Violent Content'
                          : contentWarningType === 'nudity'
                              ? 'Nudity'
                              : 'Political Content'}
                      </p>
                    </div>
                  )}

                  {/* Text overlays */}
                  {textOverlays.map((overlay) => (
                    <div 
                    key={overlay.id}
                    className={`absolute cursor-move ${overlay.isDragging ? 'z-20' : 'z-10'} ${
                        activeTextId === overlay.id ? 'outline outline-2 outline-brand' : ''
                    }`}
                    style={{
                      left: overlay.x,
                      top: overlay.y,
                      color: overlay.color,
                      fontSize: `${overlay.fontSize}px`,
                      fontFamily: overlay.fontFamily,
                      fontWeight: overlay.bold ? 'bold' : 'normal',
                      fontStyle: overlay.italic ? 'italic' : 'normal',
                      textAlign: overlay.align as Property.TextAlign,
                      minWidth: '100px',
                      userSelect: 'none'
                    }}
                    onMouseDown={(e) => handleTextMouseDown(e, overlay.id)}
                    >
                      {overlay.text}
                    </div>
                  ))}
              </div>
            
          </div>

          {files[imageIndex] && (
            <div className="flex flex-col items-center justify-center max-h-full">
              <div>
                
                <img 
                  ref={imageRef}
                  src={URL.createObjectURL(files[imageIndex])} 
                  alt={altText}
                  className="w-full h-full object-cover"
                  style={{ 
                    transform: `scale(${0.5 + (zoomLevel / 100) * 1.5})`,
                    filter: getFilterStyles()
                  }}
                />
                
              </div>
            </div>
          )}
        </div>
          
        
        {/* Bottom Toolbar */}
        <DialogFooter className='bg-white dark:bg-zinc-900'>
          <div className="flex justify-between items-center sticky bottom-0 border-gray-800 flex-1 py-3">
            
            {/* Tab Content Area - Shows different controls based on active tab */}
            <div className="p-2 border-b border-gray-800">
              {activeTab === 'crop' && (
                <>
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-sm text-gray-400">Aspect ratio:</span>
                    <button 
                      className={`px-3 py-1 ${aspectRatio === 'original' ? 'bg-brand' : 'dark:bg-gray-800'} rounded-md text-sm`}
                      onClick={() => setAspectRatio('original')}
                    >
                      Original
                    </button>
                    <button 
                      className={`px-3 py-1 ${aspectRatio === '1:1' ? 'bg-brand' : 'dark:bg-gray-800'} rounded-md text-sm`}
                      onClick={() => setAspectRatio('1:1')}
                    >
                      1:1
                    </button>
                    <button 
                      className={`px-3 py-1 ${aspectRatio === '16:9' ? 'bg-brand' : 'dark:bg-gray-800'} rounded-md text-sm`}
                      onClick={() => setAspectRatio('16:9')}
                    >
                      16:9
                    </button>
                    <button 
                      className={`px-3 py-1 ${aspectRatio === '4:3' ? 'bg-brand' : 'dark:bg-gray-800'} rounded-md text-sm`}
                      onClick={() => setAspectRatio('4:3')}
                    >
                      4:3
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <Search className="h-6 w-6" />
                    <div className="flex items-center">
                        <button 
                        onClick={handleZoomOut} 
                        className="focus:outline-none hover:text-brand/90 transition-colors"
                        >
                        <MinusCircle className="h-6 w-6 text-gray-500" />
                        </button>
                        <div 
                        ref={sliderRef}
                        className="relative w-52 h-2 bg-gray-700 rounded-full mx-2 cursor-pointer"
                        onClick={handleSliderClick}
                        onMouseMove={handleSliderDrag}
                        >
                        <div 
                            className="absolute top-0 left-0 h-2 bg-brand rounded-full"
                            style={{ width: `${zoomLevel}%` }}
                        />
                        <div 
                            className="absolute top-0 h-6 w-6 bg-brand rounded-full -mt-2 cursor-grab active:cursor-grabbing"
                            style={{ left: `${zoomLevel}%`, transform: 'translateX(-50%)' }}
                        />
                        </div>
                        <button 
                        onClick={handleZoomIn} 
                        className="focus:outline-none hover:text-brand/90 transition-colors"
                        >
                        <PlusCircle className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>
                  </div>
                </>
              )}
              
              {activeTab === 'adjust' && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">Brightness:</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={brightness} 
                    onChange={handleBrightnessChange}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-400 ml-4">Contrast:</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={contrast} 
                    onChange={handleContrastChange}
                    className="w-32"
                  />
                </div>
              )}
              
              {activeTab === 'filters' && (
                <div className="flex items-center gap-3">
                  <button 
                    className={`px-3 py-1 ${activeFilter === 'none' ? 'bg-brand' : 'dark:bg-gray-800'} rounded-md text-sm`}
                    onClick={() => setActiveFilter('none')}
                  >
                    None
                  </button>
                  <button 
                    className={`px-3 py-1 ${activeFilter === 'vivid' ? 'bg-brand' : 'dark:bg-gray-800'} rounded-md text-sm`}
                    onClick={() => setActiveFilter('vivid')}
                  >
                    Vivid
                  </button>
                  <button 
                    className={`px-3 py-1 ${activeFilter === 'b&w' ? 'bg-brand' : 'dark:bg-gray-800'} rounded-md text-sm`}
                    onClick={() => setActiveFilter('b&w')}
                  >
                    B&W
                  </button>
                  <button 
                    className={`px-3 py-1 ${activeFilter === 'retro' ? 'bg-brand' : 'dark:bg-gray-800'} rounded-md text-sm`}
                    onClick={() => setActiveFilter('retro')}
                  >
                    Retro
                  </button>
                </div>
              )}
              
              {activeTab === 'alt' && (
                <div className="flex items-center gap-3 w-full">
                  <span className="text-sm text-gray-400">Alt text description:</span>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="flex-1 dark:bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
                    placeholder="Describe this image for screen readers..."
                  />
                </div>
              )}
              
              {activeTab === 'flag' && (
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="content-warning-toggle"
                      checked={hasContentWarning}
                      onChange={toggleContentWarning}
                      className="w-4 h-4"
                    />
                    <label htmlFor="content-warning-toggle" className="text-sm">
                      Put a content warning on this post
                    </label>
                  </div>
                  
                  {hasContentWarning && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">Warning type:</span>
                        <select
                          value={contentWarningType}
                          onChange={(e) => setContentWarningType(e.target.value)}
                          className="dark:bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
                        >
                          <option value="sensitive">Sensitive Content</option>
                          <option value="violence">Violence</option>
                          <option value="nudity">Nudity</option>
                          <option value="political">Political</option>
                          <option value="custom">Custom Warning</option>
                        </select>
                      </div>
                      
                      {contentWarningType === 'custom' && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-400">Custom warning:</span>
                          <input
                            type="text"
                            value={customWarning}
                            onChange={(e) => setCustomWarning(e.target.value)}
                            className="flex-1 dark:bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
                            placeholder="Enter custom warning..."
                          />
                        </div>
                      )}
                      
                      <div className="mt-2 p-3 dark:bg-gray-800 rounded">
                        <p className="text-sm text-gray-300">
                          Content warnings help viewers know what to expect in your post.
                          When enabled, your media will be blurred in feeds with a warning message.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'text' && (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      className="flex-1 dark:bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
                      placeholder="Enter text to add..."
                    />
                    <button 
                      className="px-3 py-1 bg-brand rounded-md text-sm"
                      onClick={addTextOverlay}
                    >
                      Add Text
                    </button>
                    
                    {activeTextId && (
                      <button 
                        className="px-3 py-1 bg-red-500 rounded-md text-sm"
                        onClick={deleteActiveText}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  
                  {/* Text formatting options */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Font:</span>
                      <select 
                        className="dark:bg-gray-800 rounded px-2 py-1 text-sm"
                        value={fontFamily}
                        onChange={(e) => {
                          setFontFamily(e.target.value);
                          if (activeTextId) updateActiveText('fontFamily', e.target.value);
                        }}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Georgia">Georgia</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Size:</span>
                      <select 
                        className="dark:bg-gray-800 rounded px-2 py-1 text-sm"
                        value={fontSize}
                        onChange={(e) => {
                          setFontSize(Number(e.target.value));
                          if (activeTextId) updateActiveText('fontSize', Number(e.target.value));
                        }}
                      >
                        <option value="16">16</option>
                        <option value="20">20</option>
                        <option value="24">24</option>
                        <option value="32">32</option>
                        <option value="48">48</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Color:</span>
                      <input 
                        type="color" 
                        value={textColor}
                        onChange={(e) => {
                          setTextColor(e.target.value);
                          if (activeTextId) updateActiveText('color', e.target.value);
                        }}
                        className="w-6 h-6 rounded"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        className={`p-1 rounded ${textBold ? 'bg-brand' : 'dark:bg-gray-800'}`}
                        onClick={() => {
                          setTextBold(!textBold);
                          if (activeTextId) updateActiveText('bold', !textBold);
                        }}
                      >
                        <Bold size={16} />
                      </button>
                      <button 
                        className={`p-1 rounded ${textItalic ? 'bg-brand' : 'dark:bg-gray-800'}`}
                        onClick={() => {
                          setTextItalic(!textItalic);
                          if (activeTextId) updateActiveText('italic', !textItalic);
                        }}
                      >
                        <Italic size={16} />
                      </button>
                      
                      <div className="border-l border-gray-700 h-6 mx-1"></div>
                      
                      <button 
                        className={`p-1 rounded ${textAlign === 'left' ? 'bg-brand' : 'dark:bg-gray-800'}`}
                        onClick={() => {
                          setTextAlign('left');
                          if (activeTextId) updateActiveText('align', 'left');
                        }}
                      >
                        <AlignLeft size={16} />
                      </button>
                      <button 
                        className={`p-1 rounded ${textAlign === 'center' ? 'bg-brand' : 'dark:bg-gray-800'}`}
                        onClick={() => {
                          setTextAlign('center');
                          if (activeTextId) updateActiveText('align', 'center');
                        }}
                      >
                        <AlignCenter size={16} />
                      </button>
                      <button 
                        className={`p-1 rounded ${textAlign === 'right' ? 'bg-brand' : 'dark:bg-gray-800'}`}
                        onClick={() => {
                          setTextAlign('right');
                          if (activeTextId) updateActiveText('align', 'right');
                        }}
                      >
                        <AlignRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CropMediaInterface