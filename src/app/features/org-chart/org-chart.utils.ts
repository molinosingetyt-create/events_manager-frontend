import type { OrgChartMember, OrgChartNode, OrgChartPayload } from './org-chart.types';

export interface OrgChartPersonRef {
  key: string;
  name: string;
  position: string;
  areaName: string;
  kind: 'user' | 'employee';
  userId: number | null;
  employeeId: number | null;
}

export function trackKeyForNode(node: OrgChartNode): string {
  return `${node.kind}-${node.user_id ?? 'u'}-${node.employee_id ?? 'e'}-${node.name}`;
}

export function trackKeyForMember(m: OrgChartMember): string {
  return `employee-${m.id}-${m.name}`;
}

export function collectOrgChartPeople(payload: OrgChartPayload): OrgChartPersonRef[] {
  const out: OrgChartPersonRef[] = [];
  const walk = (nodes: OrgChartNode[]): void => {
    for (const n of nodes) {
      if (n.kind === 'user' || n.kind === 'employee') {
        out.push({
          key: trackKeyForNode(n),
          name: n.name,
          position: n.position_label,
          areaName: n.area_name,
          kind: n.kind,
          userId: n.user_id,
          employeeId: n.employee_id,
        });
      }
      if (n.children?.length) {
        walk(n.children);
      }
    }
  };
  walk(payload.roots);
  for (const m of payload.unassigned) {
    out.push({
      key: trackKeyForMember(m),
      name: m.name,
      position: m.position,
      areaName: m.area_name,
      kind: 'employee',
      userId: null,
      employeeId: m.id,
    });
  }
  return out;
}

export function personMatchesQuery(p: OrgChartPersonRef, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    p.name.toLowerCase().includes(q) ||
    p.position.toLowerCase().includes(q) ||
    p.areaName.toLowerCase().includes(q)
  );
}
