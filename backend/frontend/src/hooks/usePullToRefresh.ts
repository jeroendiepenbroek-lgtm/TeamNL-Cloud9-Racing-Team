import { useEffect, RefObject } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh(
  ref: RefObject<HTMLElement>,
  { onRefresh, threshold = 80, disabled = false }: UsePullToRefreshOptions
) {
  useEffect(() => {
    if (disabled || !ref.current) return;

    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;

    const element = ref.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      currentY = e.touches[0].pageY;
      const pullDistance = currentY - startY;

      if (pullDistance > 0 && window.scrollY === 0) {
        e.preventDefault();
        
        // Visual feedback (optional - can be enhanced with CSS)
        if (pullDistance > threshold) {
          element.style.transform = `translateY(${Math.min(pullDistance * 0.3, 100)}px)`;
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;

      const pullDistance = currentY - startY;
      element.style.transform = '';

      if (pullDistance > threshold && window.scrollY === 0) {
        isRefreshing = true;
        await onRefresh();
        isRefreshing = false;
      }

      isPulling = false;
      startY = 0;
      currentY = 0;
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, onRefresh, threshold, disabled]);
}
