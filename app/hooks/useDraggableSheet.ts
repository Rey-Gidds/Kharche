import { useState, useRef, useEffect, RefObject } from "react";
import { useMediaQuery } from "./useMediaQuery";

interface UseDraggableSheetProps {
  isOpen: boolean;
  onClose: () => void;
  threshold?: number;
}

export function useDraggableSheet({ isOpen, onClose, threshold = 100 }: UseDraggableSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const currentDragY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      currentDragY.current = 0;
      setIsDragging(false);
    }
  }, [isOpen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (sheetRef.current && target.closest('.drag-handle-area')) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStartY.current = e.clientY;
      currentDragY.current = 0;
      setIsDragging(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const currentY = e.clientY;
    const deltaY = currentY - dragStartY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
      currentDragY.current = deltaY;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const target = e.target as HTMLElement;
    try {
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch (error) {
      // Ignore if capture is already lost
    }
    if (currentDragY.current > threshold) {
      // Animate out before closing
      const outDistance = typeof window !== 'undefined' ? window.innerHeight : 1000;
      setDragY(outDistance);
      setTimeout(() => {
        onClose();
        // Reset state after unmount so it's ready for next time
        setDragY(0);
        currentDragY.current = 0;
      }, 200);
    } else {
      setDragY(0);
      currentDragY.current = 0;
    }
  };

  const style = isMobile ? {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
  } : {};

  const handlers = isMobile ? {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp
  } : {};

  return {
    sheetRef,
    dragY,
    isDragging,
    style,
    handlers
  };
}
