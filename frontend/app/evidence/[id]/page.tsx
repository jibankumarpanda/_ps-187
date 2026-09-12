"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileCheck, ShieldCheck, Image as ImageIcon, ExternalLink, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HashVerification } from '@/components/evidence/HashVerification';
import { BlockchainStatus } from '@/components/evidence/BlockchainStatus';
import { getEvidenceById, verifyEvidence } from '@/lib/api';
import type { Evidence } from '@/types/evidence';

export default function EvidenceVerificationPage({ params }: { params: { id: string } }) {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getEvidenceById(params.id).then((data) => {
      if (data) setEvidence(data);
      setIsLoading(false);
    });
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-[#37B9FF] border-t-transparent rounded-full animate-spin" />
        Connecting to Hyperledger Fabric cryptographic peer...
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-base font-bold text-red-500">Evidence File Not Found</h2>
        <p className="text-xs text-muted-foreground">No immutable ledger record exists for ID {params.id}.</p>
        <Link
          href="/evidence"
          className="inline-block px-4 py-2 bg-muted text-xs font-semibold rounded-none text-foreground"
        >
          Return to Evidence Ledger
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Verification Console"
        subtitle={`Cryptographic integrity and chain-of-custody audit for ${evidence.evidenceId}`}
        breadcrumbs={[
          { label: 'Evidence', href: '/evidence' },
          { label: evidence.evidenceId },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/events/${evidence.eventId}`}
              className="px-3 py-1.5 rounded-none bg-muted border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-accent" />
              Linked Event {evidence.eventId}
            </Link>
            <Link
              href={`/investigation?eventId=${evidence.eventId}`}
              className="px-3.5 py-1.5 rounded-none bg-accent hover:bg-accent/90 text-[#071018] text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Investigate Case
            </Link>
          </div>
        }
      />

      {/* ─── INTERACTIVE HASH VERIFICATION CONSOLE (Section 33) ─── */}
      <HashVerification
        evidence={evidence}
        onVerify={() => verifyEvidence(evidence.evidenceId)}
      />

      {/* ─── ENTERPRISE HYPERLEDGER FABRIC STATUS (Section 34) ─── */}
      <BlockchainStatus evidence={evidence} />

      {/* Forensic Evidence Binary Preview Card */}
      <div className="bg-card border border-border rounded-none p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-accent" />
            Encrypted Evidence Binary Payload
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            File Size: {evidence.fileSizeKB || 245} KB • Format: PNG / SHA-256
          </span>
        </div>

        <div
          className="relative bg-[#05080B] border border-border rounded-none overflow-hidden flex items-center justify-center p-8"
          style={{ minHeight: '260px' }}
        >
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#263442_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

          <div className="relative z-10 flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-none bg-[#0F151C] border border-border flex items-center justify-center text-accent">
              <FileCheck className="w-8 h-8" />
            </div>
            <div className="font-mono text-xs text-foreground font-bold">
              {evidence.evidenceId}.secbin
            </div>
            <div className="text-[11px] text-muted-foreground max-w-md font-mono">
              Digest: {evidence.hash}
            </div>
            <div className="text-[10px] text-green-500 font-semibold bg-[#39D98A]/10 px-2.5 py-1 rounded border border-[#39D98A]/20">
              AES-256 ENCRYPTED AT REST • ZERO THIRD-PARTY EXPOSURE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
