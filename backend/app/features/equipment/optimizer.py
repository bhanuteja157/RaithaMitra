"""
AD-28: Google OR-Tools CP-SAT Shared Equipment Scheduling & Fair Cost Allocation Engine.
Schedules consecutive non-overlapping farm operations, checks feasibility/consent,
and allocates base + shared delivery costs transparently with exact sum reconciliation.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ortools.sat.python import cp_model

from backend.app.db.database import get_db_connection
from backend.app.features.equipment.availability import check_equipment_availability
from backend.app.features.equipment.compatibility import is_equipment_compatible
from backend.app.features.equipment.schemas import SharedOptimizationRequest


def _fmt_hhmm(minutes_from_midnight: int) -> str:
    h = (minutes_from_midnight // 60) % 24
    m = minutes_from_midnight % 60
    return f"{h:02d}:{m:02d}"


def optimize_shared_equipment(
    *,
    requester_user_id: str,
    payload: SharedOptimizationRequest,
    persist: bool = True,
) -> Dict[str, Any]:
    participants = payload.participants
    unconsented = [p.farmer_label for p in participants if not p.consented]
    if unconsented:
        return {
            "feasible": False,
            "solver": "Google OR-Tools CP-SAT",
            "reason": f"Farmer consent is mandatory for shared scheduling. Missing consent from: {', '.join(unconsented)}.",
        }

    hourly_rate = payload.hourly_rate_inr
    owner_id = requester_user_id
    eq_row = None

    if payload.equipment_id:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM equipment_listings WHERE id = ?", (payload.equipment_id,)).fetchone()
            if not row:
                return {"feasible": False, "solver": "Google OR-Tools CP-SAT", "reason": "Selected equipment not found."}
            eq_row = dict(row)
            owner_id = eq_row["owner_id"]
            ops = json.loads(eq_row["suitable_operations_json"] or "[]")
            if not is_equipment_compatible(eq_row["category"], ops, payload.operation_type):
                return {
                    "feasible": False,
                    "solver": "Google OR-Tools CP-SAT",
                    "reason": f"Equipment '{eq_row['equipment_name']}' ({eq_row['category']}) is not compatible with '{payload.operation_type}'.",
                }
            if hourly_rate is None:
                hourly_rate = float(eq_row["rental_rate_inr"])
        finally:
            conn.close()

    if hourly_rate is None:
        hourly_rate = 800.0

    # OR-Tools CP-SAT Non-Overlapping Sequential Scheduling (06:00 to 20:00 = 840 minutes window)
    start_day_min = 6 * 60
    horizon_end_min = 20 * 60
    setup_min = int(payload.setup_minutes_between_farms)

    durations_min = [int(round(p.required_hours * 60)) for p in participants]
    total_required_min = sum(durations_min) + setup_min * max(0, len(participants) - 1)
    if start_day_min + total_required_min > horizon_end_min:
        return {
            "feasible": False,
            "solver": "Google OR-Tools CP-SAT",
            "reason": (
                f"Infeasible schedule: Total required time ({total_required_min / 60:.1f} hrs including setup) "
                f"exceeds the 14-hour daily operating window (06:00–20:00)."
            ),
        }

    # Check equipment calendar availability across the scheduled span
    end_hhmm = _fmt_hhmm(start_day_min + total_required_min)
    start_iso = f"{payload.target_date}T06:00:00"
    end_iso = f"{payload.target_date}T{end_hhmm}:00"
    if payload.equipment_id:
        conn = get_db_connection()
        try:
            avail = check_equipment_availability(
                conn.cursor(),
                equipment_id=payload.equipment_id,
                start_datetime=start_iso,
                end_datetime=end_iso,
            )
            if not avail["available"]:
                return {
                    "feasible": False,
                    "solver": "Google OR-Tools CP-SAT",
                    "reason": f"Equipment conflict on {payload.target_date}: {avail['reason']}",
                }
        finally:
            conn.close()

    model = cp_model.CpModel()
    intervals = []
    starts = []
    ends = []

    for idx, dur in enumerate(durations_min):
        eff_dur = dur + (setup_min if idx < len(durations_min) - 1 else 0)
        s_var = model.NewIntVar(start_day_min, horizon_end_min - eff_dur, f"start_{idx}")
        e_var = model.NewIntVar(start_day_min + eff_dur, horizon_end_min, f"end_{idx}")
        iv = model.NewIntervalVar(s_var, eff_dur, e_var, f"job_{idx}")
        starts.append(s_var)
        ends.append(e_var)
        intervals.append(iv)

    model.AddNoOverlap(intervals)
    makespan = model.NewIntVar(start_day_min, horizon_end_min, "makespan")
    model.AddMaxEquality(makespan, ends)
    model.Minimize(makespan)

    solver = cp_model.CpSolver()
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "feasible": False,
            "solver": "Google OR-Tools CP-SAT",
            "reason": "OR-Tools CP-SAT could not find a non-overlapping schedule within constraints.",
        }

    # Fair Cost Allocation
    n = len(participants)
    total_hours = round(sum(p.required_hours for p in participants), 2)
    base_rental_total = round(total_hours * hourly_rate, 2)
    shared_delivery_total = round(float(payload.shared_delivery_charge_inr), 2)
    total_shared_cost = round(base_rental_total + shared_delivery_total, 2)

    # Split shared delivery equally with exact penny/rupee reconciliation
    equal_delivery = round(shared_delivery_total / n, 2)
    delivery_shares = [equal_delivery for _ in range(n)]
    diff_delivery = round(shared_delivery_total - sum(delivery_shares), 2)
    if abs(diff_delivery) > 0:
        delivery_shares[0] = round(delivery_shares[0] + diff_delivery, 2)

    schedule_rows: List[Dict[str, Any]] = []
    total_individual_cost = 0.0

    for idx, p in enumerate(participants):
        s_m = int(solver.Value(starts[idx]))
        op_end_m = s_m + durations_min[idx]
        ind_base = round(p.required_hours * hourly_rate, 2)
        ind_total = round(ind_base + float(payload.individual_delivery_charge_inr), 2)
        total_individual_cost = round(total_individual_cost + ind_total, 2)

        alloc_base = ind_base
        alloc_del = delivery_shares[idx]
        alloc_total = round(alloc_base + alloc_del, 2)
        savings = round(ind_total - alloc_total, 2)

        schedule_rows.append({
            "farmer_label": p.farmer_label,
            "farm_id": p.farm_id,
            "area_acres": p.area_acres,
            "required_hours": p.required_hours,
            "start_time": _fmt_hhmm(s_m),
            "end_time": _fmt_hhmm(op_end_m),
            "individual_cost_inr": ind_total,
            "allocated_base_inr": alloc_base,
            "allocated_delivery_inr": alloc_del,
            "allocated_total_inr": alloc_total,
            "savings_inr": savings,
        })

    # Reconcile exact sum
    sum_alloc = round(sum(r["allocated_total_inr"] for r in schedule_rows), 2)
    rounding_adj = round(total_shared_cost - sum_alloc, 2)
    if abs(rounding_adj) > 0 and schedule_rows:
        schedule_rows[0]["allocated_total_inr"] = round(schedule_rows[0]["allocated_total_inr"] + rounding_adj, 2)
        schedule_rows[0]["savings_inr"] = round(
            schedule_rows[0]["individual_cost_inr"] - schedule_rows[0]["allocated_total_inr"], 2
        )

    total_savings = round(total_individual_cost - total_shared_cost, 2)
    savings_pct = round((total_savings / total_individual_cost) * 100.0, 2) if total_individual_cost > 0 else 0.0

    shared_id: Optional[str] = None
    if persist and payload.equipment_id:
        now_iso = datetime.now(timezone.utc).isoformat()
        shared_id = f"shr_{uuid.uuid4().hex[:10]}"
        conn = get_db_connection()
        try:
            conn.execute(
                """
                INSERT INTO shared_equipment_requests (
                    id, equipment_id, requester_user_id, owner_id, operation_type,
                    target_date, total_hours, total_individual_cost_inr,
                    total_shared_cost_inr, total_savings_inr, savings_pct,
                    schedule_json, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed', ?, ?)
                """,
                (
                    shared_id,
                    payload.equipment_id,
                    requester_user_id,
                    owner_id,
                    payload.operation_type,
                    payload.target_date,
                    total_hours,
                    total_individual_cost,
                    total_shared_cost,
                    total_savings,
                    savings_pct,
                    json.dumps(schedule_rows),
                    now_iso,
                    now_iso,
                ),
            )
            for r in schedule_rows:
                conn.execute(
                    """
                    INSERT INTO shared_booking_allocations (
                        id, shared_request_id, farmer_label, farm_id, user_id,
                        area_acres, duration_hours, allocated_base_inr, allocated_delivery_inr,
                        allocated_total_inr, individual_cost_inr, savings_inr,
                        consent_status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'consented', ?)
                    """,
                    (
                        f"sba_{uuid.uuid4().hex[:10]}",
                        shared_id,
                        r["farmer_label"],
                        r["farm_id"],
                        requester_user_id if r["farm_id"] else None,
                        r["area_acres"],
                        r["required_hours"],
                        r["allocated_base_inr"],
                        r["allocated_delivery_inr"],
                        r["allocated_total_inr"],
                        r["individual_cost_inr"],
                        r["savings_inr"],
                        now_iso,
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    return {
        "feasible": True,
        "shared_request_id": shared_id,
        "solver": "Google OR-Tools CP-SAT",
        "equipment_id": payload.equipment_id,
        "equipment_name": eq_row["equipment_name"] if eq_row else "Selected Tractor / Machinery",
        "operation_type": payload.operation_type,
        "target_date": payload.target_date,
        "hourly_rate_inr": hourly_rate,
        "total_operating_hours": total_hours,
        "base_rental_total_inr": base_rental_total,
        "shared_delivery_charge_inr": shared_delivery_total,
        "total_individual_cost_inr": total_individual_cost,
        "total_shared_cost_inr": total_shared_cost,
        "total_savings_inr": total_savings,
        "savings_pct": savings_pct,
        "rounding_adjustment_inr": rounding_adj,
        "schedule": schedule_rows,
        "disclaimer": "Estimated shared savings depend on participating farmer consent, owner approval, and actual field conditions.",
    }
