"""
AD-29: Transportation-Adjusted Market Net Return Optimizer & Buyer Offer Comparator.
Ranks markets by estimated net selling return rather than highest headline price.
"""
from __future__ import annotations

from typing import Any, Dict, List

from backend.app.features.market_intelligence.schemas import (
    BuyerOfferCompareRequest,
    MarketComparisonRequest,
)


def compare_markets(payload: MarketComparisonRequest) -> Dict[str, Any]:
    qty = float(payload.available_quantity_kg)
    evaluated: List[Dict[str, Any]] = []

    for m in payload.markets:
        loss = min(qty, float(m.estimated_loss_kg))
        saleable_qty = round(qty - loss, 2)
        gross_rev = round(saleable_qty * float(m.selling_price_per_kg), 2)
        total_costs = round(
            float(m.transport_cost_inr)
            + float(m.loading_cost_inr)
            + float(m.market_fee_inr)
            + float(m.handling_cost_inr)
            + float(m.other_expenses_inr),
            2,
        )
        net_return = round(gross_rev - total_costs, 2)
        effective_net_per_kg = round(net_return / qty, 2) if qty > 0 else 0.0

        evaluated.append({
            "market_name": m.market_name,
            "district": m.district,
            "selling_price_per_kg": round(float(m.selling_price_per_kg), 2),
            "distance_km": round(float(m.distance_km), 1),
            "saleable_quantity_kg": saleable_qty,
            "estimated_loss_kg": round(loss, 2),
            "gross_revenue_inr": gross_rev,
            "transport_cost_inr": round(float(m.transport_cost_inr), 2),
            "total_selling_costs_inr": total_costs,
            "net_selling_return_inr": net_return,
            "effective_net_per_kg": effective_net_per_kg,
            "price_source_label": m.price_source_label,
        })

    ranked = sorted(evaluated, key=lambda x: x["net_selling_return_inr"], reverse=True)
    best = ranked[0]
    highest_headline = max(evaluated, key=lambda x: x["selling_price_per_kg"])

    advantage = 0.0
    if len(ranked) >= 2:
        advantage = round(best["net_selling_return_inr"] - ranked[1]["net_selling_return_inr"], 2)

    if best["market_name"] != highest_headline["market_name"]:
        reasoning = (
            f"{best['market_name']} is recommended over {highest_headline['market_name']}: "
            f"even though {highest_headline['market_name']} advertises a higher headline price (₹{highest_headline['selling_price_per_kg']}/kg vs ₹{best['selling_price_per_kg']}/kg), "
            f"{best['market_name']} yields ₹{advantage:,.0f} more estimated net return after transportation and selling expenses."
        )
    else:
        reasoning = (
            f"{best['market_name']} ranks #1 with ₹{best['net_selling_return_inr']:,.0f} estimated net return "
            f"(₹{advantage:,.0f} ahead of the next option)."
        )

    return {
        "commodity": payload.commodity,
        "available_quantity_kg": qty,
        "recommended_market": best["market_name"],
        "recommended_net_return_inr": best["net_selling_return_inr"],
        "net_advantage_over_next_inr": advantage,
        "reasoning": reasoning,
        "ranked_markets": ranked,
    }


def compare_buyer_offer(payload: BuyerOfferCompareRequest) -> Dict[str, Any]:
    qty = float(payload.quantity_kg)
    offer_gross = round(qty * float(payload.buyer_offer_per_kg), 2)
    offer_net = round(offer_gross - float(payload.buyer_transport_cost_inr), 2)

    bench_price = payload.benchmark_price_per_kg
    bench_net = None
    diff_inr = None
    verdict = "No benchmark market price provided for comparison."

    if bench_price is not None:
        bench_gross = round(qty * float(bench_price), 2)
        bench_net = round(bench_gross - float(payload.benchmark_transport_cost_inr), 2)
        diff_inr = round(offer_net - bench_net, 2)
        if diff_inr >= 0:
            verdict = (
                f"Buyer offer (₹{offer_net:,.0f} net) outperforms benchmark {payload.benchmark_market_name or 'market'} "
                f"(₹{bench_net:,.0f} net) by ₹{diff_inr:,.0f}. Explicit farmer confirmation is still required to accept."
            )
        else:
            verdict = (
                f"Buyer offer (₹{offer_net:,.0f} net) is ₹{abs(diff_inr):,.0f} below benchmark "
                f"{payload.benchmark_market_name or 'market'} (₹{bench_net:,.0f} net). Consider counter-offering or selling at market."
            )

    return {
        "commodity": payload.commodity,
        "variety": payload.variety or "FAQ",
        "quantity_kg": qty,
        "buyer_offer_per_kg": payload.buyer_offer_per_kg,
        "offer_gross_inr": offer_gross,
        "offer_net_return_inr": offer_net,
        "benchmark_market_name": payload.benchmark_market_name,
        "benchmark_price_per_kg": bench_price,
        "benchmark_net_return_inr": bench_net,
        "net_difference_vs_benchmark_inr": diff_inr,
        "verdict": verdict,
        "auto_accept": False,
    }
