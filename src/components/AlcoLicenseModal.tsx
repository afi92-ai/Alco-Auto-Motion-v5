import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Laptop,
  CheckCircle2,
  X,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { AlcoLicenseStatus, AlcoPlan, AlcoLicenseType } from '../config/alcoAppConfig';

interface AlcoLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseStatus: AlcoLicenseStatus | null;
  onRefreshStatus: () => void;
}

export const AlcoLicenseModal: React.FC<AlcoLicenseModalProps> = ({
  isOpen,
  onClose,
  licenseStatus,
  onRefreshStatus,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'request' | 'activate'>('status');

  // Request Code Generator Form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [generatedRequestCode, setGeneratedRequestCode] = useState<string | null>(null);
  const [isGeneratingRequest, setIsGeneratingRequest] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  // License Activation Form
  const [licenseInput, setLicenseInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Copy helpers
  const [copiedDevId, setCopiedDevId] = useState(false);
  const [copiedReqCode, setCopiedReqCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      onRefreshStatus();
      setActivationError(null);
      setActivationSuccess(null);
      setReqError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: 'dev' | 'req') => {
    navigator.clipboard.writeText(text);
    if (type === 'dev') {
      setCopiedDevId(true);
      setTimeout(() => setCopiedDevId(false), 2000);
    } else {
      setCopiedReqCode(true);
      setTimeout(() => setCopiedReqCode(false), 2000);
    }
  };

  const handleGenerateRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      setReqError('Nama lengkap dan email pemohon wajib diisi.');
      return;
    }

    setIsGeneratingRequest(true);
    setReqError(null);

    try {
      const res = await fetch('/api/alco/license/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName.trim(),
          email: customerEmail.trim(),
          notes: requestNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.requestCode) {
        setGeneratedRequestCode(data.requestCode);
      } else {
        setReqError(data.error || 'Gagal membuat Request Code v2.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setReqError(msg || 'Network error saat menghubungi server.');
    } finally {
      setIsGeneratingRequest(false);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) {
      setActivationError('Mohon tempel kode lisensi ALCO terlebih dahulu.');
      return;
    }

    setIsActivating(true);
    setActivationError(null);
    setActivationSuccess(null);

    try {
      const res = await fetch('/api/alco/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseCode: licenseInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setActivationSuccess(data.message || 'Lisensi berhasil diaktivasi secara permanen!');
        setLicenseInput('');
        onRefreshStatus();
        setTimeout(() => {
          setActiveSubTab('status');
        }, 1500);
      } else {
        setActivationError(data.error || 'Verifikasi digital signature gagal.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActivationError(msg || 'Network error saat aktivasi.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan lisensi pada perangkat ini?')) {
      return;
    }
    try {
      const res = await fetch('/api/alco/license/deactivate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onRefreshStatus();
      }
    } catch (_) {}
  };

  const isActivated = licenseStatus?.active;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--card)]/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isActivated
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
              }`}
            >
              {isActivated ? <ShieldCheck className="w-5 h-5" /> : <Key className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-[var(--fg-app)]">
                  ALCO License Center
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Standard v2.2
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Protokol Lisensi Resmi Aladzan Corpora Ecosystem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--fg-app)] hover:bg-[var(--secondary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border)] bg-[var(--muted)]/40 px-6 pt-2">
          <button
            onClick={() => setActiveSubTab('status')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'status'
                ? 'border-blue-500 text-blue-500 bg-[var(--card)] rounded-t-lg'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Status Lisensi</span>
          </button>
          <button
            onClick={() => setActiveSubTab('request')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'request'
                ? 'border-blue-500 text-blue-500 bg-[var(--card)] rounded-t-lg'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Request Code v2</span>
          </button>
          <button
            onClick={() => setActiveSubTab('activate')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'activate'
                ? 'border-blue-500 text-blue-500 bg-[var(--card)] rounded-t-lg'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Aktivasi Kode</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto alco-scrollbar space-y-5">
          {/* TAB 1: STATUS */}
          {activeSubTab === 'status' && (
            <div className="space-y-4 animate-fade-in">
              {/* Activation Card */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-4 ${
                  isActivated
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${
                    isActivated ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {isActivated ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[var(--fg-app)]">
                      {isActivated ? 'Lisensi Aktif & Terverifikasi' : 'Mode Evaluasi / Belum Teraktivasi'}
                    </h3>
                    {isActivated && licenseStatus?.plan && (
                      <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {licenseStatus.plan} • {licenseStatus.licenseType}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {licenseStatus?.validationReason || 'Belum ada lisensi digital yang terverifikasi.'}
                  </p>
                  {isActivated && licenseStatus?.customerName && (
                    <div className="mt-2 text-xs text-[var(--fg-app)] font-medium">
                      Pemilik: <span className="font-bold">{licenseStatus.customerName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hardware Device ID */}
              <div className="bg-[var(--secondary)]/40 border border-[var(--border)] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-blue-400" />
                    Hardware Device ID (Binding Resmi)
                  </span>
                  <button
                    onClick={() => copyToClipboard(licenseStatus?.deviceId || '', 'dev')}
                    className="alco-btn alco-btn-secondary text-[11px] h-7 px-2.5 flex items-center gap-1 text-blue-400 hover:text-blue-300"
                    title="Copy Device ID"
                  >
                    {copiedDevId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDevId ? 'Tersalin' : 'Salin Device ID'}</span>
                  </button>
                </div>
                <div className="font-mono text-sm font-bold tracking-wider text-[var(--fg-app)] bg-[var(--card)] px-3 py-2 rounded-lg border border-[var(--border)] select-all">
                  {licenseStatus?.deviceId || 'Memuat...'}
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                  Device ID dihitung secara stabil dari Windows MachineGUID & arsitektur perangkat sesuai Standar ALCO v2.2.
                </p>
              </div>

              {/* Verified Features */}
              {isActivated && licenseStatus?.features && licenseStatus.features.length > 0 && (
                <div className="bg-[var(--secondary)]/40 border border-[var(--border)] p-4 rounded-xl space-y-2.5">
                  <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Fitur Berlisensi Aktif
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {licenseStatus.features.map((feat) => (
                      <div
                        key={feat}
                        className="flex items-center gap-2 text-xs font-medium text-[var(--fg-app)] bg-[var(--card)] px-2.5 py-1.5 rounded-lg border border-[var(--border)]"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{feat.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={onRefreshStatus}
                  className="alco-btn alco-btn-secondary text-xs h-9 px-3 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Status</span>
                </button>

                {isActivated ? (
                  <button
                    onClick={handleDeactivate}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1.5 rounded hover:bg-rose-500/10 transition-colors"
                  >
                    Nonaktifkan Lisensi
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveSubTab('activate')}
                    className="alco-btn alco-btn-primary text-xs h-9 px-4 font-bold flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Aktivasi Sekarang</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REQUEST CODE v2 */}
          {activeSubTab === 'request' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Buat <strong>Request Code v2</strong> untuk dikirimkan kepada Owner / Administrator ALCO untuk penerbitan lisensi resmi.
              </div>

              {reqError && (
                <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg">
                  {reqError}
                </div>
              )}

              <form onSubmit={handleGenerateRequestCode} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--fg-app)] mb-1">
                    Nama Lengkap Pemohon *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="misal: Budi Santoso"
                    className="alco-control w-full px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--fg-app)] mb-1">
                    Alamat Email Terdaftar *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="misal: budi@agency.com"
                    className="alco-control w-full px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--fg-app)] mb-1">
                    Catatan / Nama Studio (Opsional)
                  </label>
                  <input
                    type="text"
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="misal: Studio Produksi Jakarta"
                    className="alco-control w-full px-3 py-2 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingRequest}
                  className="alco-btn alco-btn-primary w-full text-xs h-9 font-bold flex items-center justify-center gap-1.5"
                >
                  {isGeneratingRequest ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Laptop className="w-3.5 h-3.5" />
                  )}
                  <span>Buat Request Code v2</span>
                </button>
              </form>

              {/* Generated Result */}
              {generatedRequestCode && (
                <div className="mt-4 p-4 bg-[var(--secondary)]/40 border border-blue-500/30 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      Request Code v2 Berhasil Dibuat
                    </span>
                    <button
                      onClick={() => copyToClipboard(generatedRequestCode, 'req')}
                      className="alco-btn alco-btn-primary text-[11px] h-7 px-3 flex items-center gap-1"
                    >
                      {copiedReqCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedReqCode ? 'Tersalin' : 'Salin Kode'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-[var(--card)] rounded-lg border border-[var(--border)] font-mono text-[11px] text-[var(--fg-app)] break-all max-h-28 overflow-y-auto alco-scrollbar select-all">
                    {generatedRequestCode}
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Kirimkan kode ini kepada Owner / Administrator ALCO untuk diterbitkan License Code resmi.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVATE LICENSE */}
          {activeSubTab === 'activate' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Tempelkan <strong>License Code</strong> yang diterbitkan oleh ALCO License Generator resmi (dimulai dengan <code>ALCO-LIC-v1...</code>).
              </div>

              {activationError && (
                <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Aktivasi Ditolak:</strong> {activationError}
                  </div>
                </div>
              )}

              {activationSuccess && (
                <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{activationSuccess}</span>
                </div>
              )}

              <form onSubmit={handleActivateLicense} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--fg-app)] mb-1">
                    ALCO License Code *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="ALCO-LIC-v1.eyJsaWNlbnNlVmVyc2lvbiI6IjEuMCIs..."
                    className="alco-control w-full p-2.5 text-xs font-mono resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('request')}
                    className="text-xs text-blue-400 hover:underline font-medium"
                  >
                    Belum punya kode? Buat Request Code
                  </button>

                  <button
                    type="submit"
                    disabled={isActivating || !licenseInput.trim()}
                    className="alco-btn alco-btn-primary text-xs h-9 px-5 font-bold flex items-center gap-1.5"
                  >
                    {isActivating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Key className="w-3.5 h-3.5" />
                    )}
                    <span>Verifikasi & Aktivasi</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--muted)]/20 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
          <span>ALCO Ecosystem Authority Security</span>
          <span className="font-mono">Ed25519 Local Verification</span>
        </div>
      </div>
    </div>
  );
};
