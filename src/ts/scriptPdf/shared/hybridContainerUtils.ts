/**
 * Hybrid Container Utilities
 *
 * Shared utilities for creating offscreen containers and hiding text
 * for hybrid PDF rendering.
 */

import { PAGE_HEIGHT_INCHES, PAGE_WIDTH_INCHES, UI_PREVIEW_WIDTH } from './hybridConstants.js';

/**
 * Create an offscreen container at UI preview dimensions
 *
 * The container is positioned off-screen but maintains proper dimensions
 * for consistent rendering and text extraction.
 */
export function createOffscreenContainer(): HTMLDivElement {
  const container = document.createElement('div');

  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';

  const width = UI_PREVIEW_WIDTH;
  const height = Math.round(width * (PAGE_HEIGHT_INCHES / PAGE_WIDTH_INCHES));

  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.overflow = 'hidden';
  container.style.backgroundColor = 'transparent';

  document.body.appendChild(container);

  return container;
}

/**
 * Default CSS selector for text elements to hide
 */
const DEFAULT_TEXT_SELECTOR =
  'h1, h2, h3, h4, h5, h6, p, span, strong, em, div[class*="name"], div[class*="ability"], div[class*="title"], div[class*="scriptName"]';

/**
 * Hide all text in container using clip-path.
 *
 * clip-path: inset(100%) makes elements invisible while preserving their
 * layout dimensions. This works regardless of background (solid, gradient, image).
 *
 * @param container - The container element to process
 * @param additionalSelectors - Additional CSS selectors to target (comma-separated)
 * @returns A cleanup function to restore original styles
 */
export function hideTextWithClipPath(
  container: HTMLElement,
  additionalSelectors?: string
): () => void {
  const originalStyles: Array<{ element: HTMLElement; clipPath: string }> = [];

  // Combine default selector with additional selectors
  const selector = additionalSelectors
    ? `${DEFAULT_TEXT_SELECTOR}, ${additionalSelectors}`
    : DEFAULT_TEXT_SELECTOR;

  // Find all text-containing elements and apply clip-path
  const textElements = container.querySelectorAll(selector);

  for (const element of textElements) {
    const htmlElement = element as HTMLElement;
    // Only hide elements that directly contain text (not just wrappers)
    const hasDirectText = Array.from(htmlElement.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    );

    if (hasDirectText || htmlElement.tagName === 'SPAN' || htmlElement.tagName === 'STRONG') {
      originalStyles.push({
        element: htmlElement,
        clipPath: htmlElement.style.clipPath,
      });
      htmlElement.style.clipPath = 'inset(100%)';
    }
  }

  // Return cleanup function
  return () => {
    for (const { element, clipPath } of originalStyles) {
      element.style.clipPath = clipPath;
    }
  };
}

/**
 * Remove container from DOM safely
 */
export function removeContainer(container: HTMLElement): void {
  if (container.parentNode) {
    container.parentNode.removeChild(container);
  }
}
