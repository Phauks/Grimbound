/**
 * ViewLayout Type Definitions
 *
 * TypeScript interfaces for the unified view layout system.
 */

import type { ReactNode } from 'react';

/**
 * Layout variant types
 * - '2-panel': Left sidebar (280px) + Right content (flex)
 * - '3-panel': Left sidebar (280px) + Center (flex) + Right panel (flex or fixed)
 * - 'full-width': Single scrollable content area
 */
export type ViewLayoutVariant = '2-panel' | '3-panel' | 'full-width';

/**
 * Panel position within the layout
 */
export type PanelPosition = 'left' | 'center' | 'right';

/**
 * Panel width configuration
 * - 'left': Left sidebar width (--sidebar-width-left)
 * - 'right': Right sidebar width (--sidebar-width-right)
 * - 'right-studio': Studio right sidebar width (--sidebar-width-right-studio)
 * - 'flex': Fills remaining space
 * - number: Custom pixel width
 */
export type PanelWidth = 'left' | 'right' | 'right-studio' | 'flex' | number;

/**
 * Props for the ViewLayout container component
 */
export interface ViewLayoutProps {
  /** Layout configuration - determines panel arrangement */
  variant: ViewLayoutVariant;
  /** Child panels (ViewLayout.Panel components) */
  children: ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
  /** Custom height override (default: uses --view-height CSS variable) */
  height?: string;
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

/**
 * Props for the ViewLayout.Panel component
 */
export interface ViewLayoutPanelProps {
  /** Panel position in layout - determines border placement */
  position: PanelPosition;
  /** Panel width configuration */
  width?: PanelWidth;
  /** Enable scrolling with hidden scrollbar */
  scrollable?: boolean;
  /** Panel content (optional for empty placeholder panels) */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

/**
 * Compound component type for ViewLayout
 */
export interface ViewLayoutComponent extends React.FC<ViewLayoutProps> {
  Panel: React.FC<ViewLayoutPanelProps>;
}
