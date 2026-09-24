export type EvidenceType = 'SNAPSHOT' | 'VIDEO_CLIP' | 'FRAME' | 'METADATA';

export type VerificationStatus = 'VERIFIED' | 'FAILED' | 'PENDING' | 'NOT_VERIFIED';

export interface FabricHistoryEntry {
  txId: string;
  timestamp: { seconds?: number; nanos?: number } | string;
  isDelete: boolean;
  value?: Record<string, any>;
}

export interface FabricData {
  channel: string;
  chaincode: string;
  mspId: string;
  txId?: string;
  onChainHash: string;
  status: string;
  peerEndpoint?: string;
  ledgerRecord?: {
    docType: string;
    evidenceId: string;
    eventId: string;
    cameraId: string;
    bopId: string;
    sha256: string;
    timestamp: string;
    registeredBy: string;
    status: string;
  };
  history?: FabricHistoryEntry[];
}

export interface Evidence {
  evidenceId: string;
  eventId: string;
  cameraId: string;
  bopId: string;
  evidenceType: EvidenceType;
  timestamp: string;
  hash: string;
  blockchainTxId: string;
  blockNumber: number;
  verificationStatus: VerificationStatus;
  recordedBy: string;
  recordedOrg: string;
  fileUrl?: string;
  fileSizeKB?: number;
  fabricData?: FabricData;
}

export interface BlockchainRecord {
  transactionId: string;
  blockNumber: number;
  ledger: string;
  timestamp: string;
  evidenceHash: string;
  recordedOrg: string;
  recordedBy: string;
  channel: string;
  chaincode: string;
}
