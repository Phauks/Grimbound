import { List, ListImperativeAPI, RowComponentProps } from 'react-window'
import { memo, useMemo, forwardRef, useImperativeHandle, useRef, CSSProperties, ReactElement } from 'react'
import { tokenizeJSONByLine, HighlightLine } from '../../../ts/ui/jsonHighlighter'

interface VirtualizedJsonHighlightProps {
  json: string
  height: number
  width: number
}

/**
 * Line height in pixels - must match CSS line-height
 * Used for accurate scroll position calculations
 */
const LINE_HEIGHT = 21

/**
 * Props passed to each row component via rowProps
 */
interface RowData {
  lines: HighlightLine[]
}

/**
 * Row component for react-window v2
 * Renders a single line of highlighted JSON
 */
type RowComponentType = (props: RowComponentProps<RowData>) => ReactElement

const Row: RowComponentType = memo(
  ({
    index,
    style,
    lines,
  }: RowComponentProps<RowData> & { lines: HighlightLine[] }): ReactElement => (
    <div
      style={style}
      className="json-highlight-line"
      dangerouslySetInnerHTML={{ __html: lines[index]?.html || '&nbsp;' }}
    />
  )
) as RowComponentType

;(Row as unknown as { displayName: string }).displayName = 'VirtualizedJsonRow'

/**
 * Imperative handle interface for controlling scroll from parent
 */
export interface VirtualizedJsonHighlightHandle {
  scrollTo: (scrollTop: number) => void
}

/**
 * Virtualized JSON syntax highlighting component
 *
 * Uses react-window v2 to only render visible lines, dramatically improving
 * performance for large JSON files (1000+ lines).
 *
 * Features:
 * - Only renders ~15-20 visible lines instead of all lines
 * - Fixed row height for O(1) scroll position calculation
 * - Overscan buffer prevents flickering during fast scrolling
 * - Imperative handle allows parent to sync scroll position
 */
export const VirtualizedJsonHighlight = memo(
  forwardRef<VirtualizedJsonHighlightHandle, VirtualizedJsonHighlightProps>(
    ({ json, height, width }, ref) => {
      const listRef = useRef<ListImperativeAPI>(null)

      // Memoize line-based tokenization
      const lines = useMemo(() => tokenizeJSONByLine(json), [json])

      // Expose scroll control to parent component
      useImperativeHandle(
        ref,
        () => ({
          scrollTo: (scrollTop: number) => {
            // Convert pixel offset to row index
            const index = Math.floor(scrollTop / LINE_HEIGHT)
            listRef.current?.scrollToRow({ index, align: 'start' })
          },
        }),
        []
      )

      if (!json) return null

      return (
        <List<RowData>
          listRef={listRef}
          defaultHeight={height}
          rowCount={lines.length}
          rowHeight={LINE_HEIGHT}
          rowProps={{ lines }}
          overscanCount={5}
          className="json-highlight-container"
          style={{ width, height }}
          rowComponent={Row}
        />
      )
    }
  )
)

VirtualizedJsonHighlight.displayName = 'VirtualizedJsonHighlight'
