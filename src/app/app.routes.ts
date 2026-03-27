import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { rolesGuard } from './core/guards/roles.guard';
import { AreasComponent } from './features/areas/areas.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EmployeesComponent } from './features/employees/employees.component';
import { IncapacityComponent } from './features/incapacity/incapacity.component';
import { LoginComponent } from './features/login/login.component';
import { OvertimeComponent } from './features/overtime/overtime.component';
import { UsersComponent } from './features/users/users.component';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'HR'] },
      },
      {
        path: 'areas',
        component: AreasComponent,
        canActivate: [rolesGuard],
        data: { roles: ['ADMIN', 'HR'] },
      },
      { path: 'employees', component: EmployeesComponent },
      { path: 'overtime', component: OvertimeComponent },
      { path: 'incapacity', component: IncapacityComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
