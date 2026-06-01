#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { runInit } from './commands/init.js';
import { runUpdate } from './commands/update.js';
import { runCheck } from './commands/check.js';
import { runIgnore } from './commands/ignore.js';

const program = new Command();

program
  .name('ctx')
  .description('Terminal context manager for AI coding agents')
  .version('0.1.0');

program
  .command('init')
  .description('Scan the project and generate .ctx.md')
  .option('-d, --depth <n>', 'directory scan depth', (v) => Number.parseInt(v, 10), 3)
  .option('-o, --output <path>', 'output file path')
  .option('-f, --format <fmt>', 'output format: md|json', 'md')
  .option('-i, --ignore <patterns>', 'comma-separated additional ignore patterns', (v) => v.split(',').map((p) => p.trim()).filter(Boolean))
  .option('--dry-run', 'do not write any files', false)
  .action(async (opts: { depth: number; output?: string; format: string; ignore?: string[]; dryRun: boolean }) => {
    try {
      const format = opts.format === 'json' ? 'json' : 'md';
      const result = runInit({
        rootPath: process.cwd(),
        outputPath: opts.output ?? (format === 'json' ? '.ctx.json' : '.ctx.md'),
        format,
        depth: opts.depth,
        ignore: opts.ignore ?? [],
        dryRun: opts.dryRun,
      });
      if (opts.dryRun) {
        process.stdout.write(result.content);
      }
    } catch (err) {
      process.stderr.write(chalk.red(`Error: ${(err as Error).message}\n`));
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Re-scan the project and update .ctx.md')
  .option('-d, --depth <n>', 'directory scan depth', (v) => Number.parseInt(v, 10), 3)
  .option('-o, --output <path>', 'output file path')
  .option('-f, --format <fmt>', 'output format: md|json', 'md')
  .option('-i, --ignore <patterns>', 'comma-separated additional ignore patterns', (v) => v.split(',').map((p) => p.trim()).filter(Boolean))
  .option('--dry-run', 'do not write any files', false)
  .option('--show-diff', 'always show the diff summary', false)
  .action(async (opts: { depth: number; output?: string; format: string; ignore?: string[]; dryRun: boolean; showDiff: boolean }) => {
    try {
      const format = opts.format === 'json' ? 'json' : 'md';
      runUpdate({
        rootPath: process.cwd(),
        outputPath: opts.output ?? (format === 'json' ? '.ctx.json' : '.ctx.md'),
        format,
        depth: opts.depth,
        ignore: opts.ignore ?? [],
        dryRun: opts.dryRun,
        showDiff: opts.showDiff,
      });
    } catch (err) {
      process.stderr.write(chalk.red(`Error: ${(err as Error).message}\n`));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check whether .ctx.md is up to date')
  .option('-d, --depth <n>', 'directory scan depth', (v) => Number.parseInt(v, 10), 3)
  .option('-o, --output <path>', 'context file path')
  .option('-f, --format <fmt>', 'output format: md|json', 'md')
  .option('-i, --ignore <patterns>', 'comma-separated additional ignore patterns', (v) => v.split(',').map((p) => p.trim()).filter(Boolean))
  .action(async (opts: { depth: number; output?: string; format: string; ignore?: string[] }) => {
    try {
      const format = opts.format === 'json' ? 'json' : 'md';
      const result = runCheck({
        rootPath: process.cwd(),
        outputPath: opts.output ?? (format === 'json' ? '.ctx.json' : '.ctx.md'),
        format,
        depth: opts.depth,
        ignore: opts.ignore ?? [],
      });
      process.exit(result.exitCode);
    } catch (err) {
      process.stderr.write(chalk.red(`Error: ${(err as Error).message}\n`));
      process.exit(1);
    }
  });

program
  .command('ignore <pattern>')
  .description('Add a pattern to .ctxignore')
  .action((pattern: string) => {
    try {
      const result = runIgnore({ rootPath: process.cwd(), pattern });
      if (result.added) {
        process.stdout.write(chalk.green(`Added "${result.pattern}" to ${result.ctxignorePath}\n`));
      } else {
        process.stdout.write(chalk.yellow(`"${result.pattern}" is already in ${result.ctxignorePath}\n`));
      }
    } catch (err) {
      process.stderr.write(chalk.red(`Error: ${(err as Error).message}\n`));
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(chalk.red(`Error: ${(err as Error).message}\n`));
  process.exit(1);
});
