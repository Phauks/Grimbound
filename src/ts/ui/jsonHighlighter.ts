/**
 * JSON Syntax Highlighting Utilities
 * Extracted from ScriptInput for reusability
 */

// Token interface for JSON highlighting
export interface HighlightToken {
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'text'
  value: string
}

/**
 * Tokenize JSON string for syntax highlighting
 * @param json - The JSON string to tokenize
 * @returns Array of tokens with type and value
 */
export function tokenizeJSON(json: string): HighlightToken[] {
  if (!json) return []

  const tokens: HighlightToken[] = []
  // Match JSON tokens: strings (with optional colon for keys), booleans, nulls, numbers, and everything else
  const regex = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(json)) !== null) {
    // Add any text before this match
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: json.slice(lastIndex, match.index) })
    }

    const value = match[0]
    let type: HighlightToken['type'] = 'text'

    if (/^"/.test(value)) {
      type = /:$/.test(value) ? 'key' : 'string'
    } else if (/^(?:true|false)$/.test(value)) {
      type = 'boolean'
    } else if (value === 'null') {
      type = 'null'
    } else if (/^-?\d/.test(value)) {
      type = 'number'
    }

    tokens.push({ type, value })
    lastIndex = regex.lastIndex
  }

  // Add any remaining text
  if (lastIndex < json.length) {
    tokens.push({ type: 'text', value: json.slice(lastIndex) })
  }

  return tokens
}

/**
 * CSS class map for token types
 */
export const TOKEN_CLASS_MAP: Record<HighlightToken['type'], string> = {
  key: 'json-key',
  string: 'json-string',
  number: 'json-number',
  boolean: 'json-boolean',
  null: 'json-null',
  text: '',
}

/**
 * Represents a single line of highlighted JSON
 * Used for line-based rendering to reduce DOM nodes
 */
export interface HighlightLine {
  lineNumber: number
  tokens: HighlightToken[]
  html: string // Pre-rendered HTML string for dangerouslySetInnerHTML
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Render tokens to an HTML string for a single line
 * Pre-rendering reduces React reconciliation overhead
 */
function renderTokensToHTML(tokens: HighlightToken[]): string {
  return tokens
    .map((token) => {
      const className = TOKEN_CLASS_MAP[token.type]
      const escaped = escapeHTML(token.value)
      return className ? `<span class="${className}">${escaped}</span>` : escaped
    })
    .join('')
}

/**
 * Tokenize JSON into line-based chunks for efficient rendering
 * Reduces DOM nodes from ~3000 spans to ~100 divs (one per line)
 *
 * @param json - The JSON string to tokenize
 * @returns Array of line objects with pre-rendered HTML
 */
export function tokenizeJSONByLine(json: string): HighlightLine[] {
  if (!json) return []

  const lines = json.split('\n')

  return lines.map((line, index) => {
    const tokens = tokenizeJSON(line)
    return {
      lineNumber: index,
      tokens,
      html: renderTokensToHTML(tokens),
    }
  })
}
