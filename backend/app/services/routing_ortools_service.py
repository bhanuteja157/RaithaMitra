# backend/app/services/routing_ortools_service.py
"""
Google Routes Distance Matrix & Google OR-Tools CP-SAT Procurement Optimizer (AD-05).
Uses integer paise for exact currency constraints, enforces MOQ/stock/budget,
supports multi-supplier allocation, and falls back cleanly to Haversine & deterministic math.
"""
import os
from typing import Any, Dict, List, Optional
from ortools.sat.python import cp_model

from backend.app.schemas.biointel_advanced import (
    RouteDistanceResult,
    ORToolsProcurementRequest,
    ORToolsProcurementResponse,
    SupplierAllocation,
    SupplierOfferInput,
)
from backend.app.services.http_client import fetch_json_with_resilience
from backend.app.services.nursery_service import calculate_haversine_distance


class RoutingORToolsService:
    async def compute_supplier_route(
        self,
        supplier_id: str,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        fixed_transport_inr: float = 250.0,
        per_km_rate_inr: float = 12.0,
        round_trip: bool = False,
    ) -> RouteDistanceResult:
        """
        Queries Google Routes API (computeRoutes) when GOOGLE_ROUTES_API_KEY is configured.
        Falls back to explicitly labelled Haversine straight-line estimate otherwise.
        """
        routes_key = os.getenv("GOOGLE_ROUTES_API_KEY", "")
        if routes_key:
            body = {
                "origin": {"location": {"latLng": {"latitude": origin_lat, "longitude": origin_lon}}},
                "destination": {"location": {"latLng": {"latitude": dest_lat, "longitude": dest_lon}}},
                "travelMode": "DRIVE",
                "routingPreference": "TRAFFIC_AWARE",
            }
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": routes_key,
                "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
            }
            data = await fetch_json_with_resilience(
                provider_key="google_routes",
                url="https://routes.googleapis.com/directions/v2:computeRoutes",
                method="POST",
                json_body=body,
                headers=headers,
                timeout_s=4.5,
                cache_ttl_s=3600,
                cache_key_extra=f"{origin_lat:.4f},{origin_lon:.4f}->{dest_lat:.4f},{dest_lon:.4f}",
            )
            routes = (data or {}).get("routes", [])
            if routes:
                dist_km = round(routes[0].get("distanceMeters", 0) / 1000.0, 2)
                dur_str = routes[0].get("duration", "0s").rstrip("s")
                try:
                    dur_min = round(float(dur_str) / 60.0, 1)
                except ValueError:
                    dur_min = None
                effective_km = dist_km * (2.0 if round_trip else 1.0)
                est_cost = round(fixed_transport_inr + effective_km * per_km_rate_inr, 2)
                return RouteDistanceResult(
                    supplier_id=supplier_id,
                    distance_km=dist_km,
                    duration_minutes=dur_min,
                    distance_type="Google Routes road distance",
                    route_available=True,
                    estimated_transport_cost_inr=est_cost,
                )

        # Fallback: Haversine straight-line distance (explicitly labelled)
        h_km = calculate_haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
        effective_km = h_km * (2.0 if round_trip else 1.0)
        est_cost = round(fixed_transport_inr + effective_km * per_km_rate_inr, 2)
        return RouteDistanceResult(
            supplier_id=supplier_id,
            distance_km=h_km,
            duration_minutes=None,
            distance_type="Straight-line estimate (Haversine)",
            route_available=False,
            estimated_transport_cost_inr=est_cost,
        )

    def optimize_procurement_cp_sat(self, req: ORToolsProcurementRequest) -> ORToolsProcurementResponse:
        """
        Mathematical multi-supplier procurement optimization using Google OR-Tools CP-SAT.
        Uses integer currency units (paise = INR * 100).
        Never optimizes unknown/expired stock or missing prices.
        """
        eligible: List[SupplierOfferInput] = []
        excluded: List[Dict[str, str]] = []

        for offer in req.offers:
            if offer.is_demo and not req.allow_demo_inventory:
                excluded.append({"product_id": offer.product_id, "reason": "Demo inventory excluded"})
                continue
            if offer.unit_price_inr is None:
                excluded.append({"product_id": offer.product_id, "reason": "Contact Supplier (price missing)"})
                continue
            if offer.available_quantity is None or offer.available_quantity <= 0:
                excluded.append({"product_id": offer.product_id, "reason": "Availability Unknown / Out of stock"})
                continue
            if not offer.inventory_fresh:
                excluded.append({"product_id": offer.product_id, "reason": "Confirmation Required (expired inventory)"})
                continue
            if offer.available_quantity < offer.minimum_order_quantity:
                excluded.append({"product_id": offer.product_id, "reason": "Stock below supplier MOQ"})
                continue
            eligible.append(offer)

        if not eligible:
            return ORToolsProcurementResponse(
                optimization_status="Infeasible",
                solver_used="Google OR-Tools CP-SAT",
                required_quantity=req.required_quantity,
                fulfilled_quantity=0,
                unfulfilled_quantity=req.required_quantity,
                total_product_cost_inr=0.0,
                total_transportation_cost_inr=0.0,
                total_procurement_cost_inr=0.0,
                farmer_budget_inr=req.farmer_budget_inr,
                budget_utilization_pct=0.0,
                remaining_budget_inr=req.farmer_budget_inr,
                budget_feasible=False,
                allocations=[],
                excluded_offers=excluded,
                explanation="No eligible suppliers with confirmed pricing and available stock.",
            )

        budget_paise = int(round(req.farmer_budget_inr * 100))

        def _solve_cp_sat(exact_full: bool) -> Optional[Dict[str, Any]]:
            model = cp_model.CpModel()
            select_vars = []
            qty_vars = []
            cost_terms = []

            for idx, off in enumerate(eligible):
                s = model.NewBoolVar(f"sel_{idx}")
                q = model.NewIntVar(0, int(off.available_quantity), f"qty_{idx}")
                model.Add(q <= int(off.available_quantity) * s)
                model.Add(q >= int(off.minimum_order_quantity) * s)

                unit_paise = int(round((off.unit_price_inr or 0.0) * 100))
                eff_km = off.distance_km * (2.0 if off.round_trip else 1.0)
                trans_paise = int(round((off.fixed_transport_inr + eff_km * off.per_km_rate_inr) * 100))

                select_vars.append(s)
                qty_vars.append(q)
                cost_terms.append(q * unit_paise + s * trans_paise)

            total_qty_expr = sum(qty_vars)
            total_cost_expr = sum(cost_terms)

            if exact_full:
                model.Add(total_qty_expr == req.required_quantity)
            else:
                model.Add(total_qty_expr <= req.required_quantity)
                model.Add(total_qty_expr >= 1)

            model.Add(total_cost_expr <= budget_paise)

            if exact_full:
                model.Minimize(total_cost_expr)
            else:
                # Maximize fulfilled quantity, then minimize cost
                model.Maximize(total_qty_expr * 10_000_000 - total_cost_expr)

            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = 3.0
            status = solver.Solve(model)
            if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                return {
                    "status": "Optimal" if status == cp_model.OPTIMAL else "Feasible",
                    "solver": solver,
                    "select_vars": select_vars,
                    "qty_vars": qty_vars,
                }
            return None

        # Attempt 1: Full quantity within budget
        sol = _solve_cp_sat(exact_full=True)
        is_partial = False

        # Attempt 2: Partial fulfillment plan if allowed
        if sol is None and req.allow_partial_fulfillment:
            sol = _solve_cp_sat(exact_full=False)
            is_partial = sol is not None

        if sol is None:
            return ORToolsProcurementResponse(
                optimization_status="Infeasible",
                solver_used="Google OR-Tools CP-SAT",
                required_quantity=req.required_quantity,
                fulfilled_quantity=0,
                unfulfilled_quantity=req.required_quantity,
                total_product_cost_inr=0.0,
                total_transportation_cost_inr=0.0,
                total_procurement_cost_inr=0.0,
                farmer_budget_inr=req.farmer_budget_inr,
                budget_utilization_pct=0.0,
                remaining_budget_inr=req.farmer_budget_inr,
                budget_feasible=False,
                allocations=[],
                excluded_offers=excluded,
                explanation=(
                    f"Infeasible: No combination of eligible suppliers can fulfill {req.required_quantity} units "
                    f"within budget ₹{req.farmer_budget_inr:,.2f} while respecting stock and minimum order constraints."
                ),
            )

        solver = sol["solver"]
        allocations: List[SupplierAllocation] = []
        total_prod_cost = 0.0
        total_trans_cost = 0.0
        total_qty = 0

        for idx, off in enumerate(eligible):
            qty = int(solver.Value(sol["qty_vars"][idx]))
            if qty > 0:
                unit_p = float(off.unit_price_inr or 0.0)
                prod_cost = round(qty * unit_p, 2)
                eff_km = off.distance_km * (2.0 if off.round_trip else 1.0)
                trans_cost = round(off.fixed_transport_inr + eff_km * off.per_km_rate_inr, 2)
                subtotal = round(prod_cost + trans_cost, 2)
                total_prod_cost += prod_cost
                total_trans_cost += trans_cost
                total_qty += qty
                allocations.append(SupplierAllocation(
                    product_id=off.product_id,
                    nursery_id=off.nursery_id,
                    nursery_name=off.nursery_name,
                    variety_name=off.variety_name,
                    quantity_allocated=qty,
                    unit_price_inr=unit_p,
                    product_cost_inr=prod_cost,
                    transportation_cost_inr=trans_cost,
                    subtotal_inr=subtotal,
                    distance_km=off.distance_km,
                    distance_type=off.distance_type,
                    is_demo=off.is_demo,
                ))

        total_cost = round(total_prod_cost + total_trans_cost, 2)
        unfulfilled = max(0, req.required_quantity - total_qty)
        budget_util = round((total_cost / req.farmer_budget_inr) * 100.0, 1) if req.farmer_budget_inr > 0 else 0.0
        remaining = round(req.farmer_budget_inr - total_cost, 2)

        explanation = (
            f"OR-Tools CP-SAT found {sol['status']} plan allocating {total_qty:,} units across "
            f"{len(allocations)} supplier(s) for ₹{total_cost:,.2f} "
            f"({'partial fulfillment: ' + str(unfulfilled) + ' unfulfilled' if is_partial else '100% fulfilled'})."
        )

        return ORToolsProcurementResponse(
            optimization_status=sol["status"],
            solver_used="Google OR-Tools CP-SAT (integer paise)",
            required_quantity=req.required_quantity,
            fulfilled_quantity=total_qty,
            unfulfilled_quantity=unfulfilled,
            total_product_cost_inr=round(total_prod_cost, 2),
            total_transportation_cost_inr=round(total_trans_cost, 2),
            total_procurement_cost_inr=total_cost,
            farmer_budget_inr=req.farmer_budget_inr,
            budget_utilization_pct=budget_util,
            remaining_budget_inr=remaining,
            budget_feasible=total_cost <= req.farmer_budget_inr,
            allocations=allocations,
            excluded_offers=excluded,
            explanation=explanation,
            is_partial_plan=is_partial,
        )


routing_ortools_service = RoutingORToolsService()
