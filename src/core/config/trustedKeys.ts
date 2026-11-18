/**
 * Trusted Public Keys for Plugin Signing
 * v1.9.0 - Platform Foundations
 *
 * Bundled set of Ed25519 public keys trusted for signing plugins.
 * These keys are hard-coded and not user-editable (security).
 *
 * To add a new trusted key:
 * 1. Generate an Ed25519 key pair (see pluginCrypto.ts)
 * 2. Add the public key to TRUSTED_PUBLIC_KEYS below
 * 3. Ship with the next app release
 */

/**
 * A trusted public key entry.
 */
export interface TrustedKeyEntry {
  /** Human-readable name for the key holder */
  name: string;
  /** Base64-encoded Ed25519 public key */
  publicKey: string;
  /** Unix timestamp when the key was added to the trust store */
  addedAt: number;
  /** Whether this key is active (can verify new signatures) */
  isActive: boolean;
  /** Optional description or purpose */
  description?: string;
}

/**
 * Set of trusted public keys shipped with the application.
 *
 * Security invariant: development placeholder keys MUST remain `isActive: false`
 * so untrusted actors cannot forge `'trusted'` signatures with known public keys.
 */
export const TRUSTED_PUBLIC_KEYS: readonly TrustedKeyEntry[] = [
  {
    name: 'Veo Studio Official (Placeholder)',
    // Inactive placeholder key — replace with a real production Ed25519 public key before release
    publicKey: 'MCowBQYDK2VwAyEAPlaceholderKeyForDevelopmentDoNotUseInProduction00=',
    addedAt: 1739491200000, // 2025-02-14T00:00:00Z
    isActive: false,
    description: 'Inactive development placeholder key (disabled for production security)',
  },
] as const;

/**
 * Get all active trusted public keys.
 */
export function getActiveTrustedKeys(): TrustedKeyEntry[] {
  return TRUSTED_PUBLIC_KEYS.filter((entry) => entry.isActive);
}

/**
 * Check whether a public key is in the trusted set.
 */
export function isKeyTrusted(publicKey: string): boolean {
  return TRUSTED_PUBLIC_KEYS.some((entry) => entry.isActive && entry.publicKey === publicKey);
}
