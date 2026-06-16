export type OrgChartNodeKind = 'group' | 'user' | 'employee' | 'manual' | 'leader_shelf';

export interface OrgChartNode {
  kind: OrgChartNodeKind;
  user_id: number | null;
  employee_id: number | null;
  layout_node_id?: number | null;
  display_key?: string | null;
  name: string;
  position_label: string;
  area_name: string;
  children: OrgChartNode[];
  /** Jefes en fila cuando un colaborador reporta a varios (solo `leader_shelf`). */
  leaders?: OrgChartNode[];
}

export type OrgChartViewMode = 'manual' | 'employees';

export interface OrgChartLayoutNodeRead {
  id: number;
  name: string;
  position_label: string;
  area_name: string;
  sort_order: number;
  is_chart_root?: boolean;
  employee_id: number | null;
  user_id: number | null;
}

export interface OrgChartLayoutEdgeRead {
  child_node_id: number;
  parent_node_id: number;
}

export interface ManualOrgChartPayload extends OrgChartPayload {
  nodes: OrgChartLayoutNodeRead[];
  edges: OrgChartLayoutEdgeRead[];
}

export interface OrgChartManualNodeDialogData {
  mode: 'create' | 'edit';
  layoutNodeId?: number;
  initial?: { name: string; position_label: string; area_name: string };
}

export interface OrgChartManualLeadersDialogData {
  layoutNodeId: number;
  name: string;
  parentIds: number[];
  allNodes: { id: number; label: string }[];
}

export interface OrgChartMember {
  id: number;
  name: string;
  position: string;
  area_name: string;
}

export interface OrgChartPayload {
  roots: OrgChartNode[];
  unassigned: OrgChartMember[];
}

export interface OrgChartReassignTarget {
  name: string;
  kind: 'user' | 'employee';
  userId: number | null;
  employeeId: number | null;
}
