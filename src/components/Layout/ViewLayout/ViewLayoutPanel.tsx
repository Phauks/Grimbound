/**
 * ViewLayoutPanel Component
 *
 * A panel within the ViewLayout system. Supports fixed-width sidebars
 * and flexible content areas with optional scrolling.
 */

import styles from '../../../styles/components/layout/ViewLayout.module.css';
import { cn } from '../../../ts/utils/classNames';
import type { PanelWidth, ViewLayoutPanelProps } from './types';

/**
 * Get the CSS class for a given width configuration
 */
function getWidthClass(width: PanelWidth | undefined): string {
  switch (width) {
    case 'left':
      return styles.widthLeft;
    case 'right':
      return styles.widthRight;
    case 'right-studio':
      return styles.widthRightStudio;
    case 'flex':
    case undefined:
      return styles.widthFlex;
    default:
      // For number values, we'll use inline styles
      return '';
  }
}

/**
 * ViewLayoutPanel - Individual panel within ViewLayout
 *
 * @example
 * ```tsx
 * <ViewLayout.Panel position="left" scrollable>
 *   <SidebarContent />
 * </ViewLayout.Panel>
 * ```
 */
export function ViewLayoutPanel({
  position,
  width,
  scrollable = false,
  children,
  className,
  'aria-label': ariaLabel,
  'data-testid': testId,
}: ViewLayoutPanelProps) {
  // Determine if this is a sidebar (fixed width) or main content (flex)
  const isSidebar = position === 'left' || (position === 'right' && width !== 'flex');
  const isCenter = position === 'center' || (position === 'right' && width === 'flex');

  // Build class list
  const panelClasses = cn(
    styles.panel,
    // Sidebar vs main content
    isSidebar && styles.sidebar,
    isCenter && styles.mainContent,
    // Position-specific borders
    position === 'left' && styles.sidebarLeft,
    position === 'right' && isSidebar && styles.sidebarRight,
    // Width variant
    getWidthClass(width),
    // Scrollable with hidden scrollbar
    scrollable && styles.panelScrollable,
    scrollable && styles.hiddenScrollbar,
    // User-provided classes
    className
  );

  // Handle custom numeric width
  const inlineStyle =
    typeof width === 'number'
      ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
      : undefined;

  // Use semantic element for sidebars
  const Element = isSidebar ? 'aside' : 'div';

  return (
    <Element
      className={panelClasses}
      style={inlineStyle}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {children}
    </Element>
  );
}
