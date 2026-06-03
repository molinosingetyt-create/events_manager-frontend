import type { Role } from './role';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  area_id: number;
  /** Líder al que está vinculado el usuario (cuando no actúa como líder directo). */
  leader_id?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}
