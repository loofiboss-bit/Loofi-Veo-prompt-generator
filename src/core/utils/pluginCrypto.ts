/**
 * Plugin Crypto Utilities
 * Ed25519-based signing and verification for plugin manifests.
 * v1.9.0 - Platform Foundations
 *
 * Uses the Web Crypto API (SubtleCrypto) — available in Electron 40+ and modern browsers.
 * Ed25519 support via SubtleCrypto requires Chrome 113+ / Node 18+.
 *
 * Design decisions:
 * - Deterministic field ordering (sorted JSON) for consistent signatures
 * - Base64 encoding for all binary data (keys, signatures)
 * - Feature detection for SubtleCrypto Ed25519 availability
 */

import type {
  PluginManifest,
  PluginSignature,
  PluginVerificationResult,
  PluginTrustLevel,
} from '@core/types/plugin';
import { isKeyTrusted } from '@core/config/trustedKeys';

// ─── Constants ──────────────────────────────────────────────────────

/**
 * Fields from PluginManifest that are included in the signed payload.
 * Must be sorted alphabetically for deterministic hashing.
 */
const SIGNED_MANIFEST_FIELDS = [
  'author',
  'dependencies',
  'description',
  'engineVersion',
  'id',
  'main',
  'name',
  'peerDependencies',
  'permissions',
  'version',
] as const;

const ALGORITHM = { name: 'Ed25519' } as const;

// ─── Feature Detection ──────────────────────────────────────────────

/**
 * Check if the current environment supports Ed25519 via SubtleCrypto.
 */
export async function isEd25519Supported(): Promise<boolean> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return false;

    // Try generating a key pair — if it throws, Ed25519 is not supported
    const keyPair = await crypto.subtle.generateKey(ALGORITHM, true, ['sign', 'verify']);
    return keyPair !== null;
  } catch {
    return false;
  }
}

// ─── Key Management ─────────────────────────────────────────────────

/**
 * Key pair as base64-encoded strings.
 */
export interface PluginKeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate an Ed25519 key pair for plugin signing.
 * Returns base64-encoded public and private keys.
 *
 * @throws If Ed25519 is not supported in the current environment
 */
export async function generateKeyPair(): Promise<PluginKeyPair> {
  const keyPair = await crypto.subtle.generateKey(ALGORITHM, true, ['sign', 'verify']);

  const publicKeyRaw = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyRaw = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyRaw),
    privateKey: arrayBufferToBase64(privateKeyRaw),
  };
}

// ─── Signing ────────────────────────────────────────────────────────

/**
 * Sign a plugin manifest with a private key.
 * Creates a deterministic payload from sorted manifest fields, then signs it.
 *
 * @param manifest - The plugin manifest to sign
 * @param privateKeyBase64 - Base64-encoded PKCS8 private key
 * @returns A PluginSignature to attach to the manifest
 */
export async function signManifest(
  manifest: PluginManifest,
  privateKeyBase64: string,
): Promise<PluginSignature> {
  const payload = createSigningPayload(manifest);
  const data = new TextEncoder().encode(payload);

  const privateKey = await importPrivateKey(privateKeyBase64);
  const signatureBuffer = await crypto.subtle.sign(ALGORITHM, privateKey, data);

  // Derive public key from the private key for inclusion in the signature
  // We need the public key separately — recreate it from the key pair
  // For practical use: the signer should also provide their public key
  const publicKeyBase64 = await derivePublicKeyFromPrivate(privateKeyBase64);

  return {
    algorithm: 'Ed25519',
    publicKey: publicKeyBase64,
    signature: arrayBufferToBase64(signatureBuffer),
    signedAt: Date.now(),
    signedFields: [...SIGNED_MANIFEST_FIELDS],
  };
}

/**
 * Sign an arbitrary data buffer with a private key.
 *
 * @param data - The data to sign
 * @param privateKeyBase64 - Base64-encoded PKCS8 private key
 * @returns Base64-encoded signature
 */
export async function signData(data: Uint8Array, privateKeyBase64: string): Promise<string> {
  const privateKey = await importPrivateKey(privateKeyBase64);
  const signatureBuffer = await crypto.subtle.sign(ALGORITHM, privateKey, data as BufferSource);
  return arrayBufferToBase64(signatureBuffer);
}

// ─── Verification ───────────────────────────────────────────────────

/**
 * Verify a plugin manifest's signature.
 *
 * @param manifest - The manifest including the `signature` field
 * @returns Verification result with validity, reason, and trust level
 */
export async function verifyManifestSignature(
  manifest: PluginManifest,
): Promise<PluginVerificationResult> {
  const now = Date.now();

  if (!manifest.signature) {
    return { valid: false, reason: 'No signature present', verifiedAt: now };
  }

  try {
    const { publicKey: publicKeyBase64, signature: signatureBase64 } = manifest.signature;

    const payload = createSigningPayload(manifest);
    const data = new TextEncoder().encode(payload);
    const signatureBytes = base64ToArrayBuffer(signatureBase64);

    const publicKey = await importPublicKey(publicKeyBase64);

    const valid = await crypto.subtle.verify(
      ALGORITHM,
      publicKey,
      signatureBytes as BufferSource,
      data as BufferSource,
    );

    if (valid) {
      return { valid: true, verifiedAt: now };
    }

    return { valid: false, reason: 'Signature verification failed', verifiedAt: now };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown verification error';
    return { valid: false, reason, verifiedAt: now };
  }
}

/**
 * Verify an arbitrary data buffer against a signature.
 *
 * @param data - The data that was signed
 * @param signatureBase64 - Base64-encoded signature
 * @param publicKeyBase64 - Base64-encoded SPKI public key
 * @returns Whether the signature is valid
 */
export async function verifyData(
  data: Uint8Array,
  signatureBase64: string,
  publicKeyBase64: string,
): Promise<boolean> {
  try {
    const publicKey = await importPublicKey(publicKeyBase64);
    const signatureBytes = base64ToArrayBuffer(signatureBase64);
    return await crypto.subtle.verify(
      ALGORITHM,
      publicKey,
      signatureBytes as BufferSource,
      data as BufferSource,
    );
  } catch {
    return false;
  }
}

/**
 * Determine the trust level of a plugin based on its signature.
 *
 * @param manifest - The plugin manifest to evaluate
 * @returns The trust level
 */
export async function determinePluginTrustLevel(
  manifest: PluginManifest,
): Promise<PluginTrustLevel> {
  if (!manifest.signature) {
    return 'unsigned';
  }

  const result = await verifyManifestSignature(manifest);
  if (!result.valid) {
    return 'invalid';
  }

  // Check if the signer's public key is in the trusted set
  if (isKeyTrusted(manifest.signature.publicKey)) {
    return 'trusted';
  }

  return 'untrusted';
}

// ─── Payload Construction ───────────────────────────────────────────

/**
 * Create a deterministic JSON string from the manifest for signing.
 * Only includes SIGNED_MANIFEST_FIELDS, sorted alphabetically.
 */
export function createSigningPayload(manifest: PluginManifest): string {
  const payload: Record<string, unknown> = {};

  for (const field of SIGNED_MANIFEST_FIELDS) {
    const value = manifest[field as keyof PluginManifest];
    if (value !== undefined) {
      payload[field] = value;
    }
  }

  return JSON.stringify(payload, null, 0);
}

// ─── Key Import Helpers ─────────────────────────────────────────────

async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey('pkcs8', keyData, ALGORITHM, true, ['sign']);
}

async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey('spki', keyData, ALGORITHM, true, ['verify']);
}

/**
 * Derive the public key from a PKCS8 private key.
 * Import as PKCS8 → export as JWK → re-import as public → export as SPKI.
 */
async function derivePublicKeyFromPrivate(privateKeyBase64: string): Promise<string> {
  const privateKey = await importPrivateKey(privateKeyBase64);
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);

  // Remove the private key material (d) to get the public key
  const publicJwk: JsonWebKey = { kty: jwk.kty, crv: jwk.crv, x: jwk.x };
  const publicKey = await crypto.subtle.importKey('jwk', publicJwk, ALGORITHM, true, ['verify']);
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', publicKey);

  return arrayBufferToBase64(publicKeyBuffer);
}

// ─── Base64 Utilities ───────────────────────────────────────────────

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
