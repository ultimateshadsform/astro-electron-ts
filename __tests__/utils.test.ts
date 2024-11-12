import { describe, it, expect, vi } from 'vitest';
import { detect } from 'detect-package-manager';
import {
  getPackageManager,
  validateConfig,
  // ... other exports
} from '../bin/utils';

vi.mock('detect-package-manager');

describe('Utils', () => {
  describe('getPackageManager', () => {
    it('should return detected package manager if not npm', async () => {
      vi.mocked(detect).mockResolvedValue('pnpm');
      const result = await getPackageManager();
      expect(result).toBe('pnpm');
    });

    it('should prompt for selection if npm detected', async () => {
      vi.mocked(detect).mockResolvedValue('npm');
      // Add test implementation based on your utils function
    });
  });

  describe('validateConfig', () => {
    it('should validate astro config format', () => {
      const validConfig = `
        import { defineConfig } from 'astro/config';
        export default defineConfig({});
      `;
      expect(validateConfig(validConfig)).toBe(true);
    });

    it('should reject invalid config', () => {
      const invalidConfig = `
        export default {
          invalid: true
        };
      `;
      expect(validateConfig(invalidConfig)).toBe(false);
    });
  });
});
