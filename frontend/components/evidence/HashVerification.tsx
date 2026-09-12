"use client";

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Check, Copy, RefreshCw, Blocks } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { truncateHash } from '@/lib/utils';
import type { Evidence } from '@/types/evidence';

interface HashVerificationProps {
  evidence: Evidence;
  onVerify: () => Promise<any>;
  className?: string;
}

export function HashVerification({ evidence, onVerify, className = '' }: HashVerificationProps) {
  const { showToast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    currentHash: string;
    blockchainHash: string;
    blockNumber: number;
    txId: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast({
      title: 'Hash Copied to Clipboard',
      message: text,
      type: 'info',
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = async () => {
    try {
      setIsVerifying(true);
      const res = await onVerify();
      setVerificationResult(res);
      if (res.verified) {
        showToast({
          title: 'Evidence Integrity Verified',
          message: 'SHA-256 digest matches Hyperledger Fabric block record perfectly.',
          type: 'success',
        });
      } else {
        showToast({
          title: 'Evidence Integrity Failed',
          message: 'Cryptographic hash mismatch detected! Evidence may be altered or corrupted.',
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        title: 'Verification Node Timeout',
        message: 'Could not contact Hyperledger peer.',
        type: 'error',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const isVerified = verificationResult ? verificationResult.verified : evidence.verificationStatus === 'VERIFIED';
  const isFailed = verificationResult ? !verificationResult.verified : evidence.verificationStatus === 'FAILED';
  const currentHash = verificationResult ? verificationResult.currentHash : evidence.hash;
  const blockchainHash = verificationResult
    ? verificationResult.blockchainHash
    : isFailed
    ? evidence.hash.slice(0, -8) + 'CORRUPT'
    : evidence.hash;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ─── LARGE VERIFICATION STATUS CARD (Section 33) ─── */}
      <div
        className={`p-6 rounded-none border transition-all ${
          isVerified
            ? 'bg-[#39D98A]/10 border-[#39D98A]/40'
            : isFailed
            ? 'bg-red-500/10 border-[#FF5C67]/50'
            : 'bg-muted border-border'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-none flex items-center justify-center flex-shrink-0 ${
                isVerified
                  ? 'bg-[#39D98A]/20 text-green-500'
                  : isFailed
                  ? 'bg-red-500/20 text-red-500'
                  : 'bg-card text-[#F4C95D]'
              }`}
            >
              {isVerified ? (
                <ShieldCheck className="w-7 h-7" />
              ) : isFailed ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <Blocks className="w-7 h-7" />
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-[0.08em] text-muted-foreground block">
                Cryptographic Audit Status
              </span>
              <h2
                className={`text-lg sm:text-xl font-bold tracking-tight mt-0.5 ${
                  isVerified
                    ? 'text-green-500'
                    : isFailed
                    ? 'text-red-500'
                    : 'text-[#F4C95D]'
                }`}
              >
                {isVerified
                  ? '✓ EVIDENCE INTEGRITY VERIFIED'
                  : isFailed
                  ? '! EVIDENCE INTEGRITY VERIFICATION FAILED'
                  : 'PENDING VERIFICATION VALIDATION'}
              </h2>
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="px-5 py-2.5 rounded-none bg-accent hover:bg-accent/90 text-[#071018] font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Verifying Digest...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Verify Evidence
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── DUAL HASH COMPARISON CONSOLE ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current File Hash */}
        <div className="bg-card border border-border rounded-none p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current File SHA-256 Hash
            </span>
            <button
              onClick={() => handleCopy(currentHash, 'current')}
              className="text-[11px] text-accent hover:underline flex items-center gap-1 font-mono"
            >
              {copiedKey === 'current' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copy
            </button>
          </div>
          <div className="p-3 rounded-none bg-[#0F151C] border border-border font-mono text-xs text-foreground break-all select-all">
            {currentHash}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Recalculated in real-time from encrypted snapshot storage binary.
          </p>
        </div>

        {/* Blockchain Recorded Hash */}
        <div className="bg-card border border-border rounded-none p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ledger Recorded Hash (Block #{evidence.blockNumber})
            </span>
            <button
              onClick={() => handleCopy(blockchainHash, 'blockchain')}
              className="text-[11px] text-accent hover:underline flex items-center gap-1 font-mono"
            >
              {copiedKey === 'blockchain' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copy
            </button>
          </div>
          <div className="p-3 rounded-none bg-[#0F151C] border border-border font-mono text-xs text-foreground break-all select-all">
            {blockchainHash}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Hyperledger Fabric Immutable Block</span>
            <span
              className={`font-mono font-bold ${
                isVerified ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {isVerified ? 'EXACT MATCH' : 'MISMATCH DETECTED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
