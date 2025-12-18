/**
 * ViewLayout Component
 *
 * Unified layout container for all views in the application.
 * Provides consistent panel arrangements with independent scrolling.
 *
 * @example 2-panel layout (sidebar + content)
 * ```tsx
 * <ViewLayout variant="2-panel">
 *   <ViewLayout.Panel position="left" scrollable>
 *     <SidebarContent />
 *   </ViewLayout.Panel>
 *   <ViewLayout.Panel position="right" scrollable>
 *     <MainContent />
 *   </ViewLayout.Panel>
 * </ViewLayout>
 * ```
 *
 * @example 3-panel layout (sidebar + center + right)
 * ```tsx
 * <ViewLayout variant="3-panel">
 *   <ViewLayout.Panel position="left" scrollable>
 *     <Navigation />
 *   </ViewLayout.Panel>
 *   <ViewLayout.Panel position="center" scrollable>
 *     <Preview />
 *   </ViewLayout.Panel>
 *   <ViewLayout.Panel position="right" scrollable>
 *     <Editor />
 *   </ViewLayout.Panel>
 * </ViewLayout>
 * ```
 */

import styles from '@/styles/components/layout/ViewLayout.module.css';
import { cn } from '@/ts/utils/classNames';
import type { ViewLayoutComponent, ViewLayoutProps } from './types';
import { ViewLayoutPanel } from './ViewLayoutPanel';

/**
 * Get the CSS class for a given layout variant
 */
function getVariantClass(variant: ViewLayoutProps['variant']): string {
  switch (variant) {
    case '2-panel':
      return styles.layout2Panel;
    case '3-panel':
      return styles.layout3Panel;
    case 'full-width':
      return styles.layoutFullWidth;
    default:
      return '';
  }
}

/**
 * ViewLayout - Main container component for view layouts
 */
function ViewLayoutBase({
  variant,
  children,
  className,
  height,
  'data-testid': testId,
}: ViewLayoutProps) {
  const containerClasses = cn(styles.viewContainer, getVariantClass(variant), className);

  // Allow custom height override via inline style
  const inlineStyle = height ? { height, maxHeight: height } : undefined;

  return (
    <div className={containerClasses} style={inlineStyle} data-testid={testId}>
      {children}
    </div>
  );
}

/**
 * Compound component with Panel attached
 */
export const ViewLayout = ViewLayoutBase as ViewLayoutComponent;
ViewLayout.Panel = ViewLayoutPanel;
