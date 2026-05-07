import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionsGuard } from './core/guards/permissions.guard';
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
        canActivate: [permissionsGuard],
        data: { permissionNamespaces: ['users'] },
      },
      {
        path: 'areas',
        component: AreasComponent,
        canActivate: [permissionsGuard],
        data: { permissionNamespaces: ['areas'] },
      },
      {
        path: 'employees',
        component: EmployeesComponent,
        canActivate: [permissionsGuard],
        data: { permissionNamespaces: ['employees'] },
      },
      {
        path: 'overtime',
        component: OvertimeComponent,
        canActivate: [permissionsGuard],
        data: { permissionNamespaces: ['overtime'] },
      },
      {
        path: 'incapacity',
        component: IncapacityComponent,
        canActivate: [permissionsGuard],
        data: { permissionNamespaces: ['incapacity'] },
      },
      { path: 'incapacity-catalog', redirectTo: 'configuracion/perfil', pathMatch: 'full' },
      {
        path: 'configuracion',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'perfil' },
          {
            path: 'perfil',
            loadComponent: () =>
              import('./features/settings/settings-profile.component').then((m) => m.SettingsProfileComponent),
          },
          {
            path: 'areas',
            canActivate: [permissionsGuard],
            data: { permissionNamespaces: ['areas'] },
            loadComponent: () =>
              import('./features/settings/settings-areas.component').then((m) => m.SettingsAreasComponent),
          },
          {
            path: 'temporal',
            canActivate: [permissionsGuard],
            data: { permissionNamespaces: ['catalog'] },
            loadComponent: () =>
              import('./features/settings/settings-temporal.component').then((m) => m.SettingsTemporalComponent),
          },
          {
            path: 'eps-arl',
            canActivate: [permissionsGuard],
            data: { permissionNamespaces: ['catalog'] },
            loadComponent: () =>
              import('./features/settings/settings-eps-arl.component').then((m) => m.SettingsEpsArlComponent),
          },
          {
            path: 'diagnosticos',
            canActivate: [permissionsGuard],
            data: { permissionNamespaces: ['catalog'] },
            loadComponent: () =>
              import('./features/settings/settings-diagnoses.component').then((m) => m.SettingsDiagnosesComponent),
          },
          {
            path: 'seguridad',
            canActivate: [permissionsGuard],
            data: { permissionNamespaces: ['security'] },
            loadComponent: () =>
              import('./features/settings/settings-seguridad-layout.component').then(
                (m) => m.SettingsSeguridadLayoutComponent,
              ),
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/settings/settings-rbac.component').then((m) => m.SettingsRbacComponent),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/settings/settings-profile-wizard.component').then(
                    (m) => m.SettingsProfileWizardComponent,
                  ),
                data: { profileWizardMode: 'create' },
              },
              {
                path: ':profileId/editar',
                loadComponent: () =>
                  import('./features/settings/settings-profile-wizard.component').then(
                    (m) => m.SettingsProfileWizardComponent,
                  ),
                data: { profileWizardMode: 'edit' },
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
