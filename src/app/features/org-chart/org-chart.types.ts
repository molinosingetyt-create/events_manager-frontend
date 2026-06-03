export type OrgChartNodeKind = 'group' | 'user' | 'employee';

export interface OrgChartNode {
  kind: OrgChartNodeKind;
  user_id: number | null;
  employee_id: number | null;
  name: string;
  position_label: string;
  area_name: string;
  children: OrgChartNode[];
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
