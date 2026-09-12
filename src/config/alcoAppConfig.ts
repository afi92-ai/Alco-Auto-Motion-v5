/**
 * ALCO APP STANDARD v2.2 - Application Configuration & Identity
 * Master Standard for Aladzan Corpora Ecosystem
 */

export const ALCO_APP_ID = 'alco-auto-motion';
export const ALCO_APP_ALIASES = ['com.alco.automotion', 'alco-auto-motion'];
export const ALCO_APP_NAME = 'ALCO Auto Motion';
export const ALCO_APP_VERSION = '1.0.0';
export const ALCO_PRODUCT_NAME = 'ALCO Auto Motion';
export const ALCO_EXECUTABLE_NAME = 'ALCO Auto Motion.exe';
export const ALCO_ECOSYSTEM_NAMESPACE = 'alco.corpora.ecosystem.device.v2';

/**
 * Official Authority Public Key (Ed25519 SPKI PEM)
 * Used by ALCO App to verify signed License Codes locally (fail-closed).
 * In accordance with Section 14:
 * Private Key is held strictly by Owner / ALCO License Generator.
 * Distributed app only contains this Authority Public Key.
 *
 * Can be overridden via environment variable ALCO_AUTHORITY_PUBLIC_KEY if needed.
 */
export const ALCO_AUTHORITY_PUBLIC_KEY =
  process.env.ALCO_AUTHORITY_PUBLIC_KEY ||
  `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAD3T1AkSZfqctSKS94+Fh3f7p8L2RbE04SWawdDt1jXc=
-----END PUBLIC KEY-----`;

export type AlcoPlan = 'starter' | 'pro' | 'enterprise' | 'custom';
export type AlcoLicenseType = 'lifetime' | 'subscription';

export interface AlcoLicensePayloadV1 {
  licenseVersion: '1.0';
  licenseId: string;
  appId: string;
  deviceId: string;
  customerId: string;
  customerName?: string;
  plan: AlcoPlan;
  licenseType: AlcoLicenseType;
  features: string[];
  issuedAt: string;
  expiresAt: string | null;
  metadata?: Record<string, unknown>;
}

export interface AlcoRequestCodeV2Payload {
  v: '2.0';
  app: string;
  dev: string;
  email: string;
  name: string;
  req: string;
  ts: string;
  notes?: string;
}

export interface AlcoLicenseStatus {
  active: boolean;
  deviceId: string;
  appId: string;
  plan?: AlcoPlan;
  licenseType?: AlcoLicenseType;
  customerName?: string;
  customerId?: string;
  features?: string[];
  issuedAt?: string;
  expiresAt?: string | null;
  licenseId?: string;
  validationReason?: string;
  verifiedAt?: string;
}
