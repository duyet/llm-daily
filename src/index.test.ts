import { describe, it, expect } from 'vitest';
import { getVersion, VERSION } from './index.js';

describe('index', () => {
  describe('getVersion', () => {
    it('should return the current version', () => {
      expect(getVersion()).toBe('0.1.0');
    });

    it('should match VERSION constant', () => {
      expect(getVersion()).toBe(VERSION);
    });
  });
});
