"""
AD-31: Allowlisted Offline Operation Registry.
Separates low_risk auto-synchronizable records from consequential transactions
that require fresh availability/budget/inventory revalidation and explicit confirmation.
"""
from __future__ import annotations

from typing import Any, Dict

ALLOWED_OPERATIONS: Dict[str, Dict[str, Any]] = {
    "create_manual_expense": {
        "risk_class": "low_risk",
        "module": "finance",
        "auto_sync_allowed": True,
        "description": "Synchronize a farmer-authorized manual agricultural expense into AD-24 Financial Ledger.",
    },
    "record_harvest_observation": {
        "risk_class": "low_risk",
        "module": "post_harvest",
        "auto_sync_allowed": True,
        "description": "Synchronize a farmer-recorded harvest quantity observation into AD-27.",
    },
    "record_market_price": {
        "risk_class": "low_risk",
        "module": "market_intelligence",
        "auto_sync_allowed": True,
        "description": "Synchronize a farmer-observed local mandi price into AD-29.",
    },
    "equipment_booking_draft": {
        "risk_class": "consequential",
        "module": "equipment",
        "auto_sync_allowed": False,
        "description": "Revalidate equipment availability & pricing before requesting farmer confirmation.",
    },
    "labour_job_draft": {
        "risk_class": "consequential",
        "module": "labour",
        "auto_sync_allowed": False,
        "description": "Revalidate budget & worker requirements before posting a labour job.",
    },
    "transport_booking_draft": {
        "risk_class": "consequential",
        "module": "transportation",
        "auto_sync_allowed": False,
        "description": "Revalidate vehicle capacity & fare before booking transport.",
    },
    "bidding_listing_draft": {
        "risk_class": "consequential",
        "module": "bidding",
        "auto_sync_allowed": False,
        "description": "Revalidate available unreserved lot inventory before publishing an auction listing.",
    },
}
