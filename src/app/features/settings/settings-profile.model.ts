export interface ProfileRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  behavior_key: string;
  is_system: boolean;
  sort_order: number;
  permission_ids: number[];
  created_at: string;
  updated_at: string;
}
