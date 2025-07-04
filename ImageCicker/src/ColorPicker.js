import React, { useState, useRef, useEffect } from 'react';
import { Upload, Palette, Copy, Download, Eye, Pipette } from 'lucide-react';

const ColorPicker = () => {
  const [image, setImage] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [colorHistory, setColorHistory] = useState([]);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showColorPreview, setShowColorPreview] = useState(false);
  const [previewColor, setPreviewColor] = useState('#000000');
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          // Set canvas size to match image
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          setImage(e.target.result);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const getColorAtPosition = (x, y) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Calculate actual position on canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (x - rect.left) * scaleX;
    const canvasY = (y - rect.top) * scaleY;
    
    // Get pixel data
    const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
    const pixel = imageData.data;
    
    // Convert to hex
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    return hex;
  };

  const handleCanvasClick = (event) => {
    if (!isPickerActive) return;
    
    const color = getColorAtPosition(event.clientX, event.clientY);
    setSelectedColor(color);
    
    // Add to history if not already present
    if (!colorHistory.includes(color)) {
      setColorHistory(prev => [color, ...prev.slice(0, 9)]);
    }
    
    setIsPickerActive(false);
    setShowColorPreview(false);
  };

  const handleCanvasMouseMove = (event) => {
    if (!isPickerActive) return;
    
    setCursorPosition({ x: event.clientX, y: event.clientY });
    const color = getColorAtPosition(event.clientX, event.clientY);
    setPreviewColor(color);
    setShowColorPreview(true);
  };

  const copyToClipboard = (color) => {
    navigator.clipboard.writeText(color);
    // Could add a toast notification here
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
          <p className="text-slate-300">Upload an image and extract precise color values with a click</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image Upload & Display */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              {!image ? (
                <div 
                  className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-purple-400 transition-all duration-300 hover:bg-slate-800/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-4 text-slate-400" size={48} />
                  <p className="text-slate-300 text-lg mb-2">Drop your image here</p>
                  <p className="text-slate-500">or click to browse</p>
                  <div className="mt-4">
                    <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200">
                      Select Image
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-white text-lg font-semibold">Click to extract colors</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsPickerActive(!isPickerActive)}
                        className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                          isPickerActive 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <Pipette size={16} />
                        {isPickerActive ? 'Active' : 'Activate'}
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all duration-200"
                      >
                        Change Image
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative overflow-hidden rounded-xl">
                    <img
                      src={image}
                      alt="Uploaded"
                      className={`max-w-full h-auto rounded-xl ${isPickerActive ? 'cursor-crosshair' : ''}`}
                      onClick={handleCanvasClick}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseLeave={() => setShowColorPreview(false)}
                    />
                    <canvas
                      ref={canvasRef}
                      style={{ display: 'none' }}
                    />
                  </div>
                  
                  {/* Color Preview Tooltip */}
                  {showColorPreview && (
                    <div
                      className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full"
                      style={{
                        left: cursorPosition.x,
                        top: cursorPosition.y - 10,
                      }}
                    >
                      <div className="bg-slate-900 border border-slate-600 rounded-lg p-2 shadow-xl">
                        <div
                          className="w-8 h-8 rounded border-2 border-white shadow-lg mb-1"
                          style={{ backgroundColor: previewColor }}
                        />
                        <p className="text-xs text-white text-center">{previewColor}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Color Information Panel */}
          <div className="space-y-6">
            {/* Current Color */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette size={20} />
                Selected Color
              </h3>
              
              <div className="space-y-4">
                <div
                  className="w-full h-24 rounded-xl border-4 border-white shadow-lg"
                  style={{ backgroundColor: selectedColor }}
                />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <span className="text-slate-300">HEX</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{selectedColor}</span>
                      <button
                        onClick={() => copyToClipboard(selectedColor)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <span className="text-slate-300">RGB</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{red}, {green}, {blue}</span>
                      <button
                        onClick={() => copyToClipboard(`rgb(${red}, ${green}, ${blue})`)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <span className="text-slate-300">HSL</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{hue}°, {saturation}%, {lightness}%</span>
                      <button
                        onClick={() => copyToClipboard(`hsl(${hue}, ${saturation}%, ${lightness}%)`)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Color History */}
            {colorHistory.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                  <Eye size={20} />
                  Color History
                </h3>
                
                <div className="grid grid-cols-5 gap-2">
                  {colorHistory.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedColor(color)}
                      className="aspect-square rounded-lg border-2 border-slate-600 hover:border-white transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-white text-lg font-semibold mb-4">How to Use</h3>
              <div className="space-y-2 text-slate-300 text-sm">
                <p>1. Upload an image by clicking the upload area</p>
                <p>2. Click "Activate" to enable color picking</p>
                <p>3. Click anywhere on the image to extract the color</p>
                <p>4. Copy color values by clicking the copy icons</p>
                <p>5. View your color history below</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;