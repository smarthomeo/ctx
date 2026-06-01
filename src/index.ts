import { Command } from 'commander';

const program = new Command();

program
  .name('ctx')
  .description('Terminal context manager for AI coding agents')
  .version('0.1.0');

// TODO: Implement commands - see SPEC.md

program.parse();
