"""
Hybrid Discrete-Unit Knapsack Pooling Engine
Prevents lot fragmentation by packing in discrete 50kg bag multiples (0.5 Quintals)
and standard 1.5-Ton Mahindra Bolero units.
"""

BOLERO_CAPACITY_QUINTALS = 15.0  # 1,500 kg (30 Bags)
BAG_WEIGHT_QUINTALS = 0.5        # 50 kg per bag

def calculate_freight_split(lots, total_rent=2400):
    """
    Splits transport rent proportionally based on weight.
    Ramu pays only for what he loads.
    """
    total_loaded = sum(lot["allocated_quintals"] for lot in lots)
    if total_loaded == 0:
        return {}

    splits = {}
    for lot in lots:
        share = (lot["allocated_quintals"] / total_loaded) * total_rent
        splits[lot["farmer_id"]] = {
            "allocated_quintals": lot["allocated_quintals"],
            "allocated_bags": int(lot["allocated_quintals"] / BAG_WEIGHT_QUINTALS),
            "freight_cost_rs": round(share, 2),
            "freight_per_quintal_rs": round(share / lot["allocated_quintals"], 2)
        }
    return splits

def match_buyer_order(active_lots, order_quantity_quintals):
    """
    Hybrid Order-Matching:
    1. Fulfills full lots first along the route cluster.
    2. Quantizes marginal fulfillment in discrete 50kg bag multiples.
    3. Retains viable commercial rollovers with Priority #1 for next orders.
    """
    matched = []
    remaining_needed = float(order_quantity_quintals)

    for lot in sorted(active_lots, key=lambda x: x.get("registered_at", "")):
        if remaining_needed <= 0:
            break

        available_qty = lot["quantity_quintals"]
        if available_qty <= 0:
            continue

        if available_qty <= remaining_needed:
            # Full lot allocation
            matched.append({
                "lot_id": lot["lot_id"],
                "farmer_name": lot["farmer_name"],
                "farmer_id": lot["farmer_id"],
                "allocated_quintals": available_qty,
                "status": "FULLY_MATCHED"
            })
            remaining_needed -= available_qty
            lot["quantity_quintals"] = 0
            lot["status"] = "DISPATCHED"
        else:
            # Discrete bag quantization
            allocated = remaining_needed
            allocated_bags = int(allocated / BAG_WEIGHT_QUINTALS)
            discrete_allocated = allocated_bags * BAG_WEIGHT_QUINTALS

            matched.append({
                "lot_id": lot["lot_id"],
                "farmer_name": lot["farmer_name"],
                "farmer_id": lot["farmer_id"],
                "allocated_quintals": discrete_allocated,
                "status": "PARTIAL_MATCHED"
            })
            lot["quantity_quintals"] -= discrete_allocated
            lot["status"] = "QUEUED_PRIORITY_1"
            remaining_needed -= discrete_allocated

    return {
        "order_requested_quintals": order_quantity_quintals,
        "total_fulfilled_quintals": sum(m["allocated_quintals"] for m in matched),
        "remaining_unfulfilled": max(0, remaining_needed),
        "matched_lots": matched,
        "remaining_active_lots": active_lots
    }
