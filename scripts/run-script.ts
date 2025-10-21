#!/usr/bin/env bun
import { select, confirm, cancel, intro, outro, spinner } from '@clack/prompts';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { spawn } from 'bun';
import pc from 'picocolors';

interface ScriptConfig {
  description: string;
  category: string;
}

interface ScriptConfigs {
  customScripts: Record<string, ScriptConfig>;
}

interface ScriptOption {
  value: string;
  label: string;
  hint?: string;
  category: string;
}

const CONFIG_PATH = resolve(__dirname, 'scripts-config.json');
const SCRIPTS_DIR = resolve(__dirname);

/**
 * Load script configurations from scripts-config.json
 */
function loadScriptConfigs(): ScriptConfigs {
  try {
    const configContent = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error(pc.red('Failed to load scripts-config.json:'), error);
    process.exit(1);
  }
}

/**
 * Get all custom TypeScript scripts from scripts directory
 */
function getCustomScripts(): string[] {
  try {
    const files = readdirSync(SCRIPTS_DIR);
    return files.filter(
      (file) =>
        file.endsWith('.ts') &&
        file !== 'run-script.ts' &&
        !file.startsWith('.')
    );
  } catch (error) {
    console.error(pc.red('Failed to read scripts directory:'), error);
    return [];
  }
}

/**
 * Build script options for the menu
 */
function buildScriptOptions(config: ScriptConfigs): ScriptOption[] {
  const options: ScriptOption[] = [];

  // Add custom scripts
  const customScripts = getCustomScripts();
  for (const scriptFile of customScripts) {
    const scriptConfig = config.customScripts[scriptFile];
    const scriptName = scriptFile.replace('.ts', '');

    options.push({
      value: `custom:${scriptFile}`,
      label: `${pc.magenta(scriptName)}`,
      hint: scriptConfig?.description || `Run ${scriptFile}`,
      category: scriptConfig?.category || 'Scripts',
    });
  }

  return options;
}

/**
 * Group options by category
 */
function groupByCategory(options: ScriptOption[]): Record<string, ScriptOption[]> {
  const grouped: Record<string, ScriptOption[]> = {};

  for (const option of options) {
    if (!grouped[option.category]) {
      grouped[option.category] = [];
    }
    grouped[option.category].push(option);
  }

  return grouped;
}

/**
 * Execute a custom TypeScript script
 */
async function executeScript(scriptValue: string): Promise<boolean> {
  const [type, scriptFile] = scriptValue.split(':');

  if (type !== 'custom') {
    return false;
  }

  const s = spinner();
  const scriptPath = join(SCRIPTS_DIR, scriptFile);
  const scriptName = scriptFile.replace('.ts', '');
  s.start(`Running ${pc.magenta(scriptName)}...`);

  try {
    const proc = spawn(['bun', scriptPath], {
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      s.stop(pc.green(`✓ ${scriptName} completed successfully`));
      return true;
    } else {
      s.stop(pc.red(`✗ ${scriptName} failed with exit code ${exitCode}`));
      return false;
    }
  } catch (error) {
    s.stop(pc.red(`✗ ${scriptName} failed`));
    console.error(pc.red('Error:'), error);
    return false;
  }
}

/**
 * Display the main menu and handle script selection
 */
async function showMenu(): Promise<void> {
  console.clear();
  intro(pc.bgCyan(pc.black(' Script Runner ')));

  const config = loadScriptConfigs();
  const scriptOptions = buildScriptOptions(config);
  const groupedOptions = groupByCategory(scriptOptions);

  // Create categorized options with separators
  const selectOptions: Array<{ value: string; label: string; hint?: string }> = [];

  const categoryOrder = [
    'Database',
    'Development',
    'Utilities',
    'Scripts',
  ];

  for (const category of categoryOrder) {
    if (groupedOptions[category]) {
      // Add category header
      selectOptions.push({
        value: `separator:${category}`,
        label: pc.bold(pc.underline(`\n${category}`)),
        hint: '',
      });

      // Add scripts in this category
      selectOptions.push(...groupedOptions[category]);
    }
  }

  // Add any remaining categories not in the order list
  for (const category of Object.keys(groupedOptions)) {
    if (!categoryOrder.includes(category)) {
      selectOptions.push({
        value: `separator:${category}`,
        label: pc.bold(pc.underline(`\n${category}`)),
        hint: '',
      });
      selectOptions.push(...groupedOptions[category]);
    }
  }

  // Add exit option
  selectOptions.push({
    value: 'exit',
    label: pc.red('\nExit'),
    hint: 'Quit the script runner',
  });

  const selected = await select({
    message: 'Select a script to run:',
    options: selectOptions.filter((opt) => !opt.value.startsWith('separator:')),
  });

  if (typeof selected === 'symbol') {
    cancel('Operation cancelled');
    process.exit(0);
  }

  if (selected === 'exit') {
    outro(pc.cyan('Goodbye!'));
    process.exit(0);
  }

  console.log(''); // Add spacing

  // Execute the selected script
  const success = await executeScript(selected as string);

  console.log(''); // Add spacing

  // Show success/error message
  if (success) {
    console.log(pc.green('━'.repeat(50)));
    console.log(pc.green('✓ Script completed successfully'));
    console.log(pc.green('━'.repeat(50)));
  } else {
    console.log(pc.red('━'.repeat(50)));
    console.log(pc.red('✗ Script failed'));
    console.log(pc.red('━'.repeat(50)));
  }

  console.log(''); // Add spacing

  // Ask if user wants to run another script
  const runAnother = await confirm({
    message: 'Run another script?',
    initialValue: true,
  });

  if (runAnother) {
    await showMenu();
  } else {
    outro(pc.cyan('Thanks for using Script Runner!'));
    process.exit(0);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    await showMenu();
  } catch (error) {
    if (error instanceof Error && error.message.includes('cancelled')) {
      cancel('Operation cancelled');
      process.exit(0);
    }

    console.error(pc.red('Unexpected error:'), error);
    process.exit(1);
  }
}

main();
