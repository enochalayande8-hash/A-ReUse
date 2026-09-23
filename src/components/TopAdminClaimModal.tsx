import React, { useState } from 'react';
import { Modal } from './Modal';
import { useAuth, isDesignatedTopAdmin } from '../services/auth/AuthContext';
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle2, Lock, Sparkles } from 'lucide-react';

interface TopAdminClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TopAdminClaimModal: React.FC<TopAdminClaimModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, claimTopAdmin, isTopAdmin } = useAuth();
  const [bootstrapCode, setBootstrapCode] = useState('');
  const [statusState, setStatusState] = useState<'idle' | 'initializing' | 'success' | 'unauthorized' | 'already_initialized' | 'server_error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isCreatorAccount = isDesignatedTopAdmin(user?.email, user?.id);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = bootstrapCode.trim();
    setBootstrapCode('');

    if (!enteredCode && !isCreatorAccount) {
      setStatusState('unauthorized');
      setStatusMessage('Please enter your bootstrap authorization code');
      return;
    }

    setStatusState('initializing');
    setStatusMessage('Verifying credentials...');

    try {
      await claimTopAdmin(enteredCode || 'CREATOR_AUTHORITY');
      setStatusState('success');
      setStatusMessage('Top Admin Authority Activated');

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      const errMsg = String(err?.message || '').toLowerCase();
      if (errMsg.includes('already initialized') || errMsg.includes('already_initialized') || errMsg.includes('conflict') || errMsg.includes('409')) {
        setStatusState('already_initialized');
        setStatusMessage('Already initialized');
      } else if (errMsg.includes('network') || errMsg.includes('server') || errMsg.includes('500') || errMsg.includes('failed to fetch')) {
        setStatusState('server_error');
        setStatusMessage('Network/server error');
      } else {
        setStatusState('unauthorized');
        setStatusMessage('Invalid/unauthorized request');
      }
    }
  };

  const handleModalClose = () => {
    setBootstrapCode('');
    setStatusState('idle');
    setStatusMessage(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Secure Administrator Authorization"
      subtitle="Establish or Verify TOP_ADMIN Authority"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Role Hierarchy Notice */}
        <div className="rounded-xl p-4 bg-[#F7F4EE] border border-[#D4AF37]/30 text-xs text-[#5D4037] leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-[#2C1810] mb-1.5 text-sm">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            Official Role Hierarchy: TOP_ADMIN → ADMIN → REGISTERED_USER
          </div>
          <p>
            The <strong>TOP_ADMIN</strong> authority is governed by Firebase Authentication and server-side authorization. Top Admins hold full governance over administrative accounts, challenges, prizes, and impact configurations.
          </p>
          <div className="mt-2 text-[11px] text-[#8D6E63] bg-white/70 p-2.5 rounded-lg border border-[#2C1810]/10 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
            <span>Top Admin bootstrap code is held securely and verified by the protected backend authority.</span>
          </div>
        </div>

        {isTopAdmin ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">You are recognized as TOP_ADMIN</p>
              <p className="text-xs text-emerald-700 mt-1">
                Account <strong>{user?.email}</strong> holds authorized owner governance over Awareness Global Movement.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleClaim} className="space-y-4">
            {/* Status Notifications */}
            {statusState === 'initializing' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="font-medium">Initializing...</span>
              </div>
            )}

            {statusState === 'success' && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">Success</span>
              </div>
            )}

            {statusState === 'unauthorized' && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="font-medium">{statusMessage || 'Invalid/unauthorized request'}</span>
              </div>
            )}

            {statusState === 'already_initialized' && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium">Already initialized</span>
              </div>
            )}

            {statusState === 'server_error' && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="font-medium">Network/server error</span>
              </div>
            )}

            {isCreatorAccount && (
              <div className="p-3.5 rounded-xl bg-[#fffdf8] border border-[#e2a72e] text-[#40281d] text-xs flex items-start gap-2.5 shadow-xs">
                <Sparkles className="w-4 h-4 text-[#e2a72e] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs sm:text-sm text-[#40281d]">Movement Creator Authority Detected</p>
                  <p className="text-[#78675e] mt-0.5 text-[11px] leading-relaxed">
                    Account <strong>{user?.email}</strong> is recognized as the movement founder. Click below to activate your TOP_ADMIN access immediately.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase tracking-wider mb-1.5">
                Current Authenticated Account
              </label>
              <div className="p-3 rounded-xl bg-white border border-[#2C1810]/15 text-sm font-medium text-[#2C1810] flex items-center justify-between">
                <span>{user?.email || 'Not logged in'}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#2C1810]/10 text-[#5D4037]">
                  {user?.role || 'REGISTERED_USER'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
                Bootstrap Code {isCreatorAccount && <span className="text-[10px] font-normal text-[#8D6E63]">(Optional for Creator)</span>}
              </label>
              <input
                type="password"
                value={bootstrapCode}
                onChange={(e) => setBootstrapCode(e.target.value)}
                placeholder={isCreatorAccount ? "Optional: Enter code or click Activate below" : "Enter Bootstrap Code..."}
                disabled={statusState === 'initializing'}
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl bg-white border border-[#2C1810]/20 text-sm text-[#2C1810] placeholder-[#A1887F] focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent font-mono"
              />
              <p className="text-[11px] text-[#8D6E63] mt-1.5">
                The Bootstrap Code is submitted securely over HTTPS to the backend authority. It is never stored in browser memory, Firestore, or client assets.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#5D4037] hover:bg-[#2C1810]/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={statusState === 'initializing' || (!isCreatorAccount && !bootstrapCode.trim())}
                className="px-5 py-2.5 rounded-xl bg-[#2C1810] text-[#D4AF37] text-sm font-bold hover:bg-[#3E2723] disabled:opacity-50 transition-all border border-[#D4AF37]/50 shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {statusState === 'initializing' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>{isCreatorAccount ? 'Activate Top Admin Authority' : 'Submit Bootstrap Code'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
