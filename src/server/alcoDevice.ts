/**
 * ALCO APP STANDARD v2.2 - Device Identity Module (Section 9)
 * Official Hardware-Bound Device ID Generator & Validator
 * Format: ALCO-DEV-XXXX-XXXX-XXXX
 */

import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import { ALCO_ECOSYSTEM_NAMESPACE } from '../config/alcoAppConfig.ts';

let cachedDeviceId: string | null = null;

/**
 * Extract raw hardware identifier based on host platform
 */
function getPlatformHardwareSeed(): string {
  const platform = process.platform;

  // 1. Windows: Read MachineGuid from registry (Official ALCO Primary Source)
  if (platform === 'win32') {
    try {
      const regOutput = execSync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
        { encoding: 'utf-8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }
      );
      const match = regOutput.match(/MachineGuid\s+REG_SZ\s+([A-Fa-f0-9-]+)/i);
      if (match && match[1]) {
        return `win-guid:${match[1].trim()}`;
      }
    } catch (_) {
      // Fallback if reg query fails
    }
  }

  // 2. Linux: Read machine-id from standard system locations
  if (platform === 'linux') {
    const machineIdPaths = ['/etc/machine-id', '/var/lib/dbus/machine-id'];
    for (const p of machineIdPaths) {
      try {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf-8').trim();
          if (content && content.length >= 16) {
            return `linux-mid:${content}`;
          }
        }
      } catch (_) {}
    }
  }

  // 3. macOS: Read IOPlatformUUID
  if (platform === 'darwin') {
    try {
      const ioreg = execSync('ioreg -rd1 -c IOPlatformExpertDevice', {
        encoding: 'utf-8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const match = ioreg.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/i);
      if (match && match[1]) {
        return `mac-uuid:${match[1].trim()}`;
      }
    } catch (_) {}
  }

  // 4. Stable Network Interface MAC Addresses fallback
  try {
    const interfaces = os.networkInterfaces();
    const macs: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.mac && net.mac !== '00:00:00:00:00:00' && !net.internal) {
          macs.push(net.mac.toLowerCase());
        }
      }
    }
    if (macs.length > 0) {
      macs.sort();
      return `net-macs:${macs.join(';')}`;
    }
  } catch (_) {}

  // 5. Hostname & CPU fallback
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'generic-cpu';
  return `host-cpu:${os.hostname()}:${cpuModel}:${os.arch()}`;
}

/**
 * Generate official hardware-bound ALCO Device ID
 * Guaranteed format: ALCO-DEV-XXXX-XXXX-XXXX
 */
export function getAlcoDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const seed = getPlatformHardwareSeed();
  const arch = os.arch();
  const rawInput = `${ALCO_ECOSYSTEM_NAMESPACE}:${seed}:${arch}`;

  const hash = crypto.createHash('sha256').update(rawInput, 'utf-8').digest('hex').toUpperCase();

  const p1 = hash.substring(0, 4);
  const p2 = hash.substring(4, 8);
  const p3 = hash.substring(8, 12);

  cachedDeviceId = `ALCO-DEV-${p1}-${p2}-${p3}`;
  return cachedDeviceId;
}

/**
 * Validate Device ID format
 */
export function isValidAlcoDeviceId(deviceId: string): boolean {
  return /^ALCO-DEV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(deviceId);
}
