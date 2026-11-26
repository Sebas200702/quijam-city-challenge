import json, time
from openjev.core import LocalJev
from openjev.types import Choice

t0 = time.time()
engine = LocalJev(device="cpu")
load_s = time.time() - t0

route_state = {
    "visitor": "foreign tourist, speaks English, prefers eco-friendly transport",
    "origin": "Gran Malecon", "destination": "Estadio Metropolitano",
    "time_to_kickoff_min": 90, "weather": "dry, 33C",
    "remaining_routes_after_safety_rules": {
        "bus_transmetro": "Transmetro via Troncal Murillo, 55 min, fare 3200 COP, shaded stops",
        "taxi_fair_fare": "verified taxi with reference fare 28000 COP, 35 min, heavy match-day traffic",
        "walk_bus_mix": "walk 15 min to Centro, then bus, 70 min, fare 3200 COP",
    },
}
route_q = {"route": Choice(
    instructions="Which route best fits this visitor: arrives on time, low cost, low emissions",
    criteria={
        "bus_transmetro": "Public transport via Troncal Murillo",
        "taxi_fair_fare": "Verified taxi with reference fare",
        "walk_bus_mix": "Walk to Centro then bus",
    })}

crowd_state = {
    "zone_saturated": "Gran Malecon at 140% capacity",
    "candidate_zones": {
        "barrio_abajo": "60% capacity, 12 verified popular businesses open, 15 min walk, no flood alert",
        "centro": "85% capacity, cultural event at 7pm, 20 min by bus",
        "estadio_area": "95% capacity, match in 3 hours",
    },
}
crowd_q = {"divert_to": Choice(
    instructions="Where should the city suggest visitors go to relieve the saturated zone",
    criteria={
        "barrio_abajo": "Barrio Abajo",
        "centro": "Centro",
        "estadio_area": "Stadium area",
    })}

runs = []
for name, state, q in [("route", route_state, route_q), ("crowd", crowd_state, crowd_q)]:
    for i in range(3):
        t = time.time()
        out = engine.system_one(json.dumps(state), q)
        runs.append((name, i, round(time.time() - t, 2), out))

print("load_s", round(load_s, 1))
for name, i, s, out in runs:
    print(name, i, s, json.dumps(out, default=str)[:400])
