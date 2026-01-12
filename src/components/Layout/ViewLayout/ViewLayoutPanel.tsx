/**
 * ViewLayoutPanel Component
 *
 * A panel within the ViewLayout system. Supports fixed-width sidebars
 * and flexible content areas with optional scrolling.
 */

import styles from '@/styles/components/layout/ViewLayout.module.css';
import { cn } from '@/ts/utils/classNames';
import type { PanelWidth, ViewLayoutPanelProps } from './types';

/**
 * Get the CSS class for a given width configuration
 * Returns empty string when resizable (uses inline styles instead)
 */
function getWidthClass(width: PanelWidth | undefined, isResizable: boolean): string {
  // When resizable, width is controlled via inline styles
  if (isResizable) return '';

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
 *
 * @example Resizable sidebar (controlled)
 * ```tsx
 * const { width, isDragging, handleProps } = useResizableSidebar();
 *
 * <ViewLayout.Panel
 *   position="left"
 *   resizable
 *   resizableWidth={width}
 *   isResizing={isDragging}
 *   onWidthChange={handleProps.onMouseDown}
 *   scrollable
 * >
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
  resizable = false,
  onWidthChange,
  resizableWidth,
  isResizing = false,
}: ViewLayoutPanelProps) {
  // Determine if this is a sidebar (fixed width) or main content (flex)
  const isSidebar = position === 'left' || (position === 'right' && width !== 'flex');
  const isCenter = position === 'center' || (position === 'right' && width === 'flex');

  // Only left sidebars can be resizable
  const canResize = resizable && position === 'left';

  // Build class list
  const panelClasses = cn(
    styles.panel,
    // Sidebar vs main content
    isSidebar && styles.sidebar,
    isCenter && styles.mainContent,
    // Position-specific borders
    position === 'left' && styles.sidebarLeft,
    position === 'right' && isSidebar && styles.sidebarRight,
    // Width variant (skip if resizable - uses inline styles)
    getWidthClass(width, canResize),
    // Scrollable with hidden scrollbar
    scrollable && styles.panelScrollable,
    scrollable && styles.hiddenScrollbar,
    // User-provided classes
    className
  );

  // Handle width - resizable takes precedence, then numeric, then CSS class
  const getInlineStyle = (): React.CSSProperties | undefined => {
    if (canResize && resizableWidth !== undefined) {
      return {
        width: `${resizableWidth}px`,
        minWidth: '250px', // Enforce minimum
        maxWidth: '450px', // Enforce maximum
      };
    }
    if (typeof width === 'number') {
      return { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` };
    }
    return undefined;
  };

  // Use semantic element for sidebars
  const Element = isSidebar ? 'aside' : 'div';

  // Generate data attribute for drawer positioning
  const panelDataAttr = position === 'left' ? { 'data-left-panel': true } : undefined;

  // Resize handle for left sidebar
  const resizeHandle = canResize ? (
    <div
      className={cn(styles.resizeHandle, styles.resizeHandleRight, isResizing && styles.dragging)}
      onMouseDown={onWidthChange}
      aria-hidden="true"
    />
  ) : null;

  return (
    <Element
      className={panelClasses}
      style={getInlineStyle()}
      aria-label={ariaLabel}
      data-testid={testId}
      {...panelDataAttr}
    >
      {children}
      {resizeHandle}
    </Element>
  );
}
