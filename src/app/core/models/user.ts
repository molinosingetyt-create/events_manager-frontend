import type { Role } from './role';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  area_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}
