/**
 * ALCO APP STANDARD v2.2 - License System Implementation
 * Master Protocol for Aladzan Corpora Ecosystem
 *
 * Implements:
 * - Section 10: Request Code v2 (ALCO-REQ-v2.<BASE64URL>.<CRC16>)
 * - Section 11: Fail-Closed Request Code Validation
 * - Section 12: License Payload v1.0 Schema Validation
 * - Section 13: Deterministic/Canonical JSON Representation
 * - Section 14: Ed25519 Signature Verification with Authority Public Key
 * - Section 15: Local Fail-Closed Verification
 * - Section 16 & 17: App ID & Hardware Device ID Binding
 * - Section 19 & 20: Persistent User Data Storage Across Updates
 * - Section 23: Diagnostic Logging without Secrets Leak
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  ALCO_APP_ID,
  ALCO_APP_ALIASES,
  ALCO_AUTHORITY_PUBLIC_KEY,
  AlcoLicensePayloadV1,
  AlcoRequestCodeV2Payload,
  AlcoLicenseStatus,
  AlcoPlan,
  AlcoLicenseType,
} from '../config/alcoAppConfig.ts';
import { getAlcoDeviceId, isValidAlcoDeviceId } from './alcoDevice.ts';

/**
 * Standard CRC16-CCITT implementation (Polynomial 0x1021, Initial 0xFFFF)
 * Section 10: Used exclusively for copy/paste transmission corruption detection.
 */
export function crc16Ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i) & 0xff;
    crc ^= byte << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Deterministic / Canonical JSON representation (Section 13)
 * Ported identically to ALCO License Generator canonicalization:
 * - Recursively sorts object keys in alphabetical order
 * - Preserves array element ordering
 * - Eliminates extraneous whitespace
 * - Ensures deterministic Ed25519 signature verification
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalizeJson(item)).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + canonicalizeJson(val);
  });
  return '{' + pairs.join(',') + '}';
}

/**
 * Generate official Request Code v2 (Section 10)
 * Format: ALCO-REQ-v2.<BASE64URL_PAYLOAD>.<CRC16>
 */
export function generateRequestCodeV2(params: {
  name: string;
  email: string;
  notes?: string;
}): { requestCode: string; payload: AlcoRequestCodeV2Payload } {
  const deviceId = getAlcoDeviceId();
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const payload: AlcoRequestCodeV2Payload = {
    v: '2.0',
    app: ALCO_APP_ID,
    dev: deviceId,
    email: (params.email || '').trim(),
    name: (params.name || '').trim(),
    req: requestId,
    ts: new Date().toISOString(),
    ...(params.notes ? { notes: params.notes.trim() } : {}),
  };

  const canonical = canonicalizeJson(payload);
  const base64UrlPayload = Buffer.from(canonical, 'utf-8').toString('base64url');
  const crc = crc16Ccitt(base64UrlPayload);

  const requestCode = `ALCO-REQ-v2.${base64UrlPayload}.${crc}`;
  return { requestCode, payload };
}

/**
 * Fail-closed decoder & validator for Request Code v2 (Section 11)
 */
export function parseAndValidateRequestCodeV2(code: string): {
  valid: boolean;
  payload?: AlcoRequestCodeV2Payload;
  error?: string;
} {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Request Code must be a non-empty string' };
  }

  const parts = code.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'ALCO-REQ-v2') {
    return { valid: false, error: 'Malformed Request Code format (must be ALCO-REQ-v2.<PAYLOAD>.<CRC16>)' };
  }

  const [, base64Payload, crcReceived] = parts;

  // CRC16 Check (Section 10 & 11)
  const expectedCrc = crc16Ccitt(base64Payload);
  if (crcReceived.toUpperCase() !== expectedCrc.toUpperCase()) {
    return { valid: false, error: 'Request Code CRC16 checksum mismatch (corrupted data)' };
  }

  try {
    const rawJson = Buffer.from(base64Payload, 'base64url').toString('utf-8');
    const payload = JSON.parse(rawJson) as AlcoRequestCodeV2Payload;

    if (payload.v !== '2.0') {
      return { valid: false, error: `Unsupported Request Code version: ${payload.v}` };
    }
    if (!payload.app || !ALCO_APP_ALIASES.includes(payload.app)) {
      return { valid: false, error: `App ID mismatch: received ${payload.app}, expected ${ALCO_APP_ID}` };
    }
    if (!isValidAlcoDeviceId(payload.dev)) {
      return { valid: false, error: `Invalid Device ID format in payload: ${payload.dev}` };
    }
    if (!payload.name || !payload.email || !payload.req || !payload.ts) {
      return { valid: false, error: 'Missing mandatory fields in Request Code payload' };
    }

    return { valid: true, payload };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Failed to decode Request Code: ${msg}` };
  }
}

/**
 * Load Ed25519 Public Key Object from SPKI PEM, Base64 raw or Hex
 */
function getAuthorityKeyObject(): crypto.KeyObject {
  const keyStr = ALCO_AUTHORITY_PUBLIC_KEY.trim();

  // If PEM format
  if (keyStr.includes('-----BEGIN PUBLIC KEY-----')) {
    return crypto.createPublicKey(keyStr);
  }

  // If 32-byte raw key in base64 or hex
  let rawBytes: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
    rawBytes = Buffer.from(keyStr, 'hex');
  } else {
    rawBytes = Buffer.from(keyStr, 'base64');
  }

  if (rawBytes.length === 32) {
    // Prefix with standard ASN.1 / DER header for Ed25519 SPKI (12 bytes)
    const derHeader = Buffer.from('302a300506032b6570032100', 'hex');
    const fullDer = Buffer.concat([derHeader, rawBytes]);
    return crypto.createPublicKey({ key: fullDer, format: 'der', type: 'spki' });
  }

  throw new Error('Unrecognized Authority Public Key format');
}

/**
 * Verify Ed25519 Digital Signature on Canonical License Payload (Section 14 & 15)
 */
function verifyEd25519Signature(canonicalData: string, signatureBase64Url: string): boolean {
  try {
    const keyObject = getAuthorityKeyObject();
    const signatureBytes = Buffer.from(signatureBase64Url, 'base64url');
    if (signatureBytes.length !== 64) {
      return false;
    }
    const dataBytes = Buffer.from(canonicalData, 'utf-8');
    return crypto.verify(null, dataBytes, keyObject, signatureBytes);
  } catch (e) {
    console.error('[ALCO License] Signature verification failure:', e);
    return false;
  }
}

/**
 * Official ALCO License Code Local Verification (Section 15)
 * Format: ALCO-LIC-v1.<BASE64URL_PAYLOAD>.<BASE64URL_SIGNATURE>
 * Fail-Closed: any discrepancy or validation failure rejects the license.
 */
export function verifyLicenseCode(
  licenseCode: string,
  targetDeviceId?: string
): { valid: boolean; payload?: AlcoLicensePayloadV1; error?: string } {
  if (!licenseCode || typeof licenseCode !== 'string') {
    return { valid: false, error: 'License Code must be a non-empty string' };
  }

  const parts = licenseCode.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'ALCO-LIC-v1') {
    return { valid: false, error: 'Invalid License Code format (must be ALCO-LIC-v1.<PAYLOAD>.<SIGNATURE>)' };
  }

  const [, base64Payload, signatureBase64Url] = parts;

  let payload: AlcoLicensePayloadV1;
  try {
    const rawJson = Buffer.from(base64Payload, 'base64url').toString('utf-8');
    payload = JSON.parse(rawJson) as AlcoLicensePayloadV1;
  } catch (_) {
    return { valid: false, error: 'Corrupted License Code payload JSON' };
  }

  // 1. Validate Schema (Section 12)
  if (payload.licenseVersion !== '1.0') {
    return { valid: false, error: `Unsupported licenseVersion: ${payload.licenseVersion}` };
  }
  if (!payload.licenseId || typeof payload.licenseId !== 'string') {
    return { valid: false, error: 'Missing licenseId' };
  }

  // 2. Validate App ID (Section 16: App Binding)
  if (!payload.appId || !ALCO_APP_ALIASES.includes(payload.appId)) {
    return {
      valid: false,
      error: `License appId mismatch: license is for "${payload.appId}", this application is "${ALCO_APP_ID}"`,
    };
  }

  // 3. Validate Device ID (Section 17: Device Binding)
  const currentDeviceId = targetDeviceId || getAlcoDeviceId();
  if (payload.deviceId !== currentDeviceId) {
    return {
      valid: false,
      error: `Device binding mismatch: license device "${payload.deviceId}" does not match local device "${currentDeviceId}"`,
    };
  }

  // 4. Validate Plan & Type (Section 12)
  const validPlans: AlcoPlan[] = ['starter', 'pro', 'enterprise', 'custom'];
  if (!validPlans.includes(payload.plan)) {
    return { valid: false, error: `Invalid plan: ${payload.plan}` };
  }

  const validTypes: AlcoLicenseType[] = ['lifetime', 'subscription'];
  if (!validTypes.includes(payload.licenseType)) {
    return { valid: false, error: `Invalid licenseType: ${payload.licenseType}` };
  }

  // Expiration rules
  if (payload.licenseType === 'lifetime') {
    if (payload.expiresAt !== null) {
      return { valid: false, error: 'Lifetime license must have expiresAt set to null' };
    }
  } else if (payload.licenseType === 'subscription') {
    if (!payload.expiresAt) {
      return { valid: false, error: 'Subscription license must have a valid expiresAt timestamp' };
    }
    const expireTime = Date.parse(payload.expiresAt);
    if (isNaN(expireTime)) {
      return { valid: false, error: 'Invalid expiresAt ISO timestamp format' };
    }
    if (expireTime <= Date.now()) {
      return { valid: false, error: `License subscription expired on ${payload.expiresAt}` };
    }
  }

  // 5. Verify Ed25519 Signature against Authority Public Key (Section 14 & 15)
  const canonicalString = canonicalizeJson(payload);
  const signatureOk = verifyEd25519Signature(canonicalString, signatureBase64Url);

  if (!signatureOk) {
    return {
      valid: false,
      error: 'Digital signature invalid: License Code was not signed by official ALCO Authority Private Key',
    };
  }

  return { valid: true, payload };
}

/**
 * Determine persistent storage directory for user data (Section 19)
 * Guaranteed to survive application updates and reinstalls
 */
function getPersistentStorageDir(): string {
  let baseDir: string;
  if (process.platform === 'win32') {
    baseDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (process.platform === 'darwin') {
    baseDir = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    baseDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  }

  const targetDir = path.join(baseDir, 'alco-auto-motion');
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  } catch (_) {
    // Fallback in case user directory cannot be accessed
    const fallback = path.join(process.cwd(), '.data');
    if (!fs.existsSync(fallback)) {
      try {
        fs.mkdirSync(fallback, { recursive: true });
      } catch (_) {}
    }
    return fallback;
  }
}

function getLicenseFilePath(): string {
  return path.join(getPersistentStorageDir(), 'license.json');
}

/**
 * Save verified License Code persistently (Section 19 & 20)
 */
export function savePersistentLicense(licenseCode: string, payload: AlcoLicensePayloadV1): void {
  const filePath = getLicenseFilePath();
  const record = {
    licenseCode,
    payload,
    savedAt: new Date().toISOString(),
    deviceId: payload.deviceId,
  };
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
  console.log(`[ALCO License] Persisted active license to: ${filePath}`);
}

/**
 * Read persistent license record if available
 */
export function readPersistentLicenseRecord(): { licenseCode: string; payload: AlcoLicensePayloadV1 } | null {
  const filePath = getLicenseFilePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.licenseCode === 'string') {
      return { licenseCode: parsed.licenseCode, payload: parsed.payload };
    }
  } catch (e) {
    console.error('[ALCO License] Failed to read stored license file:', e);
  }
  return null;
}

/**
 * Clear stored license
 */
export function clearPersistentLicense(): void {
  const filePath = getLicenseFilePath();
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log('[ALCO License] Cleared stored license file');
    } catch (e) {
      console.error('[ALCO License] Error removing license file:', e);
    }
  }
}

/**
 * Startup License Re-verification (Section 19: Mandatory on every startup)
 * Does NOT trust a simple boolean flag: strictly re-evaluates the Ed25519 signature,
 * hardware device binding, and subscription validity.
 */
export function auditAndGetLicenseStatus(): AlcoLicenseStatus {
  const currentDeviceId = getAlcoDeviceId();
  const stored = readPersistentLicenseRecord();

  if (!stored) {
    return {
      active: false,
      deviceId: currentDeviceId,
      appId: ALCO_APP_ID,
      validationReason: 'Unactivated / Evaluation Mode',
    };
  }

  const verification = verifyLicenseCode(stored.licenseCode, currentDeviceId);

  if (!verification.valid || !verification.payload) {
    console.warn(`[ALCO License] Stored license invalid: ${verification.error}`);
    return {
      active: false,
      deviceId: currentDeviceId,
      appId: ALCO_APP_ID,
      validationReason: verification.error || 'Stored license validation failed',
    };
  }

  const p = verification.payload;
  console.log(`[ALCO License] Active verified license loaded: ${p.plan.toUpperCase()} (${p.licenseType}) for ${p.customerName || p.customerId}`);

  return {
    active: true,
    deviceId: currentDeviceId,
    appId: ALCO_APP_ID,
    plan: p.plan,
    licenseType: p.licenseType,
    customerName: p.customerName,
    customerId: p.customerId,
    features: p.features,
    issuedAt: p.issuedAt,
    expiresAt: p.expiresAt,
    licenseId: p.licenseId,
    validationReason: 'Verified by official ALCO Authority Ed25519 Key',
    verifiedAt: new Date().toISOString(),
  };
}
