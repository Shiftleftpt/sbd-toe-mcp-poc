#!/usr/bin/env node

/**
 * Validate AI-Assisted Disclosure in Project Files
 * 
 * Usage:
 *   node scripts/validate-ai-disclosure.mjs [--check] [--include-ao] [--include-docs]
 * 
 * SbD-ToE Cap. 14: Governança, Revisões e Conformidade
 * Valida que toda documentação AI-assistida tenha disclosure explícita para rastreabilidade.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const projectRoot = join(__dirname, '..');

// ============================================================================
// Validation Logic (mirrored from src/validators/ai-disclosure.ts)
// ============================================================================

const ALLOWED_PURPOSES = [
  'generated-code',
  'governance-doc',
  'test-plan',
  'integration-test',
  'documentation',
  'other',
];

function isValidDate(dateStr) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateStr)) return false;
  const dt = new Date(dateStr);
  return !Number.isNaN(dt.getTime()) && dt instanceof Date;
}

function parseYAMLFrontmatter(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith('---')) return null;

  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) return null;

  const yamlBlock = trimmed.slice(3, endIdx).trim();
  if (!yamlBlock) return null;

  const result = {};
  for (const line of yamlBlock.split('\n')) {
    const trimLine = line.trim();
    if (!trimLine || trimLine.startsWith('#')) continue;

    const colonIdx = trimLine.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimLine.slice(0, colonIdx).trim().toLowerCase().replace(/-/g, '_');
    let value = trimLine.slice(colonIdx + 1).trim();

    if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function parseHTMLCommentSection(content) {
  const re = /<!--\s*AI-ASSISTED:\s*([^,]+)(.*?)\s*-->/is;
  const match = content.match(re);
  if (!match) return null;

  const fullComment = match[0];
  const result = {};

  const aiValue = match[1].trim().toLowerCase();
  result.ai_assisted = aiValue === 'true' ? true : aiValue === 'false' ? false : null;

  const pairs = fullComment
    .replace(/<!--\s*/, '')
    .replace(/\s*-->/g, '')
    .split(',');

  for (let i = 1; i < pairs.length; i++) {
    const pair = pairs[i].trim();
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;

    const key = pair.slice(0, colonIdx).trim().toLowerCase().replace(/-/g, '_');
    let value = pair.slice(colonIdx + 1).trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function extractDisclosure(content) {
  let disclosure = parseYAMLFrontmatter(content);
  if (disclosure) return disclosure;

  disclosure = parseHTMLCommentSection(content);
  if (disclosure) return disclosure;

  return null;
}

function validateDisclosure(disclosure) {
  const errors = [];

  if (disclosure.ai_assisted !== true) {
    errors.push('AI_ASSISTED must be true');
  }

  const model = disclosure.model;
  if (!model || typeof model !== 'string') {
    errors.push('MODEL is required and must be a non-empty string');
  } else if (model.trim().length === 0) {
    errors.push('MODEL cannot be empty');
  }

  const date = disclosure.date;
  if (!date || typeof date !== 'string') {
    errors.push('DATE is required and must be a string (format: YYYY-MM-DD)');
  } else if (!isValidDate(date)) {
    errors.push(`DATE must be in YYYY-MM-DD format, got: ${date}`);
  }

  const purpose = disclosure.purpose;
  if (!purpose || typeof purpose !== 'string') {
    errors.push('PURPOSE is required and must be a string');
  } else if (!ALLOWED_PURPOSES.includes(purpose)) {
    errors.push(`PURPOSE must be one of: ${ALLOWED_PURPOSES.join(', ')}, got: ${purpose}`);
  }

  return errors;
}

function validateAIDisclosure(content) {
  const disclosure = extractDisclosure(content);

  // No disclosure found → treat as human-authored (opt-in model)
  // Only fail if disclosure is present but incomplete/invalid
  if (!disclosure) {
    return { valid: true, skipped: true };
  }

  // If ai_assisted key not present → human-authored, skip
  if (!Object.prototype.hasOwnProperty.call(disclosure, 'ai_assisted')) {
    return { valid: true, skipped: true };
  }

  // If ai_assisted: false → human opted-out, skip
  if (disclosure.ai_assisted === false) {
    return { valid: true, skipped: true };
  }

  const errors = validateDisclosure(disclosure);
  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  return { valid: true, disclosure };
}

// ============================================================================
// File Globbing and Validation
// ============================================================================

const MONITORED_DIRS = [
  'aos',
  'docs/requests',
  'docs/governors',
  join('.github', 'skills'),
];

/** Recursively collect all .md files under dir */
function collectMdFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function getMonitoredFiles() {
  const files = [];
  for (const dir of MONITORED_DIRS) {
    files.push(...collectMdFiles(join(projectRoot, dir)));
  }
  return [...new Set(files)]; // Deduplicate
}

function validateFile(filePath) {
  if (!existsSync(filePath)) {
    return { valid: false, error: `File not found: ${filePath}` };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return validateAIDisclosure(content);
  } catch (err) {
    return { valid: false, error: `Read error: ${err.message}` };
  }
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const isCheckMode = args.includes('--check');
  const includeAO = args.includes('--include-ao');
  const includeDocs = args.includes('--include-docs');

  const files = getMonitoredFiles();
  const results = {};
  let failCount = 0;
  let skipCount = 0;
  let passCount = 0;

  for (const file of files) {
    const result = validateFile(file);
    results[file] = result;

    if (!result.valid) {
      failCount++;
      const relPath = relative(projectRoot, file);
      console.error(`✗ ${relPath}`);
      console.error(`  → ${result.error}`);
    } else if (result.skipped) {
      skipCount++;
    } else {
      passCount++;
    }
  }

  // Summary
  console.log(`\n[AI Disclosure Validation] ${passCount} valid, ${skipCount} human-authored (skipped), ${failCount} invalid`);

  if (failCount > 0) {
    console.error(`\n❌ ${failCount} file(s) have invalid/incomplete AI disclosure`);
    if (isCheckMode) {
      console.error('See documentation in docs/governors/AI-ASSISTED-TEMPLATE.md');
    }
    process.exit(1);
  } else {
    console.log('✅ All disclosed AI documents are valid\n');
    process.exit(0);
  }
}

main();
