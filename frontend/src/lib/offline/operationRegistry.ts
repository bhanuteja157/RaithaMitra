// frontend/src/lib/offline/operationRegistry.ts
// Allowlisted offline operations matching backend AD-31 operation_registry.py.

export type AllowedOfflineOpType =
  | 'create_manual_expense'
  | 'record_harvest_observation'
  | 'record_market_price'
  | 'equipment_booking_draft'
  | 'labour_job_draft'
  | 'transport_booking_draft'
  | 'bidding_listing_draft';

export interface OfflineOperationMeta {
  type: AllowedOfflineOpType;
  label: string;
  riskClass: 'low_risk' | 'consequential';
  module: string;
}

export const OFFLINE_OPERATIONS: Record<AllowedOfflineOpType, OfflineOperationMeta> = {
  create_manual_expense: {
    type: 'create_manual_expense',
    label: 'Manual Agricultural Expense',
    riskClass: 'low_risk',
    module: 'Finance',
  },
  record_harvest_observation: {
    type: 'record_harvest_observation',
    label: 'Harvest Quantity Record',
    riskClass: 'low_risk',
    module: 'Post-Harvest',
  },
  record_market_price: {
    type: 'record_market_price',
    label: 'Observed Market Price',
    riskClass: 'low_risk',
    module: 'Market Intelligence',
  },
  equipment_booking_draft: {
    type: 'equipment_booking_draft',
    label: 'Equipment Rental Draft',
    riskClass: 'consequential',
    module: 'Equipment Connect',
  },
  labour_job_draft: {
    type: 'labour_job_draft',
    label: 'Labour Hiring Draft',
    riskClass: 'consequential',
    module: 'Labour Connect',
  },
  transport_booking_draft: {
    type: 'transport_booking_draft',
    label: 'Transport Booking Draft',
    riskClass: 'consequential',
    module: 'Transport Connect',
  },
  bidding_listing_draft: {
    type: 'bidding_listing_draft',
    label: 'Smart Bidding Listing Draft',
    riskClass: 'consequential',
    module: 'Smart Bidding',
  },
};
