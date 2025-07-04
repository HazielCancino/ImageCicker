import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Palette, Copy, Download, Eye, Pipette, ChevronLeft, ChevronRight, X, Move, Check } from 'lucide-react';

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
  const [draggedImage, setDraggedImage] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRefs = useRef({});
  const fileInputRef = useRef(null);
  const imagesContainerRef = useRef(null);
  const containerRef = useRef(null);

  // Enhanced image upload with animations
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const newImages = files.map((file, index) => ({
      id: Date.now() + Math.random(),
      file: file,
      url: URL.createObjectURL(file),
      name: file.name,
      isLoading: true,
      animationDelay: index * 150 // Stagger animation
    }));

    setImages(prev => {
      const updatedImages = [...prev, ...newImages];
      
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
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Fixed color picking functionality
  const getColorAtPosition = (imageIndex, clientX, clientY) => {
    const image = images[imageIndex];
    if (!image) return '#000000';

    const canvasId = `canvas-${imageIndex}`;
    const canvas = canvasRefs.current[canvasId];
    if (!canvas) return '#000000';

    // Get the displayed image element
    const imgElement = document.querySelector(`[data-image-index="${imageIndex}"]`);
    if (!imgElement) return '#000000';

    const ctx = canvas.getContext('2d');
    const rect = imgElement.getBoundingClientRect();
    
    // Calculate position relative to the image
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Ensure coordinates are within bounds
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
      return '#000000';
    }
    
    // Calculate actual position on canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = Math.floor(x * scaleX);
    const canvasY = Math.floor(y * scaleY);
    
    // Ensure canvas coordinates are within bounds
    if (canvasX < 0 || canvasY < 0 || canvasX >= canvas.width || canvasY >= canvas.height) {
      return '#000000';
    }
    
    try {
      // Get pixel data
      const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
      const pixel = imageData.data;
      
      // Convert to hex
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

  const handleCanvasClick = (event, imageIndex) => {
    if (!isPickerActive || images.length === 0) return;
    
    const color = getColorAtPosition(imageIndex, event.clientX, event.clientY);
    if (color !== '#000000') {
      setSelectedColor(color);
      
      // Add to history if not already present
      if (!colorHistory.includes(color)) {
        setColorHistory(prev => [color, ...prev.slice(0, 9)]);
      }
    }
    
    setShowColorPreview(false);
  };

  const handleCanvasMouseMove = (event, imageIndex) => {
    if (!isPickerActive || images.length === 0) return;
    
    setCursorPosition({ x: event.clientX, y: event.clientY });
    const color = getColorAtPosition(imageIndex, event.clientX, event.clientY);
    setPreviewColor(color);
    setShowColorPreview(true);
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
      const newWidth = e.clientX - rect.left;
      const newHeight = e.clientY - rect.top;
      
      if (newWidth > 400 && newHeight > 300) {
        setContainerSize({
          width: `${newWidth}px`,
          height: `${newHeight}px`
        });
      }
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

  const [hue, saturation, lightness] = rgbToHsl(selectedColor);
  const [red, green, blue] = hexToRgb(selectedColor);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Color Extraction Studio
          </h1>
          <p className="text-slate-300">Upload multiple images and extract precise color values with a click</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image Upload & Display */}
          <div className="lg:col-span-2">
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

                  {/* Image Display with Horizontal Scrolling */}
                  <div className="relative h-full">
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={scrollLeft}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 text-white p-2 rounded-full transition-all duration-300 hover:scale-110 z-10 shadow-lg"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          onClick={scrollRight}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-slate-900/80 hover:bg-slate-800 text-white p-2 rounded-full transition-all duration-300 hover:scale-110 z-10 shadow-lg"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </>
                    )}
                    
                    <div 
                      ref={imagesContainerRef}
                      className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide h-full"
                      style={{
                        scrollBehavior: 'smooth',
                        scrollSnapType: 'x mandatory'
                      }}
                      onScroll={(e) => setScrollPosition(e.target.scrollLeft)}
                    >
                      {images.map((image, index) => (
                        <div 
                          key={image.id} 
                          className={`flex-shrink-0 relative group transition-all duration-500 ease-out ${
                            image.isLoading ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                          }`}
                          style={{
                            scrollSnapAlign: 'start',
                            transitionDelay: `${image.animationDelay}ms`
                          }}
                        >
                          <div className="relative overflow-hidden rounded-xl">
                            {image.isLoading && (
                              <div className="absolute inset-0 bg-slate-700 animate-pulse rounded-xl z-10 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                            
                            <img
                              src={image.url}
                              alt={`Image ${index + 1}`}
                              data-image-index={index}
                              className={`max-h-96 w-auto rounded-xl transition-all duration-300 transform hover:scale-105 ${
                                isPickerActive ? 'cursor-crosshair' : 'cursor-pointer'
                              } ${image.isLoading ? 'opacity-0' : 'opacity-100'}`}
                              onClick={(e) => handleCanvasClick(e, index)}
                              onMouseMove={(e) => handleCanvasMouseMove(e, index)}
                              onMouseLeave={() => setShowColorPreview(false)}
                              onLoad={() => {
                                setImages(currentImages => 
                                  currentImages.map(img => 
                                    img.id === image.id ? { ...img, isLoading: false } : img
                                  )
                                );
                              }}
                            />
                            
                            {/* Hidden canvas for color extraction */}
                            <canvas
                              ref={el => canvasRefs.current[`canvas-${index}`] = el}
                              style={{ display: 'none' }}
                            />

                            {/* Remove Image Button */}
                            <button
                              onClick={() => removeImage(image.id)}
                              className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <p className="text-slate-300 text-sm mt-2 truncate max-w-xs transition-colors duration-300 group-hover:text-white">
                            {image.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Enhanced Color Preview Tooltip */}
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

          {/* Color Information Panel */}
          <div className="space-y-6">
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
                <p>1. Upload multiple images by clicking the upload area</p>
                <p>2. Scroll horizontally to view all images</p>
                <p>3. Click "Activate" to enable color picking</p>
                <p>4. Click anywhere on any image to extract the color</p>
                <p>5. Copy color values by clicking the copy icons</p>
                <p>6. Remove images using the X button</p>
                <p>7. Drag the resize handle to adjust container size</p>
                <p>8. View your color history below</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;