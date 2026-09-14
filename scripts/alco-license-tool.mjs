#!/usr/bin/env node
/**
 * ALCO Ecosystem - Authority License Generator & Inspection Tool
 * Standard v2.6 Compliance Tool for Owner / Release Engineering
 *
 * Implements:
 * - Section 14A: 128 HEX chars wire signature format
 * - Section 14B: Official ALCO Authority Public Key (7a8e99b9ba45bc9f8847bc9fc4952a87b7fa22a3b0c09a5b22ed939de0ed5162)
 *
 * NOTE: This tool is intended for Owner use to generate signed licenses
 * and is NOT included in client package distributions.
 *
 * Usage:
 *   node scripts/alco-license-tool.mjs inspect <requestCodeOrLicenseCode>
 *   node scripts/alco-license-tool.mjs sign --req "<requestCode>" --plan pro --type lifetime --name "User Name"
 *   node scripts/alco-license-tool.mjs keygen
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * ALCO LICENSE STANDARD v1.0 - Section 4.4: Official Checksum Algorithm
 * Standard Reflected CRC with polynomial 0xA001, initial value 0xFFFF.
 * Matches `calculateChecksum()` in official ALCO License Generator request-code.ts.
 */
function calculateChecksum(input) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) & 0xff;
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) {
        crc = (crc >>> 1) ^ 0xa001;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

const crc16Ccitt = calculateChecksum;

function canonicalizeJson(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalizeJson(obj[k])).join(',') + '}';
}

const args = process.argv.slice(2);
const command = args[0] || 'help';

if (command === 'keygen') {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ format: 'pem', type: 'spki' });
  const privPem = privateKey.export({ format: 'pem', type: 'pkcs8' });
  console.log('\n=== ALCO AUTHORITY ED25519 KEYPAIR ===');
  console.log('PUBLIC KEY (for App embedding):\n' + pubPem);
  console.log('PRIVATE KEY (KEEP SECRET - Owner Only):\n' + privPem);
  process.exit(0);
}

if (command === 'inspect') {
  const code = args[1];
  if (!code) {
    console.error('Error: Please provide Request Code or License Code to inspect.');
    process.exit(1);
  }

  if (code.startsWith('ALCO-REQ-v2.')) {
    const parts = code.split('.');
    const b64 = parts[1];
    const crc = parts[2];
    const computedCrc = crc16Ccitt(b64);
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
    console.log('\n=== ALCO REQUEST CODE v2 ===');
    console.log('CRC Check:', crc === computedCrc ? 'VALID ✅' : 'INVALID ❌');
    console.log('Payload:', JSON.stringify(payload, null, 2));
  } else if (code.startsWith('ALCO-LIC-v1.')) {
    const parts = code.split('.');
    const b64 = parts[1];
    const sigHex = parts[2];
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
    const isHex128 = /^[0-9a-fA-F]{128}$/.test(sigHex);
    console.log('\n=== ALCO LICENSE CODE v1.0 ===');
    console.log('Signature Wire Format (v2.6 Sec 14A):', isHex128 ? 'VALID 128 HEX CHARS ✅' : 'INVALID WIRE FORMAT ❌');
    console.log('Signature length:', sigHex.length, 'chars (raw bytes:', isHex128 ? 64 : 'invalid', ')');
    console.log('Payload:', JSON.stringify(payload, null, 2));
  } else {
    console.error('Unrecognized ALCO code format.');
  }
  process.exit(0);
}

if (command === 'sign') {
  // Usage: node scripts/alco-license-tool.mjs sign --req "<requestCode>" --key "<privKeyPemOrPath>" --plan pro --type lifetime
  const getArg = (flag, defaultVal = '') => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
  };

  const reqCode = getArg('--req');
  const keyInput = getArg('--key');
  const plan = getArg('--plan', 'pro');
  const licenseType = getArg('--type', 'lifetime');
  const customerName = getArg('--name', 'Aladzan Customer');
  const customerId = getArg('--customer', 'CUST-' + Math.random().toString(36).substring(2, 8).toUpperCase());

  if (!reqCode || !keyInput) {
    console.error('Usage: node scripts/alco-license-tool.mjs sign --req "<requestCode>" --key "<privateKeyPemFileOrString>" [--plan pro] [--type lifetime]');
    process.exit(1);
  }

  // Parse Request Code
  const parts = reqCode.split('.');
  if (parts.length !== 3 || parts[0] !== 'ALCO-REQ-v2') {
    console.error('Invalid Request Code format');
    process.exit(1);
  }

  const reqPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  const deviceId = reqPayload.dev;
  const appId = reqPayload.app;

  let privKeyPem = keyInput;
  if (fs.existsSync(keyInput)) {
    privKeyPem = fs.readFileSync(keyInput, 'utf-8');
  }

  const privKeyObj = crypto.createPrivateKey(privKeyPem);

  const licensePayload = {
    licenseVersion: '1.0',
    licenseId: `LIC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    appId,
    deviceId,
    customerId,
    customerName: customerName || reqPayload.name,
    plan,
    licenseType,
    features: ['mp4_render', 'hd_export', 'ai_director', 'auto_captions', 'broll_composer', 'custom_branding'],
    issuedAt: new Date().toISOString(),
    expiresAt: licenseType === 'lifetime' ? null : new Date(Date.now() + 365 * 86400000).toISOString(),
    metadata: {
      ecosystem: 'ALCO',
      generatedBy: 'ALCO License Authority Tool v2.6',
    },
  };

  const canonical = canonicalizeJson(licensePayload);
  const sig = crypto.sign(null, Buffer.from(canonical, 'utf-8'), privKeyObj);
  const b64Payload = Buffer.from(canonical, 'utf-8').toString('base64url');
  // Section 14A: Wire representation MUST be HEX, exactly 128 hexadecimal characters (64 bytes)
  const hexSig = sig.toString('hex');

  const licenseCode = `ALCO-LIC-v1.${b64Payload}.${hexSig}`;
  console.log('\n=== ALCO SIGNED LICENSE CODE ===');
  console.log(licenseCode);
  console.log('\nPlan:', plan);
  console.log('Type:', licenseType);
  console.log('Device ID:', deviceId);
  console.log('Customer:', licensePayload.customerName);
  console.log('Signature Wire Format: EXACTLY 128 HEX CHARS (v2.6 Sec 14A)');
  process.exit(0);
}

console.log('ALCO License Tool v2.6');
console.log('Commands:');
console.log('  node scripts/alco-license-tool.mjs keygen');
console.log('  node scripts/alco-license-tool.mjs inspect <code-string>');
console.log('  node scripts/alco-license-tool.mjs sign --req "<requestCode>" --key "<privateKeyPem>"');
