"""CP-SAT constrained set cover. All inputs are illustrative, not field calibrated."""
from ortools.sat.python import cp_model
import networkx as nx

def optimize(constraints, actions, resources):
    """Select an authorized, safe set of actions covering every unresolved constraint."""
    model = cp_model.CpModel()
    picks = [model.new_bool_var(f'action_{i}') for i in range(len(actions))]
    for i, action in enumerate(actions):
        if not action.get('authorized') or not action.get('safe'):
            model.add(picks[i] == 0)
    for need in constraints:
        covering = [picks[i] for i, a in enumerate(actions) if need in a.get('covers', [])]
        if not covering:
            return {'status': 'No verified feasible intervention', 'actions': []}
        model.add(sum(covering) >= 1)
    for role, capacity in resources.items():
        model.add(sum(picks[i] * a.get('personnel', 1) for i, a in enumerate(actions) if a.get('role') == role) <= capacity)
    for i, a in enumerate(actions):
        if a.get('role') not in resources:
            model.add(picks[i] == 0)
        for conflict in a.get('conflicts', []):
            for j, other in enumerate(actions):
                if other['id'] == conflict:
                    model.add(picks[i] + picks[j] <= 1)
    # Lexicographic task minimization, then effort/disruption/uncertainty.
    costs = [int(a.get('effort', 0)) + 3*int(a.get('disruption', 0)) + 2*int(a.get('uncertainty', 0)) for a in actions]
    task_weight = sum(costs) + 1
    model.minimize(sum(picks[i] * (task_weight + costs[i]) for i in range(len(actions))))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 2
    solver.parameters.num_search_workers = 1
    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {'status': 'No verified feasible intervention', 'actions': [], 'solver_status': solver.status_name(status)}
    selected = [a for i, a in enumerate(actions) if solver.value(picks[i])]
    return {'status': solver.status_name(status), 'actions': selected, 'objective': solver.objective_value,
            'elapsed_seconds': solver.wall_time, 'requires_supervisor_approval': True,
            'assumptions': 'Configured action eligibility and resource availability must be independently verified.'}

def accessible_path(nodes, edges, source, target):
    """Unknown, restricted and expired edges are excluded rather than treated as clear."""
    from datetime import datetime, timezone
    graph = nx.Graph()
    graph.add_nodes_from(nodes)
    for edge in edges:
        expires = edge.get('expires')
        fresh = expires and datetime.fromisoformat(expires.replace('Z', '+00:00')) > datetime.now(timezone.utc)
        if edge.get('state') == 'VERIFIED_ACCESSIBLE' and fresh and edge.get('authorized', False):
            graph.add_edge(edge['from'], edge['to'], weight=edge['length'], id=edge['id'])
    try:
        return {'eligible': True, 'nodes': nx.shortest_path(graph, source, target, weight='weight')}
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return {'eligible': False, 'reason': 'No continuously verified authorized path'}
