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
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartY = useRef(0);
  const currentDragY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setDragY(0);
      currentDragY.current = 0;
      setIsDragging(false);
      setIsClosing(false);
    } else {
      setDragY(0);
      currentDragY.current = 0;
      setIsDragging(false);
      setIsClosing(false);
    }

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [isOpen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isClosing) return;
    const target = e.target as HTMLElement;
    if (sheetRef.current && target.closest('.drag-handle-area')) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStartY.current = e.clientY;
      currentDragY.current = 0;
      setIsDragging(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isClosing) return;
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
      // Ignore
    }

    if (currentDragY.current > threshold) {
      // Prevent synthetic clicks that might hit the backdrop after release
      if (e.cancelable) e.preventDefault();

      // Suppress the residual synthetic click that the pointer-up gesture
      // produces after the sheet flies off — without this, the click lands on
      // the table row beneath and immediately re-opens the drawer.
      const suppressNextClick = (evt: MouseEvent) => {
        evt.stopPropagation();
        evt.preventDefault();
      };
      document.addEventListener("click", suppressNextClick, { capture: true, once: true });
      // Safety valve: remove the listener even if no click fires within 300 ms
      setTimeout(() => document.removeEventListener("click", suppressNextClick, true), 300);

      setIsClosing(true);
      // Animate out before closing
      const outDistance = typeof window !== 'undefined' ? window.innerHeight : 1000;
      setDragY(outDistance);
      
      closeTimerRef.current = setTimeout(() => {
        onClose();
        // Reset state after unmount so it's ready for next time
        setDragY(0);
        currentDragY.current = 0;
        setIsClosing(false);
        closeTimerRef.current = null;
      }, 80);
    } else {
      setDragY(0);
      currentDragY.current = 0;
    }
  };

  const style = isMobile ? {
    ...( (isDragging || isClosing || dragY !== 0) ? { transform: `translateY(${dragY}px)` } : {} ),
    transition: isDragging ? 'none' : 'transform 0.08s cubic-bezier(0.4, 0, 1, 1)',
    pointerEvents: (isClosing ? 'none' : 'auto') as any
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
    isClosing,
    isMobile,
    style,
    handlers
  };
}
