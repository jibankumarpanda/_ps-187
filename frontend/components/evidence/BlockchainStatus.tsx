"use client";

import React from 'react';
import { Blocks, Layers, Clock, Building2, UserCheck, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { truncateHash } from '@/lib/utils';
import type { Evidence } from '@/types/evidence';

interface BlockchainStatusProps {
  evidence: Evidence;
  className?: string;
}

export function BlockchainStatus({ evidence, className = '' }: BlockchainStatusProps) {
  return (
    <div className={`bg-card border border-border rounded-none p-5 space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Blocks className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Permissioned Enterprise Ledger Status</h3>
        </div>
        <StatusBadge status={evidence.verificationStatus} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
        <div className="p-3 bg-[#0F151C] border border-border rounded-none">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 mb-1">
            <Layers className="w-3.5 h-3.5 text-accent" /> Distributed Ledger
          </div>
          <div className="text-sm font-bold text-foreground">Hyperledger Fabric v2.5</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Channel: border-surveillance-prod</div>
        </div>

        <div className="p-3 bg-[#0F151C] border border-border rounded-none">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 mb-1">
            <Blocks className="w-3.5 h-3.5 text-accent" /> Transaction Reference
          </div>
          <div className="text-sm font-bold text-accent">{evidence.blockchainTxId}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Block Height: #{evidence.blockNumber}</div>
        </div>

        <div className="p-3 bg-[#0F151C] border border-border rounded-none">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 mb-1">
            <Clock className="w-3.5 h-3.5 text-accent" /> Immutable Timestamp
          </div>
          <div className="text-sm font-bold text-foreground">{evidence.timestamp}</div>
          <div className="text-[10px] text-green-500 mt-0.5">Consensus Verified (Raft)</div>
        </div>

        <div className="p-3 bg-[#0F151C] border border-border rounded-none">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 mb-1">
            <Building2 className="w-3.5 h-3.5 text-accent" /> Endorsing Organization
          </div>
          <div className="text-sm font-bold text-foreground">{evidence.recordedOrg}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">MSPID: BSFMSP</div>
        </div>

        <div className="p-3 bg-[#0F151C] border border-border rounded-none">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 mb-1">
            <UserCheck className="w-3.5 h-3.5 text-accent" /> Certified Operator
          </div>
          <div className="text-sm font-bold text-foreground">{evidence.recordedBy}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">PKI Certificate: X.509 Validated</div>
        </div>

        <div className="p-3 bg-[#0F151C] border border-border rounded-none">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Cryptographic Seal
          </div>
          <div className="text-sm font-bold text-green-500 truncate">
            {truncateHash(evidence.hash, 8)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">ECDSA P-256 Signature</div>
        </div>
      </div>
    </div>
  );
}
