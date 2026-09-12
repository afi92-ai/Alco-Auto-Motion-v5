import { useState, useEffect, useCallback } from 'react';
import { AlcoLicenseStatus } from '../config/alcoAppConfig';

export function useAlcoLicense() {
  const [licenseStatus, setLicenseStatus] = useState<AlcoLicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/alco/license/status');
      if (res.ok) {
        const data = (await res.json()) as AlcoLicenseStatus;
        setLicenseStatus(data);
      }
    } catch (e) {
      console.error('[ALCO License] Failed to fetch status:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    licenseStatus,
    isLoading,
    isLicenseModalOpen,
    setIsLicenseModalOpen,
    refreshStatus,
  };
}
