import type { OrgChartLayoutEdgeRead, OrgChartLayoutNodeRead, OrgChartNode } from './org-chart.types';

export interface ManualGraphState {
  nodes: OrgChartLayoutNodeRead[];
  edges: OrgChartLayoutEdgeRead[];
}

/** Ya está en el diagrama (cima, líder o con al menos una relación). */
export function isNodeOnChart(state: ManualGraphState | null, nodeId: number): boolean {
  if (!state) {
    return false;
  }
  const node = state.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return false;
  }
  if (node.is_chart_root) {
    return true;
  }
  return (
    state.edges.some((e) => e.child_node_id === nodeId) ||
    state.edges.some((e) => e.parent_node_id === nodeId)
  );
}

/** Empleados que aún no aparecen en el organigrama. */
export function pendingPoolNodes(state: ManualGraphState | null): OrgChartLayoutNodeRead[] {
  if (!state) {
    return [];
  }
  return state.nodes
    .filter((n) => !isNodeOnChart(state, n.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

export function parentIdsFor(state: ManualGraphState | null, childNodeId: number): number[] {
  if (!state) {
    return [];
  }
  return state.edges
    .filter((e) => e.child_node_id === childNodeId)
    .map((e) => e.parent_node_id);
}

export function nodeLabelById(state: ManualGraphState | null, nodeId: number): string {
  const n = state?.nodes.find((x) => x.id === nodeId);
  return n ? `${n.name} — ${n.position_label || 'Sin cargo'}` : `#${nodeId}`;
}

export function manualDragPayload(node: OrgChartNode): OrgChartLayoutNodeRead | null {
  if (node.layout_node_id == null) {
    return null;
  }
  return {
    id: node.layout_node_id,
    name: node.name,
    position_label: node.position_label,
    area_name: node.area_name,
    sort_order: 0,
    employee_id: node.employee_id,
    user_id: node.user_id,
  };
}
