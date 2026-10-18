import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContinuitySeedRegistry,
  hashStringToSeed,
  ContinuityReferenceLock,
} from './continuitySeedRegistry';

describe('ContinuitySeedRegistry', () => {
  let registry: ContinuitySeedRegistry;

  beforeEach(() => {
    registry = new ContinuitySeedRegistry();
    registry.clear();
  });

  describe('hashStringToSeed', () => {
    it('generates consistent positive 31-bit integers for the same input', () => {
      const seed1 = hashStringToSeed('project-alpha::scene-1::shot-2::0::salt');
      const seed2 = hashStringToSeed('project-alpha::scene-1::shot-2::0::salt');
      expect(seed1).toBe(seed2);
      expect(seed1).toBeGreaterThan(0);
      expect(seed1).toBeLessThanOrEqual(2147483647);
      expect(Number.isInteger(seed1)).toBe(true);
    });

    it('generates different seeds for distinct coordinate strings', () => {
      const seedA = hashStringToSeed('project-alpha::scene-1::shot-1');
      const seedB = hashStringToSeed('project-alpha::scene-1::shot-2');
      expect(seedA).not.toBe(seedB);
    });
  });

  describe('generateSeed', () => {
    it('produces repeatable seeds across coordinate parameter sets', () => {
      const params = {
        projectId: 'loofi-proj-1',
        sceneId: 'sc-01',
        shotId: 'shot-a',
        variantIndex: 1,
        seedSalt: 'custom-salt',
      };
      const seed1 = registry.generateSeed(params);
      const seed2 = registry.generateSeed(params);
      expect(seed1).toBe(seed2);
    });

    it('differentiates seeds when variant index changes', () => {
      const base = { projectId: 'p1', shotId: 1 };
      const seedV0 = registry.generateSeed({ ...base, variantIndex: 0 });
      const seedV1 = registry.generateSeed({ ...base, variantIndex: 1 });
      expect(seedV0).not.toBe(seedV1);
    });
  });

  describe('registerLock & lock management', () => {
    it('registers an immutable lock and retrieves it by id', () => {
      const lockData: ContinuityReferenceLock = {
        id: 'lock-char-maya',
        profileId: 'char-maya-01',
        kind: 'character',
        name: 'Maya Lin',
        lockedAttributes: {
          jacket: 'worn dark teal trenchcoat',
          hair: 'silver bob cut',
        },
        seed: 12345678,
        lockedAt: 1700000000000,
      };

      const registered = registry.registerLock(lockData);
      expect(registered.id).toBe('lock-char-maya');

      const retrieved = registry.getLock('lock-char-maya');
      expect(retrieved).toBeDefined();
      expect(retrieved?.lockedAttributes.jacket).toBe('worn dark teal trenchcoat');

      const profileLocks = registry.listLocksForProfile('char-maya-01');
      expect(profileLocks).toHaveLength(1);
      expect(profileLocks[0].id).toBe('lock-char-maya');
    });

    it('throws validation error if lock id or profileId is empty', () => {
      expect(() =>
        registry.registerLock({
          id: '',
          profileId: 'p1',
          kind: 'prop',
          name: 'Watch',
          lockedAttributes: {},
          seed: 1,
          lockedAt: 100,
        }),
      ).toThrow('Continuity lock must have an immutable ID.');

      expect(() =>
        registry.registerLock({
          id: 'valid-id',
          profileId: '',
          kind: 'prop',
          name: 'Watch',
          lockedAttributes: {},
          seed: 1,
          lockedAt: 100,
        }),
      ).toThrow('Continuity lock must specify a profileId.');
    });
  });

  describe('bindShot & prompt fragment compilation', () => {
    it('binds multiple locks to a shot and formats compiled descriptors', () => {
      registry.registerLock({
        id: 'lock-1',
        profileId: 'maya',
        kind: 'character',
        name: 'Maya',
        lockedAttributes: { attire: 'cyberpunk jacket' },
        seed: 99991,
        lockedAt: 1,
      });

      registry.registerLock({
        id: 'lock-2',
        profileId: 'loc-tokyo',
        kind: 'location',
        name: 'Neo Shinjuku',
        lockedAttributes: { lighting: 'neon magenta rain reflection' },
        seed: 99992,
        lockedAt: 1,
      });

      const binding = registry.bindShot('proj-1', 'shot-01', ['lock-1', 'lock-2']);
      expect(binding.shotId).toBe('shot-01');
      expect(binding.locks).toHaveLength(2);
      expect(binding.seeds['lock-1']).toBe(99991);
      expect(binding.seeds['lock-2']).toBe(99992);
      expect(binding.compiledPromptFragment).toContain(
        '[Maya (character): attire: cyberpunk jacket]',
      );
      expect(binding.compiledPromptFragment).toContain(
        '[Neo Shinjuku (location): lighting: neon magenta rain reflection]',
      );
    });
  });

  describe('verifyContinuityCompliance', () => {
    it('flags compliant when all locked attribute key phrases appear in the prompt', () => {
      const lock: ContinuityReferenceLock = {
        id: 'lock-char',
        profileId: 'maya',
        kind: 'character',
        name: 'Maya',
        lockedAttributes: {
          coat: 'trenchcoat',
          eyes: 'amber eyes',
        },
        seed: 1234,
        lockedAt: 1,
      };

      const prompt = 'Maya wearing a long trenchcoat with glowing amber eyes standing in the rain';
      const result = registry.verifyContinuityCompliance(prompt, [lock]);
      expect(result.compliant).toBe(true);
      expect(result.missingAttributes).toHaveLength(0);
    });

    it('reports missing attributes when prompt fails to mention locked keywords', () => {
      const lock: ContinuityReferenceLock = {
        id: 'lock-char',
        profileId: 'maya',
        kind: 'character',
        name: 'Maya',
        lockedAttributes: {
          coat: 'leather trenchcoat',
          eyes: 'turquoise sapphire gaze',
        },
        seed: 1234,
        lockedAt: 1,
      };

      const prompt = 'Maya wearing a standard jacket walking down the alley';
      const result = registry.verifyContinuityCompliance(prompt, [lock]);
      expect(result.compliant).toBe(false);
      expect(result.missingAttributes.length).toBeGreaterThan(0);
    });
  });
});
