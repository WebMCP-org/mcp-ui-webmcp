#!/usr/bin/env node

/**
 * create-webmcp-app
 *
 * Interactive CLI for scaffolding new WebMCP applications.
 * Allows users to choose between vanilla HTML/JS or React templates.
 */

import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import pc from 'picocolors';

interface Template {
  name: string;
  value: string;
  description: string;
  hint: string;
}

const templates: Template[] = [
  {
    name: 'Vanilla (No Build Step)',
    value: 'vanilla',
    description: 'Pure HTML/CSS/JavaScript - perfect for learning',
    hint: 'No npm dependencies, just open index.html and start coding!',
  },
  {
    name: 'React (Full-Featured)',
    value: 'react',
    description: 'React + TypeScript + Vite - best for production apps',
    hint: 'Hot module replacement, TypeScript, component architecture',
  },
];

/**
 * Main CLI entry point for create-webmcp-app.
 * Prompts user for project path, template choice, and dependency installation,
 * then scaffolds the selected WebMCP template.
 *
 * @returns Promise that resolves when project creation completes
 * @example
 * ```bash
 * npx create-webmcp-app
 * # User is prompted for:
 * # 1. Project path
 * # 2. Template choice (vanilla or react)
 * # 3. Whether to install dependencies
 * ```
 */
async function main() {
  console.clear();

  p.intro(pc.bgCyan(pc.black(' create-webmcp-app ')));

  const project = await p.group(
    {
      path: () =>
        p.text({
          message: 'Where should we create your project?',
          placeholder: './my-webmcp-app',
          validate: (value) => {
            if (!value) return 'Please enter a path';
            if (existsSync(value)) return 'Directory already exists';
          },
        }),

      template: () =>
        p.select<{ value: string }[], string>({
          message: 'Which template would you like to use?',
          options: templates.map((t) => ({
            value: t.value,
            label: t.name,
            hint: t.hint,
          })),
        }),

      install: () =>
        p.confirm({
          message: 'Install dependencies?',
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.');
        process.exit(0);
      },
    }
  );

  const s = p.spinner();

  // Create project directory
  s.start('Creating project directory');
  const targetDir = resolve(project.path as string);
  mkdirSync(targetDir, { recursive: true });
  s.stop('Project directory created');

  // Copy template files
  s.start('Copying template files');
  const templateType = project.template as string; // 'vanilla' or 'react'
  const templateSource = join(__dirname, '..', 'templates', templateType);

  if (!existsSync(templateSource)) {
    p.cancel(`Template not found: ${templateType}`);
    process.exit(1);
  }

  copyTemplate(templateSource, targetDir, templateType);
  s.stop('Template files copied');

  // Install dependencies
  if (project.install) {
    s.start('Installing dependencies');
    try {
      execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' });
      s.stop('Dependencies installed');
    } catch (error) {
      s.stop('Failed to install dependencies');
      p.note(
        `You can install them manually:\n  cd ${project.path}\n  pnpm install`,
        'Installation failed'
      );
    }
  }

  // Success message
  p.outro(
    `${pc.green('✓')} Project created successfully!\n\n` +
      `${pc.bold('Next steps:')}\n` +
      `  cd ${project.path}\n` +
      (project.install ? '' : `  pnpm install\n`) +
      `  pnpm dev\n\n` +
      `${pc.bold('Template info:')}\n` +
      `  ${templates.find((t) => t.value === project.template)?.description}\n\n` +
      `${pc.dim('Happy coding! 🚀')}`
  );
}

/**
 * Copies template files from source to target directory, excluding build artifacts.
 * Updates package.json with project-specific name and creates environment variable files.
 *
 * @param source - Absolute path to template source directory
 * @param target - Absolute path to target project directory
 * @param templateType - Type of template ('vanilla' or 'react') for port configuration
 * @example
 * ```typescript
 * copyTemplate(
 *   '/path/to/webmcp-template',
 *   '/path/to/my-project',
 *   'react'
 * );
 * // Creates project with updated package.json and environment files
 * ```
 */
function copyTemplate(source: string, target: string, templateType: string) {
  // Files/directories to exclude
  const exclude = [
    'node_modules',
    'dist',
    '.git',
    '.turbo',
    'tsconfig.tsbuildinfo',
    'worker-configuration.d.ts',
    '.dev.vars',
    '.prod.vars',
  ];

  // Copy all files except excluded ones
  cpSync(source, target, {
    recursive: true,
    filter: (src) => {
      const relativePath = src.replace(source, '');
      return !exclude.some((ex) => relativePath.includes(ex));
    },
  });

  // Update package.json name
  const pkgPath = join(target, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const dirName = target.split('/').pop() || 'my-webmcp-app';
    pkg.name = dirName;
    pkg.private = true;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }

  // Create .dev.vars
  const devVars = templateType === 'vanilla'
    ? 'APP_URL=http://localhost:8889\n'
    : 'APP_URL=http://localhost:8888\n';
  writeFileSync(join(target, '.dev.vars'), devVars);

  // Create .prod.vars
  const prodVars = `# Production environment variables
# ⚠️ IMPORTANT: Change this to YOUR deployed Cloudflare Worker URL
# Example: APP_URL=https://your-app.your-username.workers.dev
APP_URL=https://your-worker-name.workers.dev
`;
  writeFileSync(join(target, '.prod.vars'), prodVars);
}

main().catch((error) => {
  p.cancel('An error occurred');
  console.error(error);
  process.exit(1);
});
