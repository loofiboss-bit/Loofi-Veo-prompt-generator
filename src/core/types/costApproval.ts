/**
 * Paid Cost Approval Types — Phase 4.2
 */
export interface PaidCostApproval {
  approvalId: string;
  modelId: string;
  maximumChargeUsd: number;
  currency: 'USD';
  confidence?: 'exact' | 'upper-bound';
  sourceUrl?: string;
  verifiedDate?: string;
  approvedAt: number;
  payloadHash?: string;
  hashVersion?: 2;
}
