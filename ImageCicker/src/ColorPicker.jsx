import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Palette, Copy, Download, Eye, Pipette, ChevronLeft, ChevronRight, X, Move, Check, Maximize2, ZoomIn, ZoomOut, Star, RotateCcw } from 'lucide-react';

const ColorPicker = () => {
  const [images, setImages] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [colorHistory, setColorHistory] = useState([]);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showColorPreview, setShowColorPreview] = useState(false);
  const [previewColor, setPreviewColor] = useState('#000000');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 'auto', height: 'auto' });
  const [isResizing, setIsResizing] = useState(false);
  const [copiedColor, setCopiedColor] = useState('');
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRefs = useRef({});
  const fileInputRef = useRef(null);
  const imagesContainerRef = useRef(null);
  const containerRef = useRef(null);
  const fullscreenRef = useRef(null);

  // Enhanced image upload with animations
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const newImages = files.map((file, index) => ({
      id: Date.now() + Math.random(),
      file: file,
      url: URL.createObjectURL(file),
      name: file.name,
      isLoading: true,
      animationDelay: index * 150
    }));

    setImages(prev => {
      const updatedImages = [...prev, ...newImages];
      
      // Set main image to first if no images existed
      if (prev.length === 0) {
        setMainImageIndex(0);
      }
      
      // Set up canvas and trigger animations
      setTimeout(() => {
        newImages.forEach((image, index) => {
          const img = new Image();
          img.onload = () => {
            const canvasId = `canvas-${prev.length + index}`;
            const canvas = canvasRefs.current[canvasId];
            if (canvas) {
              const ctx = canvas.getContext('2d');
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              
              // Mark image as loaded
              setImages(currentImages => 
                currentImages.map(img => 
                  img.id === image.id ? { ...img, isLoading: false } : img
                )
              );
            }
          };
          img.src = image.url;
        });
      }, 100);
      
      return updatedImages;
    });
  };

  const removeImage = (imageId) => {
    setImages(prev => {
      const newImages = prev.filter(img => img.id !== imageId);
      const removedIndex = prev.findIndex(img => img.id === imageId);
      
      // Adjust main image index if needed
      if (removedIndex === mainImageIndex) {
        setMainImageIndex(0);
      } else if (removedIndex < mainImageIndex) {
        setMainImageIndex(mainImageIndex - 1);
      }
      
      return newImages;
    });
  };

  const setAsMainImage = (index) => {
    setMainImageIndex(index);
  };

  const openFullscreen = (index) => {
    setFullscreenImage(index);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Enhanced color picking functionality
  const getColorAtPosition = (imageIndex, clientX, clientY, isFullscreen = false) => {
    const image = images[imageIndex];
    if (!image) return '#000000';

    const canvasId = `canvas-${imageIndex}`;
    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return '#000000';

    let imgElement;
    if (isFullscreen) {
      imgElement = fullscreenRef.current?.querySelector('img');
    } else {
      imgElement = document.querySelector(`[data-image-index="${imageIndex}"]`);
    }
    
    if (!imgElement) return '#000000';

    const ctx = canvas.getContext('2d');
    const rect = imgElement.getBoundingClientRect();
    
    // Calculate position relative to the image
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    
    // Adjust for zoom and pan in fullscreen mode
    if (isFullscreen) {
      x = (x - panOffset.x) / zoomLevel;
      y = (y - panOffset.y) / zoomLevel;
    }
    
    // Ensure coordinates are within bounds
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
      return '#000000';
    }
    
    // Calculate actual position on canvas
    const scaleX = canvas.width / (isFullscreen ? rect.width / zoomLevel : rect.width);
    const scaleY = canvas.height / (isFullscreen ? rect.height / zoomLevel : rect.height);
    const canvasX = Math.floor(x * scaleX);
    const canvasY = Math.floor(y * scaleY);
    
    // Ensure canvas coordinates are within bounds
    if (canvasX < 0 || canvasY < 0 || canvasX >= canvas.width || canvasY >= canvas.height) {
      return '#000000';
    }
    
    try {
      const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
      const pixel = imageData.data;
      
      const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
      
      return hex;
    } catch (error) {
      console.error('Error getting color:', error);
      return '#000000';
    }
  };

  const handleCanvasClick = (event, imageIndex, isFullscreen = false) => {
    if (!isPickerActive || images.length === 0) return;
    
    const color = getColorAtPosition(imageIndex, event.clientX, event.clientY, isFullscreen);
    if (color !== '#000000') {
      setSelectedColor(color);
      
      if (!colorHistory.includes(color)) {
        setColorHistory(prev => [color, ...prev.slice(0, 9)]);
      }
    }
    
    setShowColorPreview(false);
  };

  const handleCanvasMouseMove = (event, imageIndex, isFullscreen = false) => {
    if (!isPickerActive || images.length === 0) return;
    
    setCursorPosition({ x: event.clientX, y: event.clientY });
    const color = getColorAtPosition(imageIndex, event.clientX, event.clientY, isFullscreen);
    setPreviewColor(color);
    setShowColorPreview(true);
  };

  // Panning functionality for fullscreen
  const handlePanStart = (event) => {
    if (zoomLevel > 1) {
      setIsPanning(true);
      setPanStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
    }
  };

  const handlePanMove = (event) => {
    if (isPanning) {
      setPanOffset({
        x: event.clientX - panStart.x,
        y: event.clientY - panStart.y
      });
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const copyToClipboard = async (color) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedColor(color);
      setTimeout(() => setCopiedColor(''), 2000);
    } catch (err) {
      console.error('Failed to copy color:', err);
    }
  };

  const rgbToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const scrollLeft = () => {
    if (imagesContainerRef.current) {
      imagesContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (imagesContainerRef.current) {
      imagesContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Enhanced resize functionality
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate new dimensions
      const newWidth = e.clientX - rect.left;
      const newHeight = e.clientY - rect.top;
      
      // Set maximum width to leave space for the right panel (minimum 400px)
      const maxWidth = viewportWidth - 450; // Leave space for right panel
      const maxHeight = viewportHeight - 200; // Leave space for header and padding
      
      // Apply constraints
      const constrainedWidth = Math.min(Math.max(newWidth, 400), maxWidth);
      const constrainedHeight = Math.min(Math.max(newHeight, 300), maxHeight);
      
      setContainerSize({
        width: `${constrainedWidth}px`,
        height: `${constrainedHeight}px`
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Fullscreen pan handlers
  useEffect(() => {
    if (fullscreenImage !== null) {
      document.addEventListener('mousemove', handlePanMove);
      document.addEventListener('mouseup', handlePanEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handlePanMove);
      document.removeEventListener('mouseup', handlePanEnd);
    };
  }, [isPanning, panStart]);

  const [hue, saturation, lightness] = rgbToHsl(selectedColor);
  const [red, green, blue] = hexToRgb(selectedColor);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-none mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Color Extraction Studio
          </h1>
          <p className="text-slate-300">Upload multiple images and extract precise color values with a click</p>
        </div>

        <div className="flex gap-6">
          {/* Image Upload & Display - Now flexible width */}
          <div className="flex-1 min-w-0">
            <div 
              ref={containerRef}
              className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 relative transition-all duration-300"
              style={{
                width: containerSize.width,
                height: containerSize.height,
                minWidth: '400px',
                minHeight: '300px'
              }}
            >
              {images.length === 0 ? (
                <div 
                  className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 transition-all duration-300 hover:bg-slate-800/30 group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-4 text-slate-400 group-hover:text-purple-400 transition-colors duration-300" size={48} />
                  <p className="text-slate-300 text-lg mb-2">Drop your images here</p>
                  <p className="text-slate-500">or click to browse (supports multiple files)</p>
                  <div className="mt-4">
                    <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105">
                      Select Images
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative h-full">
                  {/* Image Navigation Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-white text-lg font-semibold">
                        {images.length} Image{images.length !== 1 ? 's' : ''} Loaded
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsPickerActive(!isPickerActive)}
                        className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 transform hover:scale-105 ${
                          isPickerActive 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25' 
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <Pipette size={16} />
                        {isPickerActive ? 'Active' : 'Activate'}
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all duration-300 transform hover:scale-105"
                      >
                        Add More
                      </button>
                    </div>
                  </div>

                  {/* Main Image Display */}
                  <div className="relative h-full flex flex-col">
                    {/* Main Image */}
                    <div className="flex-1 mb-4 relative">
                      {images[mainImageIndex] && (
                        <div className="h-full flex items-center justify-center">
                          <div className="relative group">
                            <img
                              src={images[mainImageIndex].url}
                              alt={`Main Image`}
                              data-image-index={mainImageIndex}
                              className={`max-h-full max-w-full rounded-xl transition-all duration-300 transform hover:scale-105 ${
                                isPickerActive ? 'cursor-crosshair' : 'cursor-pointer'
                              }`}
                              onClick={(e) => handleCanvasClick(e, mainImageIndex)}
                              onMouseMove={(e) => handleCanvasMouseMove(e, mainImageIndex)}
                              onMouseLeave={() => setShowColorPreview(false)}
                            />
                            
                            {/* Main Image Controls */}
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button
                                onClick={() => openFullscreen(mainImageIndex)}
                                className="bg-blue-500/80 hover:bg-blue-600 text-white p-2 rounded-full transition-all duration-200 hover:scale-110"
                                title="Fullscreen"
                              >
                                <Maximize2 size={16} />
                              </button>
                              <button
                                onClick={() => removeImage(images[mainImageIndex].id)}
                                className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full transition-all duration-200 hover:scale-110"
                                title="Remove"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Strip */}
                    <div className="relative">
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={scrollLeft}
                            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 text-white p-2 rounded-full transition-all duration-300 hover:scale-110 z-10 shadow-lg"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            onClick={scrollRight}
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 text-white p-2 rounded-full transition-all duration-300 hover:scale-110 z-10 shadow-lg"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </>
                      )}
                      
                      <div 
                        ref={imagesContainerRef}
                        className="flex gap-3 overflow-x-auto pb-2 px-8 scrollbar-hide"
                        style={{
                          scrollBehavior: 'smooth',
                          scrollSnapType: 'x mandatory'
                        }}
                      >
                        {images.map((image, index) => (
                          <div 
                            key={image.id} 
                            className={`flex-shrink-0 relative group cursor-pointer transition-all duration-300 ${
                              index === mainImageIndex ? 'scale-110' : 'hover:scale-105'
                            }`}
                            onClick={() => setAsMainImage(index)}
                          >
                            <div className="relative">
                              <img
                                src={image.url}
                                alt={`Thumbnail ${index + 1}`}
                                className={`h-16 w-16 object-cover rounded-lg transition-all duration-300 ${
                                  index === mainImageIndex 
                                    ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/50' 
                                    : 'ring-2 ring-slate-600 hover:ring-purple-400'
                                }`}
                              />
                              
                              {/* Main Image Indicator */}
                              {index === mainImageIndex && (
                                <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-1">
                                  <Star size={12} className="text-white fill-white" />
                                </div>
                              )}
                              
                              {/* Thumbnail Controls */}
                              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFullscreen(index);
                                  }}
                                  className="bg-white/20 hover:bg-white/30 text-white p-1 rounded-full transition-all duration-200"
                                  title="Inspect"
                                >
                                  <Maximize2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Color Preview Tooltip */}
                  {showColorPreview && (
                    <div
                      className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full transition-all duration-200"
                      style={{
                        left: cursorPosition.x,
                        top: cursorPosition.y - 10,
                      }}
                    >
                      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-2xl">
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-white shadow-lg mb-2"
                          style={{ backgroundColor: previewColor }}
                        />
                        <p className="text-xs text-white text-center font-mono">{previewColor}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Enhanced Resize Handle */}
              <div
                className="absolute bottom-2 right-2 w-6 h-6 bg-slate-600 hover:bg-slate-500 rounded cursor-se-resize flex items-center justify-center transition-all duration-300 hover:scale-110"
                onMouseDown={handleMouseDown}
                title="Drag to resize"
              >
                <Move size={12} className="text-white" />
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Color Information Panel - Fixed width */}
          <div className="w-80 space-y-6 flex-shrink-0">
            {/* Current Color */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 transition-all duration-300">
              <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette size={20} />
                Selected Color
              </h3>
              
              <div className="space-y-4">
                <div
                  className="w-full h-24 rounded-xl border-4 border-white shadow-lg transition-all duration-300 transform hover:scale-105"
                  style={{ backgroundColor: selectedColor }}
                />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg transition-all duration-300 hover:bg-slate-900/70">
                    <span className="text-slate-300">HEX</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{selectedColor}</span>
                      <button
                        onClick={() => copyToClipboard(selectedColor)}
                        className="p-1 text-slate-400 hover:text-white transition-all duration-300 transform hover:scale-110"
                      >
                        {copiedColor === selectedColor ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg transition-all duration-300 hover:bg-slate-900/70">
                    <span className="text-slate-300">RGB</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{red}, {green}, {blue}</span>
                      <button
                        onClick={() => copyToClipboard(`rgb(${red}, ${green}, ${blue})`)}
                        className="p-1 text-slate-400 hover:text-white transition-all duration-300 transform hover:scale-110"
                      >
                        {copiedColor === `rgb(${red}, ${green}, ${blue})` ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg transition-all duration-300 hover:bg-slate-900/70">
                    <span className="text-slate-300">HSL</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{hue}°, {saturation}%, {lightness}%</span>
                      <button
                        onClick={() => copyToClipboard(`hsl(${hue}, ${saturation}%, ${lightness}%)`)}
                        className="p-1 text-slate-400 hover:text-white transition-all duration-300 transform hover:scale-110"
                      >
                        {copiedColor === `hsl(${hue}, ${saturation}%, ${lightness}%)` ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Color History */}
            {colorHistory.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 transition-all duration-300">
                <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                  <Eye size={20} />
                  Color History
                </h3>
                
                <div className="grid grid-cols-5 gap-2">
                  {colorHistory.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedColor(color)}
                      className="aspect-square rounded-lg border-2 border-slate-600 hover:border-white transition-all duration-300 hover:scale-110 transform"
                      style={{ 
                        backgroundColor: color,
                        animationDelay: `${index * 50}ms`
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 transition-all duration-300">
              <h3 className="text-white text-lg font-semibold mb-4">How to Use</h3>
              <div className="space-y-2 text-slate-300 text-sm">
                <p>1. Upload multiple images</p>
                <p>2. Click thumbnails to set main image</p>
                <p>3. Click fullscreen icon to inspect closely</p>
                <p>4. Activate color picker and click images</p>
                <p>5. Use zoom controls in fullscreen mode</p>
                <p>6. Drag to resize the image container</p>
                <p>7. Copy color values with one click</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenImage !== null && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          <div 
            ref={fullscreenRef}
            className="relative w-full h-full overflow-hidden"
            onMouseDown={handlePanStart}
          >
            {/* Fullscreen Controls */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={handleZoomOut}
                className="bg-slate-800/80 hover:bg-slate-700 text-white p-3 rounded-full transition-all duration-200 hover:scale-110"
                title="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
              <button
                onClick={handleZoomIn}
                className="bg-slate-800/80 hover:bg-slate-700 text-white p-3 rounded-full transition-all duration-200 hover              <button
                onClick={handleZoomIn}
                className="bg-slate-800/80 hover:bg-slate-700 text-white p-3 rounded-full transition-all duration-200 hover:scale-110"
                title="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={resetZoom}
                className="bg-slate-800/80 hover:bg-slate-700 text-white p-3 rounded-full transition-all duration-200 hover:scale-110"
                title="Reset Zoom"
              >
                <Move size={20} />
              </button>
              <button
                onClick={() => closeFullscreen()}
                className="bg-slate-800/80 hover:bg-red-600 text-white p-3 rounded-full transition-all duration-200 hover:scale-110"
                title="Close Fullscreen"
              >
                <X size={20} />
              </button>
            </div>

            {/* Fullscreen Image */}
            <div className="absolute inset-0 flex items-center justify-center">
              {images[fullscreenImage] && (
                <img
                  src={images[fullscreenImage].url}
                  alt={`Fullscreen Image`}
                  onClick={(e) => handleCanvasClick(e, fullscreenImage, true)}
                  onMouseMove={(e) => handleCanvasMouseMove(e, fullscreenImage, true)}
                  onMouseLeave={() => setShowColorPreview(false)}
                  className="max-h-full max-w-full transition-all duration-300 transform hover:scale-105 cursor-crosshair"
                  style={{
                    transform: `scale(${zoomLevel}) translateX(${-panOffset.x}px) translateY(${-panOffset.y}px)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
