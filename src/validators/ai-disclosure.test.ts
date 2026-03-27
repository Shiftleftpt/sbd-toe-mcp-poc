import { describe, it, expect } from 'vitest';
import {
  extractDisclosure,
  validateDisclosure,
  validateAIDisclosure,
  ALLOWED_PURPOSES,
} from './ai-disclosure.js';

describe('AI Disclosure Validator', () => {
  describe('YAML Frontmatter Parsing', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: governance-doc
---
# Content here`;

      const disclosure = extractDisclosure(content);
      expect(disclosure).not.toBeNull();
      expect(disclosure?.ai_assisted).toBe(true);
      expect(disclosure?.model).toBe('Claude Haiku 4.5');
      expect(disclosure?.date).toBe('2026-03-24');
      expect(disclosure?.purpose).toBe('governance-doc');
    });

    it('should parse YAML with optional fields', () => {
      const content = `---
ai_assisted: true
model: Claude 3.5 Sonnet
date: 2026-01-10
purpose: generated-code
reasoning: Auto-generated from template
review_status: pending-human-review
---
Code...`;

      const disclosure = extractDisclosure(content);
      expect(disclosure?.reasoning).toBe('Auto-generated from template');
      expect(disclosure?.review_status).toBe('pending-human-review');
    });

    it('should handle YAML with quoted strings', () => {
      const content = `---
ai_assisted: true
model: "Claude Haiku 4.5 (pt-BR)"
date: "2026-03-24"
purpose: "governance-doc"
---
Content`;

      const disclosure = extractDisclosure(content);
      expect(disclosure?.model).toBe('Claude Haiku 4.5 (pt-BR)');
    });

    it('should ignore YAML comments', () => {
      const content = `---
# This is a comment
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: test-plan
# Another comment
---
Content`;

      const disclosure = extractDisclosure(content);
      expect(disclosure?.purpose).toBe('test-plan');
    });
  });

  describe('HTML Comment Section Parsing', () => {
    it('should parse HTML comment disclosure', () => {
      const content = `<!-- AI-ASSISTED: true, MODEL: Claude Haiku 4.5, DATE: 2026-03-24, PURPOSE: governance-doc -->
# Content here`;

      const disclosure = extractDisclosure(content);
      expect(disclosure?.ai_assisted).toBe(true);
      expect(disclosure?.model).toBe('Claude Haiku 4.5');
      expect(disclosure?.date).toBe('2026-03-24');
      expect(disclosure?.purpose).toBe('governance-doc');
    });

    it('should handle HTML comment with special characters', () => {
      const content = `<!-- AI-ASSISTED: true, MODEL: Claude Haiku 4.5 (pt-BR), DATE: 2026-03-24, PURPOSE: governance-doc + compliance -->
Content`;

      const disclosure = extractDisclosure(content);
      expect(disclosure?.model).toContain('Claude Haiku');
    });
  });

  describe('Field Validation', () => {
    it('should reject disclosure without AI_ASSISTED true', () => {
      const raw = {
        ai_assisted: false,
        model: 'Claude',
        date: '2026-03-24',
        purpose: 'test-plan',
      };
      expect(() => validateDisclosure(raw)).toThrow('AI_ASSISTED must be true');
    });

    it('should reject disclosure without MODEL', () => {
      const raw = {
        ai_assisted: true,
        date: '2026-03-24',
        purpose: 'test-plan',
      };
      expect(() => validateDisclosure(raw)).toThrow('MODEL is required');
    });

    it('should reject disclosure with empty MODEL', () => {
      const raw = {
        ai_assisted: true,
        model: '   ',
        date: '2026-03-24',
        purpose: 'test-plan',
      };
      expect(() => validateDisclosure(raw)).toThrow('MODEL cannot be empty');
    });

    it('should reject disclosure without DATE', () => {
      const raw = {
        ai_assisted: true,
        model: 'Claude',
        purpose: 'test-plan',
      };
      expect(() => validateDisclosure(raw)).toThrow('DATE is required');
    });

    it('should reject invalid DATE format', () => {
      const raw = {
        ai_assisted: true,
        model: 'Claude',
        date: '2026/03/24',
        purpose: 'test-plan',
      };
      expect(() => validateDisclosure(raw)).toThrow('DATE must be in YYYY-MM-DD format');
    });

    it('should reject disclosure without PURPOSE', () => {
      const raw = {
        ai_assisted: true,
        model: 'Claude',
        date: '2026-03-24',
      };
      expect(() => validateDisclosure(raw)).toThrow('PURPOSE is required');
    });

    it('should reject PURPOSE not in allowlist', () => {
      const raw = {
        ai_assisted: true,
        model: 'Claude',
        date: '2026-03-24',
        purpose: 'invalid-purpose',
      };
      expect(() => validateDisclosure(raw)).toThrow('PURPOSE must be one of');
    });

    it('should accept all allowed PURPOSE values', () => {
      for (const purpose of ALLOWED_PURPOSES) {
        const raw = {
          ai_assisted: true,
          model: 'Claude',
          date: '2026-03-24',
          purpose,
        };
        const result = validateDisclosure(raw);
        expect(result.purpose).toBe(purpose);
      }
    });
  });

  describe('Full Document Validation', () => {
    it('should validate complete document with YAML disclosure', () => {
      const content = `---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: governance-doc
---
# Document Title
This is the content.`;

      const disclosure = validateAIDisclosure(content);
      expect(disclosure.ai_assisted).toBe(true);
      expect(disclosure.model).toBe('Claude Haiku 4.5');
      expect(disclosure.date).toBe('2026-03-24');
      expect(disclosure.purpose).toBe('governance-doc');
    });

    it('should validate complete document with HTML comment disclosure', () => {
      const content = `<!-- AI-ASSISTED: true, MODEL: Claude Haiku 4.5, DATE: 2026-03-24, PURPOSE: test-plan -->
# Test Plan
This is a test plan.`;

      const disclosure = validateAIDisclosure(content);
      expect(disclosure.purpose).toBe('test-plan');
    });

    it('should throw on missing disclosure', () => {
      const content = `# Content without disclosure
This document has no AI disclosure.`;

      expect(() => validateAIDisclosure(content)).toThrow(
        'No AI disclosure found in document header'
      );
    });

    it('should throw on malformed disclosure', () => {
      const content = `---
ai_assisted: true
model: 
date: 2026-03-24
purpose: test-plan
---
Content`;

      expect(() => validateAIDisclosure(content)).toThrow('MODEL is required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle YAML with extra whitespace', () => {
      const content = `---
ai_assisted:   true
model:   Claude Haiku 4.5  
date:   2026-03-24
purpose:   test-plan
---
Content`;

      const disclosure = extractDisclosure(content);
      expect(disclosure?.model).toBe('Claude Haiku 4.5');
    });

    it('should handle non-existent disclosure gracefully', () => {
      const content = 'Just plain text without any disclosure markers.';
      const disclosure = extractDisclosure(content);
      expect(disclosure).toBeNull();
    });

    it('should reject invalid dates', () => {
      const raw = {
        ai_assisted: true,
        model: 'Claude',
        date: '2026-13-45', // Invalid month and day
        purpose: 'test-plan',
      };
      expect(() => validateDisclosure(raw)).toThrow('DATE must be in YYYY-MM-DD format');
    });

    it('should handle unicode and special characters in MODEL', () => {
      const raw = {
        ai_assisted: true,
        model: 'Claude Haiku 4.5 (pt-BR) — v2.0',
        date: '2026-03-24',
        purpose: 'documentation',
      };
      const result = validateDisclosure(raw);
      expect(result.model).toContain('pt-BR');
    });
  });

  describe('Return Type Validation', () => {
    it('should return properly typed AIDisclosure object', () => {
      const raw = {
        ai_assisted: true,
        model: 'Claude',
        date: '2026-03-24',
        purpose: 'test-plan' as const,
      };
      const result = validateDisclosure(raw);
      expect(result).toHaveProperty('ai_assisted');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('purpose');
      expect(typeof result.ai_assisted).toBe('boolean');
      expect(typeof result.model).toBe('string');
    });
  });
});
