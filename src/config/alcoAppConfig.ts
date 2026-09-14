/**
 * ALCO APP STANDARD v2.6 - Application Configuration & Identity
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
 * Official ALCO Authority Public Key (Section 14B - Hard Contract)
 * Official Ed25519 Raw Public Key HEX:
 * 7a8e99b9ba45bc9f8847bc9fc4952a87b7fa22a3b0c09a5b22ed939de0ed5162
 * Fingerprint: 7A8E99B9...E0ED5162
 *
 * Mandatory: Key material MUST be identical to this official key.
 * Private Key is held strictly by Owner / ALCO License Generator.
 */
export const ALCO_OFFICIAL_AUTHORITY_PUBLIC_KEY_HEX =
  '7a8e99b9ba45bc9f8847bc9fc4952a87b7fa22a3b0c09a5b22ed939de0ed5162';

export const ALCO_AUTHORITY_PUBLIC_KEY =
  `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAeo6ZubpFvJ+IR7yfxJUqh7f6IqOwwJpbIu2TneDtUWI=
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
