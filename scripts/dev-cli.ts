#!/usr/bin/env npx tsx
/**
 * Developer CLI Tool for Grimbound
 *
 * Interactive menu-based utility for running common development commands.
 * Run with: npm run cli (or npx tsx scripts/dev-cli.ts)
 */

import { spawn, spawnSync } from 'node:child_process';
import * as readline from 'node:readline';
import { colors, type MenuItem, menuCategories } from './dev-cli-config.js';

// Escape single quotes for shell commands to prevent injection
function escapeShellArg(arg: string): string {
  return arg.replace(/'/g, "'\\''");
}

// Flatten menu for navigation
interface FlatMenuItem extends MenuItem {
  categoryIndex: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  newWindow: boolean;
  dangerous: boolean;
  originalIndex: number; // Track original position for selection
}

// Search state
interface SearchState {
  isActive: boolean;
  query: string;
}

function flattenMenu(): FlatMenuItem[] {
  const items: FlatMenuItem[] = [];
  let index = 0;
  for (let catIndex = 0; catIndex < menuCategories.length; catIndex++) {
    const cat = menuCategories[catIndex];
    for (const item of cat.items) {
      items.push({
        ...item,
        categoryIndex: catIndex,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
        newWindow: item.newWindow ?? false,
        dangerous: item.dangerous ?? false,
        originalIndex: index,
      });
      index++;
    }
  }
  return items;
}

// Filter items based on search query
function filterItems(items: FlatMenuItem[], query: string): FlatMenuItem[] {
  if (!query.trim()) return items;

  const lowerQuery = query.toLowerCase();
  return items.filter((item) => {
    const label = item.label.toLowerCase();
    const command = item.command.toLowerCase();
    const description = (item.description || '').toLowerCase();
    const category = item.categoryName.toLowerCase();

    return (
      label.includes(lowerQuery) ||
      command.includes(lowerQuery) ||
      description.includes(lowerQuery) ||
      category.includes(lowerQuery)
    );
  });
}

// Highlight matching text in a string
function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return `${before}${colors.bgGreen}${colors.white}${match}${colors.reset}${after}`;
}

function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

function hideCursor(): void {
  process.stdout.write('\x1b[?25l');
}

function showCursor(): void {
  process.stdout.write('\x1b[?25h');
}

function renderHeader(): void {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log(
    '  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557'
  );
  console.log('  \u2551         \u{1F3AD} Grimbound Developer CLI \u{1F3AD}         \u2551');
  console.log(
    '  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D'
  );
  console.log(`${colors.reset}`);
}

// Calculate visible window around selected item
function getVisibleWindow(
  selectedIndex: number,
  totalItems: number,
  maxVisible: number
): { start: number; end: number } {
  const halfWindow = Math.floor(maxVisible / 2);

  let start = selectedIndex - halfWindow;
  let end = selectedIndex + halfWindow;

  // Adjust if we're near the beginning
  if (start < 0) {
    start = 0;
    end = Math.min(maxVisible, totalItems);
  }

  // Adjust if we're near the end
  if (end > totalItems) {
    end = totalItems;
    start = Math.max(0, totalItems - maxVisible);
  }

  return { start, end };
}

function renderInstructions(search: SearchState): void {
  if (search.isActive) {
    console.log(
      `  ${colors.cyan}\u{1F50D} Search:${colors.reset} ${search.query}${colors.bgWhite} ${colors.reset}`
    );
    console.log(
      `  ${colors.dim}Type to filter \u2022 \u23CE Select \u2022 Esc Cancel${colors.reset}\n`
    );
  } else {
    console.log(
      `  ${colors.dim}\u2191/\u2193 Navigate  / Search  PgUp/PgDn Categories  \u23CE Enter  q Quit${colors.reset}\n`
    );
  }
}

function renderMenuItem(item: FlatMenuItem, isSelected: boolean, search: SearchState): void {
  const prefix = isSelected ? `${colors.bgBlue}${colors.white}` : '  ';
  const suffix = isSelected ? colors.reset : '';
  const arrow = isSelected ? ' \u25B8 ' : '   ';
  const windowIcon = item.newWindow ? ` ${colors.dim}\u{1F5D7}${colors.reset}` : '';
  const dangerIcon = item.dangerous ? ` ${colors.yellow}\u26A0${colors.reset}` : '';

  const labelDisplay = search.isActive ? highlightMatch(item.label, search.query) : item.label;
  const descText = item.description || '';
  const descDisplay = search.isActive ? highlightMatch(descText, search.query) : descText;
  const desc = descText ? `${colors.dim} - ${descDisplay}${colors.reset}` : '';

  console.log(`${prefix}${arrow}${labelDisplay}${suffix}${windowIcon}${dangerIcon}${desc}`);
}

function renderFooter(
  selected: FlatMenuItem,
  search: SearchState,
  totalItems: number,
  selectedIndex: number
): void {
  console.log(
    `\n  ${colors.dim}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${colors.reset}`
  );

  const commandDisplay = search.isActive
    ? highlightMatch(selected.command, search.query)
    : selected.command;
  console.log(
    `\n  ${colors.yellow}\u{1F4BB} Command:${colors.reset} ${colors.italic}${commandDisplay}${colors.reset}`
  );

  const positionText = search.isActive
    ? `[${selectedIndex + 1}/${totalItems}] matching "${search.query}"`
    : `[${selectedIndex + 1}/${totalItems}] in ${menuCategories.length} categories`;
  console.log(`\n  ${colors.dim}${positionText}${colors.reset}`);
}

function renderMenu(
  items: FlatMenuItem[],
  selectedIndex: number,
  search: SearchState = { isActive: false, query: '' }
): void {
  clearScreen();
  renderHeader();
  renderInstructions(search);

  // Handle empty results
  if (items.length === 0) {
    console.log(`\n  ${colors.yellow}No matching commands found.${colors.reset}`);
    console.log(`  ${colors.dim}Try a different search term or press Esc to clear.${colors.reset}`);
    return;
  }

  // Viewport: dynamically size based on terminal height
  const terminalRows = process.stdout.rows || 24;
  const maxVisible = Math.max(5, Math.min(15, terminalRows - 15));
  const { start, end } = getVisibleWindow(selectedIndex, items.length, maxVisible);

  // Show scroll indicator at top
  if (start > 0) {
    console.log(`  ${colors.dim}\u2191 ${start} more above...${colors.reset}`);
  }

  let currentCategory = -1;

  for (let i = start; i < end; i++) {
    const item = items[i];

    // Print category header when it changes
    if (item.categoryIndex !== currentCategory) {
      currentCategory = item.categoryIndex;
      const categoryDisplay = search.isActive
        ? highlightMatch(`${item.categoryIcon}  ${item.categoryName}`, search.query)
        : `${item.categoryIcon}  ${item.categoryName}`;
      console.log(`\n  ${item.categoryColor}${colors.bold}${categoryDisplay}${colors.reset}`);
    }

    renderMenuItem(item, i === selectedIndex, search);
  }

  // Show scroll indicator at bottom
  if (end < items.length) {
    console.log(`\n  ${colors.dim}\u2193 ${items.length - end} more below...${colors.reset}`);
  }

  renderFooter(items[selectedIndex], search, items.length, selectedIndex);
}

function runCommandInNewWindow(command: string): boolean {
  const isWindows = process.platform === 'win32';
  const cwd = process.cwd();
  const escapedCwd = escapeShellArg(cwd);
  const escapedCommand = escapeShellArg(command);

  if (isWindows) {
    // Windows: Use 'start' to open a new cmd window
    // /K keeps the window open after command completes
    spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/K', command], {
      cwd,
      detached: true,
      stdio: 'ignore',
    }).unref();
    return true;
  }

  // macOS: Use osascript to open Terminal
  const isMac = process.platform === 'darwin';

  if (isMac) {
    const script = `tell application "Terminal" to do script "cd '${escapedCwd}' && ${escapedCommand}"`;
    spawn('osascript', ['-e', script], {
      detached: true,
      stdio: 'ignore',
    }).unref();
    return true;
  }

  // Linux: Try common terminal emulators using 'which' to check availability
  const terminals = [
    {
      cmd: 'gnome-terminal',
      args: ['--', 'bash', '-c', `cd '${escapedCwd}' && ${escapedCommand}; exec bash`],
    },
    {
      cmd: 'konsole',
      args: ['-e', 'bash', '-c', `cd '${escapedCwd}' && ${escapedCommand}; exec bash`],
    },
    {
      cmd: 'xfce4-terminal',
      args: ['-e', `bash -c "cd '${escapedCwd}' && ${escapedCommand}; exec bash"`],
    },
    { cmd: 'xterm', args: ['-hold', '-e', `cd '${escapedCwd}' && ${escapedCommand}`] },
  ];

  for (const term of terminals) {
    // Check if terminal emulator exists using 'which'
    const check = spawnSync('which', [term.cmd], { encoding: 'utf8' });
    if (check.status === 0) {
      spawn(term.cmd, term.args, {
        detached: true,
        stdio: 'ignore',
      }).unref();
      return true;
    }
  }

  return false; // No terminal emulator found
}

async function runCommand(command: string, inNewWindow: boolean): Promise<void> {
  if (inNewWindow) {
    clearScreen();
    renderHeader();
    console.log(
      `  ${colors.cyan}\u{1F5D7} Opening in new window:${colors.reset} ${colors.bold}${command}${colors.reset}\n`
    );
    const success = runCommandInNewWindow(command);
    if (success) {
      console.log(`  ${colors.green}\u2714 New terminal window opened${colors.reset}`);
    } else {
      console.log(`  ${colors.red}\u2716 Could not find a terminal emulator${colors.reset}`);
      console.log(
        `  ${colors.dim}Supported: gnome-terminal, konsole, xfce4-terminal, xterm${colors.reset}`
      );
    }
    console.log(`\n  ${colors.dim}Press any key to return to menu...${colors.reset}`);
    return;
  }

  clearScreen();
  renderHeader();
  console.log(
    `  ${colors.cyan}\u{1F680} Running:${colors.reset} ${colors.bold}${command}${colors.reset}\n`
  );
  console.log(`  ${colors.dim}${'─'.repeat(56)}${colors.reset}\n`);

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellFlag = isWindows ? '/c' : '-c';

    const child = spawn(shell, [shellFlag, command], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      console.log(`\n  ${colors.dim}${'─'.repeat(56)}${colors.reset}`);
      if (code === 0) {
        console.log(`\n  ${colors.green}\u2714 Command completed successfully${colors.reset}`);
      } else {
        console.log(`\n  ${colors.red}\u2716 Command exited with code ${code}${colors.reset}`);
      }
      console.log(`\n  ${colors.dim}Press any key to return to menu...${colors.reset}`);
      resolve();
    });

    child.on('error', (err) => {
      console.error(`\n  ${colors.red}\u2716 Error: ${err.message}${colors.reset}`);
      console.log(`\n  ${colors.dim}Press any key to return to menu...${colors.reset}`);
      resolve();
    });
  });
}

async function waitForKeypress(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

async function confirmAction(message: string): Promise<boolean> {
  clearScreen();
  renderHeader();
  console.log(`  ${colors.yellow}\u26A0 ${message}${colors.reset}`);
  console.log(`  ${colors.dim}Press Y to confirm, any other key to cancel...${colors.reset}`);

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (data) => {
      const key = data.toString().toLowerCase();
      resolve(key === 'y');
    });
  });
}

// Navigation key handlers - extracted to reduce complexity
type NavigationResult = { newIndex: number } | { action: 'quit' } | { action: 'select' } | null;

function handleNavigationKey(
  keyName: string,
  currentIndex: number,
  items: FlatMenuItem[]
): NavigationResult {
  const totalItems = items.length;

  switch (keyName) {
    case 'up':
    case 'k':
      return { newIndex: currentIndex > 0 ? currentIndex - 1 : totalItems - 1 };
    case 'down':
    case 'j':
      return { newIndex: currentIndex < totalItems - 1 ? currentIndex + 1 : 0 };
    case 'home':
      return { newIndex: 0 };
    case 'end':
      return { newIndex: totalItems - 1 };
    case 'return':
      return { action: 'select' };
    default:
      return null;
  }
}

function handleCategoryJump(
  keyName: string,
  currentIndex: number,
  items: FlatMenuItem[]
): NavigationResult {
  const currentCat = items[currentIndex].categoryIndex;
  const totalCategories = menuCategories.length;

  if (keyName === 'pageup') {
    const prevCatIndex = currentCat > 0 ? currentCat - 1 : totalCategories - 1;
    return { newIndex: items.findIndex((item) => item.categoryIndex === prevCatIndex) };
  }
  if (keyName === 'pagedown') {
    const nextCatIndex = currentCat < totalCategories - 1 ? currentCat + 1 : 0;
    return { newIndex: items.findIndex((item) => item.categoryIndex === nextCatIndex) };
  }
  return null;
}

function isQuitKey(keyName: string, ctrl: boolean): boolean {
  return keyName === 'q' || keyName === 'escape' || (ctrl && keyName === 'c');
}

// Search key handlers - extracted to reduce complexity
type SearchKeyResult =
  | { action: 'cancel' }
  | { action: 'backspace' }
  | { action: 'select' }
  | { action: 'navigate'; direction: 'up' | 'down' }
  | { action: 'input'; char: string }
  | null;

function handleSearchKey(
  str: string | undefined,
  key: { name: string; ctrl?: boolean; meta?: boolean }
): SearchKeyResult {
  if (key.name === 'escape') return { action: 'cancel' };
  if (key.name === 'backspace') return { action: 'backspace' };
  if (key.name === 'return') return { action: 'select' };
  if (key.name === 'up' || key.name === 'k') return { action: 'navigate', direction: 'up' };
  if (key.name === 'down' || key.name === 'j') return { action: 'navigate', direction: 'down' };

  // Printable character
  if (str && str.length === 1 && !key.ctrl && !key.meta) {
    return { action: 'input', char: str };
  }

  return null;
}

function isSearchTrigger(str: string | undefined, keyName: string): boolean {
  return keyName === 'slash' || str === '/';
}

async function main(): Promise<void> {
  // Check for interactive terminal
  if (!process.stdin.isTTY) {
    console.error(`${colors.red}Error: This CLI requires an interactive terminal.${colors.reset}`);
    console.log(`${colors.dim}Run directly: npm run cli${colors.reset}`);
    process.exit(1);
  }

  const allItems = flattenMenu();
  let filteredItems = allItems;
  let selectedIndex = 0;
  let running = true;
  let search: SearchState = { isActive: false, query: '' };

  // Helper to re-render with current state
  const render = (): void => {
    renderMenu(filteredItems, selectedIndex, search);
  };

  // Helper to update filtered items and reset selection
  const updateFilter = (): void => {
    filteredItems = filterItems(allItems, search.query);
    selectedIndex = filteredItems.length > 0 ? 0 : 0;
  };

  // Setup readline for keypress events
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  hideCursor();

  // Cleanup on exit
  const cleanup = (): void => {
    showCursor();
    clearScreen();
    console.log(`\n  ${colors.cyan}\u{1F44B} Goodbye! Happy coding!${colors.reset}\n`);
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Re-render on terminal resize
  process.stdout.on('resize', () => {
    if (running) {
      render();
    }
  });

  // Initial render
  render();

  // Navigate search results
  const navigateSearchResults = (direction: 'up' | 'down'): void => {
    if (filteredItems.length === 0) return;
    if (direction === 'up') {
      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredItems.length - 1;
    } else {
      selectedIndex = selectedIndex < filteredItems.length - 1 ? selectedIndex + 1 : 0;
    }
  };

  // Handle search mode key events
  const handleSearchModeKey = (
    str: string | undefined,
    key: { name: string; ctrl?: boolean; meta?: boolean }
  ): boolean => {
    const searchResult = handleSearchKey(str, key);
    if (!searchResult) return false;

    switch (searchResult.action) {
      case 'cancel':
        search = { isActive: false, query: '' };
        filteredItems = allItems;
        selectedIndex = 0;
        break;

      case 'backspace':
        if (search.query.length > 0) {
          search.query = search.query.slice(0, -1);
          updateFilter();
        }
        break;

      case 'navigate':
        navigateSearchResults(searchResult.direction);
        break;

      case 'input':
        search.query += searchResult.char;
        updateFilter();
        break;

      case 'select':
        if (filteredItems.length > 0) {
          search.isActive = false;
          return false; // Continue to selection handling
        }
        break;

      default:
        return false;
    }

    render();
    return true;
  };

  // Handle command execution after selection
  const executeSelectedCommand = async (): Promise<void> => {
    if (filteredItems.length === 0) return;

    running = false;
    showCursor();

    const selectedItem = filteredItems[selectedIndex];

    // Confirm dangerous commands
    if (selectedItem.dangerous) {
      const confirmed = await confirmAction(`Run "${selectedItem.command}"?`);
      if (!confirmed) {
        console.log(`\n  ${colors.dim}Cancelled.${colors.reset}`);
        await waitForKeypress();
        running = true;
        hideCursor();
        search = { isActive: false, query: '' };
        filteredItems = allItems;
        selectedIndex = selectedItem.originalIndex;
        render();
        return;
      }
    }

    process.stdin.setRawMode(false);
    await runCommand(selectedItem.command, selectedItem.newWindow);
    await waitForKeypress();
    process.stdin.setRawMode(true);

    running = true;
    hideCursor();
    search = { isActive: false, query: '' };
    filteredItems = allItems;
    selectedIndex = selectedItem.originalIndex;
    render();
  };

  // Handle keypresses
  process.stdin.on('keypress', async (str, key) => {
    if (!(running && key)) return;

    // Handle search mode
    if (search.isActive) {
      const handled = handleSearchModeKey(str, key);
      if (handled) return;
      // If not handled and it was a select action, fall through to execute
    }

    // Normal mode: '/' enters search mode
    if (!search.isActive && isSearchTrigger(str, key.name)) {
      search = { isActive: true, query: '' };
      render();
      return;
    }

    // Quit keys (only in normal mode)
    if (!search.isActive && isQuitKey(key.name, key.ctrl)) {
      cleanup();
      return;
    }

    // Navigation
    const result =
      handleNavigationKey(key.name, selectedIndex, filteredItems) ??
      handleCategoryJump(key.name, selectedIndex, filteredItems);

    if (!result) return;

    if ('newIndex' in result) {
      selectedIndex = result.newIndex;
      render();
    } else if (result.action === 'select') {
      await executeSelectedCommand();
    }
  });
}

main().catch((err) => {
  console.error('CLI Error:', err);
  showCursor();
  process.exit(1);
});
