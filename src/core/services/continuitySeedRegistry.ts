/**
 * Deterministic Continuity & Seed Registry
 *
 * Guarantees visual and cinematic repeatability by:
 * 1. Generating deterministic, reproducible pseudo-random 32-bit seeds from project,
 *    scene, shot, and variant coordinates (Zero AI Slop / Zero Seed Drift).
 * 2. Locking character, lens, environment descriptors, and seed values across multi-scene
 *    timeline sequences via immutable reference IDs.
 */

export interface DeterministicSeedParams {
  projectId: string;
  sceneId?: string | number;
  shotId: number | string;
  variantIndex?: number;
  seedSalt?: string;
}

export interface ContinuityReferenceLock {
  id: string; // Immutable reference ID e.g. "lock-char-detective-v1"
  profileId: string;
  kind: 'character' | 'location' | 'prop' | 'look';
  name: string;
  lockedAttributes: Record<string, string>;
  seed: number;
  canonicalAssetId?: string;
  lockedAt: number;
}

export interface ShotContinuityBindingResult {
  shotId: number | string;
  locks: ContinuityReferenceLock[];
  compiledPromptFragment: string;
  seeds: Record<string, number>;
}

/**
 * Deterministic MurmurHash3-inspired 32-bit integer hasher.
 * Generates an integer in [1, 2147483647] (standard 31-bit positive seed range).
 */
export function hashStringToSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Force positive 31-bit integer
  const positive = (hash >>> 0) % 2147483647;
  return positive === 0 ? 1 : positive;
}

export class ContinuitySeedRegistry {
  private static instance: ContinuitySeedRegistry;
  private locks = new Map<string, ContinuityReferenceLock>();
  private shotBindings = new Map<string, Set<string>>(); // shotKey -> Set<lockId>

  static getInstance(): ContinuitySeedRegistry {
    if (!ContinuitySeedRegistry.instance) {
      ContinuitySeedRegistry.instance = new ContinuitySeedRegistry();
    }
    return ContinuitySeedRegistry.instance;
  }

  /**
   * Generates a deterministic integer seed strictly reproducible across sessions.
   */
  generateSeed(params: DeterministicSeedParams): number {
    const rawKey = [
      params.projectId.trim(),
      params.sceneId !== undefined ? String(params.sceneId).trim() : '0',
      String(params.shotId).trim(),
      params.variantIndex !== undefined ? String(params.variantIndex) : '0',
      params.seedSalt?.trim() ?? 'loofi-v18-deterministic',
    ].join('::');

    return hashStringToSeed(rawKey);
  }

  /**
   * Registers an immutable continuity lock with an associated deterministic seed.
   */
  registerLock(lock: ContinuityReferenceLock): ContinuityReferenceLock {
    if (!lock.id || !lock.id.trim()) {
      throw new Error('Continuity lock must have an immutable ID.');
    }
    if (!lock.profileId || !lock.profileId.trim()) {
      throw new Error('Continuity lock must specify a profileId.');
    }

    const immutable = {
      ...lock,
      lockedAt: lock.lockedAt || Date.now(),
      lockedAttributes: Object.freeze({ ...lock.lockedAttributes }),
    };

    this.locks.set(immutable.id, immutable);
    return immutable;
  }

  getLock(id: string): ContinuityReferenceLock | undefined {
    return this.locks.get(id);
  }

  listLocks(): ContinuityReferenceLock[] {
    return Array.from(this.locks.values());
  }

  listLocksForProfile(profileId: string): ContinuityReferenceLock[] {
    return Array.from(this.locks.values()).filter((l) => l.profileId === profileId);
  }

  /**
   * Bind a timeline shot to a set of immutable continuity locks.
   */
  bindShot(
    projectId: string,
    shotId: number | string,
    lockIds: string[],
  ): ShotContinuityBindingResult {
    const shotKey = `${projectId}::${shotId}`;
    const boundLocks: ContinuityReferenceLock[] = [];
    const seeds: Record<string, number> = {};

    for (const lockId of lockIds) {
      const lock = this.locks.get(lockId);
      if (lock) {
        boundLocks.push(lock);
        seeds[lock.id] = lock.seed;
      }
    }

    this.shotBindings.set(shotKey, new Set(boundLocks.map((l) => l.id)));

    // Compile descriptors into an injection prompt fragment
    const descriptorParts: string[] = [];
    for (const lock of boundLocks) {
      const attrs = Object.entries(lock.lockedAttributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (attrs) {
        descriptorParts.push(`[${lock.name} (${lock.kind}): ${attrs}]`);
      }
    }

    return {
      shotId,
      locks: boundLocks,
      compiledPromptFragment: descriptorParts.join(' '),
      seeds,
    };
  }

  /**
   * Verify whether a prompt respects the locked attributes for its bound locks.
   */
  verifyContinuityCompliance(
    prompt: string,
    locks: ContinuityReferenceLock[],
  ): { compliant: boolean; missingAttributes: string[] } {
    const missingAttributes: string[] = [];
    const normalizedPrompt = prompt.toLowerCase();

    for (const lock of locks) {
      for (const [key, value] of Object.entries(lock.lockedAttributes)) {
        const valLower = value.toLowerCase();
        // Check if value keywords are present in prompt
        const words = valLower.split(/\s+/).filter((w) => w.length > 3);
        const hasMatch = words.some((w) => normalizedPrompt.includes(w));
        if (!hasMatch) {
          missingAttributes.push(`${lock.name}.${key} ("${value}")`);
        }
      }
    }

    return {
      compliant: missingAttributes.length === 0,
      missingAttributes,
    };
  }

  clear(): void {
    this.locks.clear();
    this.shotBindings.clear();
  }
}

export const continuitySeedRegistry = ContinuitySeedRegistry.getInstance();
