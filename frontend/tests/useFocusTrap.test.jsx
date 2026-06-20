/**
 * tests/useFocusTrap.test.jsx
 *
 * Tests for the useFocusTrap hook covering:
 * - Initial focus on first focusable element
 * - Tab wrapping from last to first
 * - Shift+Tab wrapping from first to last
 * - Non-Tab keys ignored
 * - Focus restoration on deactivation
 * - Edge case: no focusable elements
 */

import React, { useState } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useFocusTrap } from '../src/hooks/useFocusTrap';

// Test component that uses useFocusTrap
function TestModal({ isActive }) {
  const ref = useFocusTrap(isActive);

  if (!isActive) return null;
  return (
    <div ref={ref} data-testid="modal">
      <button data-testid="first-btn">First</button>
      <input data-testid="middle-input" />
      <button data-testid="last-btn">Last</button>
    </div>
  );
}

// Test component with no focusable elements
function EmptyModal({ isActive }) {
  const ref = useFocusTrap(isActive);

  if (!isActive) return null;
  return (
    <div ref={ref} data-testid="empty-modal">
      <p>No focusable elements here</p>
    </div>
  );
}

// Wrapper component to test activation/deactivation
function ToggleWrapper() {
  const [isActive, setIsActive] = useState(false);
  return (
    <div>
      <button data-testid="trigger" onClick={() => setIsActive(!isActive)}>Toggle</button>
      <TestModal isActive={isActive} />
    </div>
  );
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('focuses first focusable element on activation', () => {
    const { getByTestId } = render(<TestModal isActive={true} />);
    
    // Advance timer to trigger the focus timeout
    act(() => {
      jest.advanceTimersByTime(20);
    });

    expect(document.activeElement).toBe(getByTestId('first-btn'));
  });

  test('wraps Tab from last to first element', () => {
    const { getByTestId } = render(<TestModal isActive={true} />);

    act(() => {
      jest.advanceTimersByTime(20);
    });

    const lastBtn = getByTestId('last-btn');
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    // Press Tab on the last element
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });

    expect(document.activeElement).toBe(getByTestId('first-btn'));
  });

  test('wraps Shift+Tab from first to last element', () => {
    const { getByTestId } = render(<TestModal isActive={true} />);

    act(() => {
      jest.advanceTimersByTime(20);
    });

    const firstBtn = getByTestId('first-btn');
    firstBtn.focus();
    expect(document.activeElement).toBe(firstBtn);

    // Press Shift+Tab on the first element
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(getByTestId('last-btn'));
  });

  test('does not intercept non-Tab keys', () => {
    const { getByTestId } = render(<TestModal isActive={true} />);

    act(() => {
      jest.advanceTimersByTime(20);
    });

    const firstBtn = getByTestId('first-btn');
    firstBtn.focus();

    // Press Enter (should not change focus)
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(document.activeElement).toBe(firstBtn);
  });

  test('does not wrap when focus is on middle element', () => {
    const { getByTestId } = render(<TestModal isActive={true} />);

    act(() => {
      jest.advanceTimersByTime(20);
    });

    const middleInput = getByTestId('middle-input');
    middleInput.focus();

    // Press Tab on middle (should not wrap since it's not last)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    // Focus should still be on middle or moved naturally (jsdom won't move it)
    // The point is that preventDefault is NOT called
    expect(document.activeElement).toBe(middleInput);
  });

  test('restores focus on deactivation', () => {
    const { getByTestId } = render(<ToggleWrapper />);

    const trigger = getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Activate modal
    fireEvent.click(trigger);

    act(() => {
      jest.advanceTimersByTime(20);
    });

    // Focus should be inside modal
    expect(getByTestId('first-btn')).toBeInTheDocument();

    // Deactivate modal
    fireEvent.click(trigger);

    // Focus should be restored to trigger
    expect(document.activeElement).toBe(trigger);
  });

  test('handles empty modal (no focusable elements)', () => {
    const { getByTestId } = render(<EmptyModal isActive={true} />);

    act(() => {
      jest.advanceTimersByTime(20);
    });

    // No crash, modal is present
    expect(getByTestId('empty-modal')).toBeInTheDocument();

    // Tab keydown should not crash
    fireEvent.keyDown(document, { key: 'Tab' });
  });

  test('does nothing when isActive is false', () => {
    render(<TestModal isActive={false} />);
    // No modal rendered, no crash
    expect(document.querySelector('[data-testid="modal"]')).toBeNull();
  });
});
