#!/usr/bin/env python3
"""Fix accessibility issues in TypeScript/TSX files."""

import re
import sys
from pathlib import Path

def fix_button_type(content: str) -> tuple[str, int]:
    """Add type='button' to button elements without type attribute."""
    count = 0

    # Pattern to match <button without type= attribute
    # Matches: <button followed by space/newline but not followed by type=
    pattern = r'<button(\s+)(?!type=)'

    def replacer(match):
        nonlocal count
        count += 1
        return f'<button{match.group(1)}type="button" '

    new_content = re.sub(pattern, replacer, content)
    return new_content, count

def fix_file(filepath: Path) -> int:
    """Fix accessibility issues in a single file."""
    try:
        content = filepath.read_text(encoding='utf-8')
        original_content = content

        # Fix button type
        content, button_count = fix_button_type(content)

        if content != original_content:
            filepath.write_text(content, encoding='utf-8')
            print(f"Fixed {filepath}: {button_count} button(s)")
            return button_count
        return 0
    except Exception as e:
        print(f"Error processing {filepath}: {e}", file=sys.stderr)
        return 0

def main():
    """Main function."""
    src_dir = Path(__file__).parent / 'src'

    total_fixed = 0
    for tsx_file in src_dir.rglob('*.tsx'):
        total_fixed += fix_file(tsx_file)

    print(f"\nTotal buttons fixed: {total_fixed}")

if __name__ == '__main__':
    main()
