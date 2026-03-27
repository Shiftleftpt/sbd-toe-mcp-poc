/**
 * AI Disclosure Validation — S8 Governança de Documentos AI-Assisted
 * 
 * SbD-ToE Cap. 14 (Governança, Revisões, Conformidade):
 * Artefactos IA-gerados sujeitos a rastreabilidade explícita, revisão humana e validação automática.
 * 
 * Formato suportado:
 * - YAML frontmatter (--- AI_ASSISTED: true ... ---)
 * - HTML comment section (<!-- AI-ASSISTED: true, ... -->)
 * 
 * Campos obrigatórios: AI_ASSISTED, MODEL, DATE, PURPOSE
 */


export const ALLOWED_PURPOSES = [
  'generated-code',
  'governance-doc',
  'test-plan',
  'integration-test',
  'documentation',
  'other',
] as const;

export type AllowedPurpose = (typeof ALLOWED_PURPOSES)[number];

export interface AIDisclosure {
  ai_assisted: boolean;
  model: string;
  date: string; // YYYY-MM-DD
  purpose: AllowedPurpose;
  reasoning?: string | undefined;
  review_status?: string | undefined;
}

/**
 * Valida formato YYYY-MM-DD
 */
function isValidDate(dateStr: string): boolean {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateStr)) return false;
  const dt = new Date(dateStr);
  return !Number.isNaN(dt.getTime()) && dt instanceof Date;
}

/**
 * Parse YAML frontmatter (--- ... ---)
 */
function parseYAMLFrontmatter(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('---')) return null;

  const endIdx = trimmed.indexOf('---', 3); // busca segundo ---
  if (endIdx === -1) return null;

  const yamlBlock = trimmed.slice(3, endIdx).trim();
  if (!yamlBlock) return null;

  const result: Record<string, unknown> = {};
  for (const line of yamlBlock.split('\n')) {
    const trimLine = line.trim();
    if (!trimLine || trimLine.startsWith('#')) continue;

    const colonIdx = trimLine.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimLine.slice(0, colonIdx).trim().toLowerCase().replace(/-/g, '_');
    let rawValue: string = trimLine.slice(colonIdx + 1).trim();
    let value: unknown = rawValue;

    // Parse value
    if (rawValue === 'true') {
      value = true;
    } else if (rawValue === 'false') {
      value = false;
    } else if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      value = rawValue.slice(1, -1);
    } else if (rawValue.startsWith("'") && rawValue.endsWith("'")) {
      value = rawValue.slice(1, -1);
    }

    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parse HTML comment section (<!-- AI-ASSISTED: true, MODEL: ..., ... -->)
 */
function parseHTMLCommentSection(content: string): Record<string, unknown> | null {
  const re = /<!--\s*AI-ASSISTED:\s*([^,]+)(.*?)\s*-->/is;
  const match = content.match(re);
  if (!match) return null;

  const fullComment = match[0];
  const result: Record<string, unknown> = {};

  // Extract AI-ASSISTED: true/false
  const aiValue = (match[1] ?? '').trim().toLowerCase();
  result.ai_assisted = aiValue === 'true' ? true : aiValue === 'false' ? false : null;

  // Parse remaining key:value pairs (MODEL, DATE, PURPOSE, etc.)
  // Pattern: KEY: VALUE (comma-separated)
  // Extract inner content of <!-- ... --> using slice to avoid HTML-manipulation patterns.
  const pairs = fullComment.slice(4, -3).trim().split(',');

  for (let i = 1; i < pairs.length; i++) {
    const pairRaw = pairs[i];
    const pair = pairRaw !== undefined ? pairRaw.trim() : '';
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;

    const key = pair.slice(0, colonIdx).trim().toLowerCase().replace(/-/g, '_');
    const rawVal = pair.slice(colonIdx + 1).trim();
    let value: unknown = rawVal;
    if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
      value = rawVal.slice(1, -1);
    } else if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
      value = rawVal.slice(1, -1);
    }

    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Extract disclosure from file content
 * Tries YAML frontmatter first, then HTML comment section
 */
export function extractDisclosure(content: string): Record<string, unknown> | null {
  let disclosure = parseYAMLFrontmatter(content);
  if (disclosure) return disclosure;

  disclosure = parseHTMLCommentSection(content);
  if (disclosure) return disclosure;

  return null;
}

/**
 * Validate disclosure fields and return structured object
 * Throws on validation failure
 */
export function validateDisclosure(disclosure: Record<string, unknown>): AIDisclosure {
  // Check AI_ASSISTED
  if (disclosure.ai_assisted !== true) {
    throw new Error('AI_ASSISTED must be true');
  }

  // Check MODEL
  const model = disclosure.model;
  if (!model || typeof model !== 'string') {
    throw new Error('MODEL is required and must be a non-empty string');
  }
  if (model.trim().length === 0) {
    throw new Error('MODEL cannot be empty');
  }

  // Check DATE
  const date = disclosure.date;
  if (!date || typeof date !== 'string') {
    throw new Error('DATE is required and must be a string (format: YYYY-MM-DD)');
  }
  if (!isValidDate(date)) {
    throw new Error(`DATE must be in YYYY-MM-DD format, got: ${date}`);
  }

  // Check PURPOSE
  const purpose = disclosure.purpose;
  if (!purpose || typeof purpose !== 'string') {
    throw new Error('PURPOSE is required and must be a string');
  }
  if (!ALLOWED_PURPOSES.includes(purpose as AllowedPurpose)) {
    throw new Error(
      `PURPOSE must be one of: ${ALLOWED_PURPOSES.join(', ')}, got: ${purpose}`
    );
  }

  const reasoningVal = typeof disclosure.reasoning === 'string' ? disclosure.reasoning : undefined;
  const reviewVal = typeof disclosure.review_status === 'string' ? disclosure.review_status : undefined;

  const result: AIDisclosure = {
    ai_assisted: true,
    model: model.trim(),
    date,
    purpose: purpose as AllowedPurpose,
  };
  if (reasoningVal !== undefined) result.reasoning = reasoningVal;
  if (reviewVal !== undefined) result.review_status = reviewVal;
  return result;
}

/**
 * Main validation function:
 * 1. Extract disclosure from content
 * 2. Validate all fields
 * 3. Return structured AIDisclosure or throw error with field information
 */
export function validateAIDisclosure(content: string): AIDisclosure {
  const disclosure = extractDisclosure(content);
  if (!disclosure) {
    throw new Error('No AI disclosure found in document header');
  }
  return validateDisclosure(disclosure);
}
