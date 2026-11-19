import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Eye, ShieldCheck } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface ImageInspectionModalProps {
  images: string[];
  initialIndex?: number;
  itemTitle: string;
  era: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageInspectionModal: React.FC<ImageInspectionModalProps> = ({
  images,
  initialIndex = 0,
  itemTitle,
  era,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

  const safeImages = Array.isArray(images) ? images : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, safeImages.length]);

  if (!isOpen || safeImages.length === 0) return null;

  const currentImg = safeImages[currentIndex] || safeImages[0] || '/images/antique-fallback.webp';

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    handleResetZoom();
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    handleResetZoom();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoomLevel <= 1) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white select-none backdrop-blur-md">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-stone-800 bg-stone-950/80">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white line-clamp-1">
              {itemTitle}
            </h3>
            <span className="text-[11px] text-stone-400 italic">
              {era} • Hi-Res Hallmarks & Craftsmanship Inspection ({currentIndex + 1} of {images.length})
            </span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-800 rounded-xs border border-stone-700 p-0.5">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="p-1.5 text-stone-300 hover:text-white disabled:opacity-40 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-semibold text-amber-200">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3.5}
              className="p-1.5 text-stone-300 hover:text-white disabled:opacity-40 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-stone-400 hover:text-white transition-colors border-l border-stone-700"
              title="Reset Zoom (1x)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-xs bg-stone-800 hover:bg-stone-700 transition-colors"
            title="Close Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Inspection Canvas */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="transition-transform duration-75 ease-out select-none flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
            cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
          }}
        >
          <SafeImage
            priority
            src={currentImg}
            alt={itemTitle}
            draggable={false}
            className="max-h-[82vh] max-w-[90vw] object-contain rounded-xs shadow-2xl pointer-events-none"
          />
        </div>

        {/* Previous / Next buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-full border border-stone-700 backdrop-blur-xs transition-colors"
              title="Previous Photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-full border border-stone-700 backdrop-blur-xs transition-colors"
              title="Next Photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Micro-guide at bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-900/90 border border-stone-700 px-4 py-1.5 rounded-full text-[11px] text-stone-300 flex items-center gap-2 pointer-events-none backdrop-blur-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Use Zoom buttons to inspect maker hallmarks, patina, and joinery. Drag to pan.</span>
        </div>
      </div>

      {/* Thumbnails Bar */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-stone-950/80 border-t border-stone-800 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                handleResetZoom();
              }}
              className={`shrink-0 w-12 h-12 rounded-xs overflow-hidden border-2 transition-all ${
                currentIndex === idx
                  ? 'border-amber-400 scale-105 shadow-md'
                  : 'border-stone-700 opacity-60 hover:opacity-100'
              }`}
            >
              <SafeImage src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
