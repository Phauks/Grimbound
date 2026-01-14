/**
 * Menu configuration for the Developer CLI Tool
 *
 * Edit this file to customize available commands.
 */

// ANSI color codes (no external dependencies)
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgWhite: '\x1b[47m',
  white: '\x1b[37m',
};

export interface MenuItem {
  label: string;
  command: string;
  description?: string;
  newWindow?: boolean; // Open in new terminal window
  dangerous?: boolean; // Requires confirmation before running
}

export interface MenuCategory {
  name: string;
  icon: string;
  color: string;
  items: MenuItem[];
}

export const menuCategories: MenuCategory[] = [
  {
    name: 'Development',
    icon: '\u{1F6E0}',
    color: colors.green,
    items: [
      {
        label: 'Start dev server',
        command: 'npm run dev',
        description: 'Vite + TypeScript watch',
        newWindow: true,
      },
      {
        label: 'Dev with tests',
        command: 'npm run dev:test',
        description: 'Dev + Vitest watch',
        newWindow: true,
      },
      {
        label: 'Vite only',
        command: 'npm run dev:serve',
        description: 'Vite dev server only',
        newWindow: true,
      },
      {
        label: 'TypeScript watch',
        command: 'npm run dev:tsc',
        description: 'tsc --watch only',
        newWindow: true,
      },
      {
        label: 'Worker dev',
        command: 'npm run dev:worker',
        description: 'Wrangler local dev',
        newWindow: true,
      },
    ],
  },
  {
    name: 'Testing',
    icon: '\u{1F9EA}',
    color: colors.cyan,
    items: [
      { label: 'Run tests', command: 'npm run test', description: 'Vitest once', newWindow: true },
      {
        label: 'Watch mode',
        command: 'npm run test:watch',
        description: 'Vitest watch',
        newWindow: true,
      },
      {
        label: 'Test UI',
        command: 'npm run test:ui',
        description: 'Vitest browser UI',
        newWindow: true,
      },
      {
        label: 'Coverage',
        command: 'npm run test:coverage',
        description: 'With coverage report',
        newWindow: true,
      },
      {
        label: 'E2E tests',
        command: 'npm run test:e2e',
        description: 'Playwright',
        newWindow: true,
      },
      {
        label: 'E2E with UI',
        command: 'npm run test:e2e:ui',
        description: 'Playwright UI mode',
        newWindow: true,
      },
      {
        label: 'E2E headed',
        command: 'npm run test:e2e:headed',
        description: 'Playwright visible browser',
        newWindow: true,
      },
      {
        label: 'All tests',
        command: 'npm run test:all',
        description: 'Coverage + E2E',
        newWindow: true,
      },
    ],
  },
  {
    name: 'Code Quality',
    icon: '\u{2728}',
    color: colors.yellow,
    items: [
      {
        label: 'Lint check',
        command: 'npm run lint',
        description: 'Biome + TypeScript',
        newWindow: true,
      },
      {
        label: 'Lint fix',
        command: 'npm run lint:fix',
        description: 'Auto-fix issues',
        newWindow: true,
      },
      {
        label: 'Type check',
        command: 'npm run typecheck',
        description: 'TypeScript only',
        newWindow: true,
      },
      {
        label: 'Biome check',
        command: 'npm run biome:check',
        description: 'Biome lint only',
        newWindow: true,
      },
      {
        label: 'Biome fix',
        command: 'npm run biome:fix',
        description: 'Biome auto-fix',
        newWindow: true,
      },
      { label: 'Format', command: 'npm run format', description: 'Biome format', newWindow: true },
      {
        label: 'Find unused',
        command: 'npm run knip',
        description: 'Dead code detection',
        newWindow: true,
      },
      {
        label: 'Validate all',
        command: 'npm run validate',
        description: 'Lint + Test + Build',
        newWindow: true,
      },
    ],
  },
  {
    name: 'Storybook',
    icon: '\u{1F4DA}',
    color: colors.magenta,
    items: [
      {
        label: 'Dev server',
        command: 'npm run storybook',
        description: 'Start on port 6006',
        newWindow: true,
      },
      {
        label: 'Build static',
        command: 'npm run build-storybook',
        description: 'Build for deployment',
        newWindow: true,
      },
    ],
  },
  {
    name: 'Build & Deploy',
    icon: '\u{1F680}',
    color: colors.blue,
    items: [
      {
        label: 'Build',
        command: 'npm run vite-build',
        description: 'Production build',
        newWindow: true,
      },
      {
        label: 'Build (analyze)',
        command: 'npm run build:analyze',
        description: 'With bundle visualizer',
        newWindow: true,
      },
      {
        label: 'Preview',
        command: 'npm run preview',
        description: 'Preview build locally',
        newWindow: true,
      },
      {
        label: 'Deploy',
        command: 'npm run deploy',
        description: 'Cloudflare Pages',
        newWindow: true,
        dangerous: true,
      },
      {
        label: 'Deploy preview',
        command: 'npm run deploy:preview',
        description: 'Preview environment',
        newWindow: true,
        dangerous: true,
      },
      {
        label: 'TypeScript build',
        command: 'npm run build',
        description: 'tsc compile',
        newWindow: true,
      },
    ],
  },
  {
    name: 'Pre-commit & Release',
    icon: '\u{1F4CB}',
    color: colors.gray,
    items: [
      {
        label: 'Precommit',
        command: 'npm run precommit',
        description: 'Lint + Test + Build',
        newWindow: true,
      },
      {
        label: 'Precommit (quick)',
        command: 'npm run precommit:quick',
        description: 'Lint + Test only',
        newWindow: true,
      },
      {
        label: 'Prerelease',
        command: 'npm run prerelease',
        description: 'Full release checks',
        newWindow: true,
      },
      {
        label: 'Lint-staged',
        command: 'npx lint-staged',
        description: 'Run on staged files',
        newWindow: true,
      },
    ],
  },
  {
    name: 'Claude Code',
    icon: '\u{1F916}',
    color: colors.cyan,
    items: [
      {
        label: 'Start Claude',
        command: 'claude',
        description: 'Open Claude Code CLI',
        newWindow: true,
      },
      {
        label: 'Update Claude',
        command: 'claude update',
        description: 'Update to latest',
        newWindow: true,
      },
      { label: 'Claude help', command: 'claude --help', description: 'Show help' },
    ],
  },
  {
    name: 'Git',
    icon: '\u{1F500}',
    color: colors.red,
    items: [
      { label: 'Status', command: 'git status', description: 'Working tree status' },
      { label: 'Diff', command: 'git diff', description: 'Show changes' },
      { label: 'Log (short)', command: 'git log --oneline -10', description: 'Last 10 commits' },
      { label: 'Pull', command: 'git pull', description: 'Fetch and merge' },
      { label: 'Push', command: 'git push', description: 'Push to remote', dangerous: true },
      { label: 'Branches', command: 'git branch -a', description: 'List all branches' },
    ],
  },
  {
    name: 'Maintenance',
    icon: '\u{1F9F9}',
    color: colors.dim,
    items: [
      {
        label: 'Clean all',
        command: 'npm run clean:all',
        description: 'Remove build artifacts',
        dangerous: true,
      },
      {
        label: 'Clean dist',
        command: 'npm run clean',
        description: 'Remove dist/js',
        dangerous: true,
      },
      {
        label: 'Clean coverage',
        command: 'npm run clean:coverage',
        description: 'Remove coverage',
        dangerous: true,
      },
      { label: 'Audit deps', command: 'npm audit', description: 'Security audit' },
      { label: 'Outdated', command: 'npm outdated', description: 'Check for updates' },
      { label: 'Install', command: 'npm install', description: 'Install dependencies' },
    ],
  },
  {
    name: 'Info',
    icon: '\u{2139}',
    color: colors.gray,
    items: [
      { label: 'Node version', command: 'node --version', description: 'Show Node.js version' },
      { label: 'npm version', command: 'npm --version', description: 'Show npm version' },
      {
        label: 'Package info',
        command: 'npm pkg get name version',
        description: 'Show package name/version',
      },
      {
        label: 'Disk usage',
        command: 'du -sh node_modules 2>/dev/null || dir node_modules',
        description: 'node_modules size',
      },
    ],
  },
];
