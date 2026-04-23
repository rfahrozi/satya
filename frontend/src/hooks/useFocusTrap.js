import { useEffect, useRef } from 'react';

/**
 * Selector for all naturally focusable elements.
 * Excludes disabled elements and elements with tabindex="-1".
 */
const FOCUSABLE_SELECTORS = [
  'a[href]:not([disabled])',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * useFocusTrap
 *
 * Returns a ref to attach to a modal/dialog container.
 * When `isActive` is true:
 *   - Saves the currently focused element
 *   - Moves focus to the first focusable element inside the container
 *   - Traps Tab / Shift+Tab navigation within the container
 * When `isActive` becomes false:
 *   - Returns focus to the previously focused element
 *
 * @param {boolean} isActive - Whether the trap should be active
 * @returns {React.RefObject} containerRef - Attach to the modal container element
 */
export function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Remember who had focus before the modal opened
    previousFocusRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Small delay ensures modal DOM is fully rendered before focusing
    let focusTimer;
    const focusables = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS));
    if (focusables.length > 0) {
      focusTimer = setTimeout(() => focusables[0]?.focus(), 16);
    }

    // Tab trap handler
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const items = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS));
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey) {
        // Shift+Tab on first → wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab on last → wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that was focused before the modal opened
      if (previousFocusRef.current?.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}
