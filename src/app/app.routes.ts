import { inject } from '@angular/core';
import { CanActivateFn, Routes } from '@angular/router';
import { Router } from '@angular/router';

const requireRoleSession: CanActivateFn = (route) => {
  const router = inject(Router);
  const expectedRole = route.data['requiredRole'];
  try {
    const rawSession = sessionStorage.getItem('usuario');
    if (!rawSession) return router.createUrlTree(['/seleccion-rol']);
    const user = JSON.parse(rawSession);
    const role = user?.rol ?? user?.role ?? user?.tipo;
    const roleMatches = typeof role === 'string' && role.toLowerCase() === expectedRole;
    const legacyCoordinatorMatches = expectedRole === 'coordinador' && Number(user?.rol_id) === 3;
    return roleMatches || legacyCoordinatorMatches
      ? true
      : router.createUrlTree(['/seleccion-rol']);
  } catch {
    return router.createUrlTree(['/seleccion-rol']);
  }
};

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'seleccion-rol',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage)
  },
  {
    path: 'registro',
    loadComponent: () => import('./registro/registro.page').then( m => m.RegistroPage)
  },
  {
    path: 'seleccion-rol',
    loadComponent: () => import('./seleccion-rol/seleccion-rol.page').then( m => m.SeleccionRolPage)
  },
  {
    path: 'inicio',
    loadComponent: () => import('./inicio/inicio.page').then( m => m.InicioPage)
  },
  {
    path: 'datos-generales',
    loadComponent: () => import('./datos-generales/datos-generales.page').then( m => m.DatosGeneralesPage)
  },
  {
    path: 'fases',
    loadComponent: () => import('./fases/fases.page').then( m => m.FasesPage)
  },
  {
    path: 'profesores',
    loadComponent: () => import('./profesores/profesores.page').then( m => m.ProfesoresPage)
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./configuracion/configuracion.page').then( m => m.ConfiguracionPage)
  },
  {
    path: 'login-admin',
    data: { loginRole: 'coordinador', panelPath: '/inicio-admin' },
    loadComponent: () => import('./login-admin/login-admin.page').then( m => m.LoginAdminPage)
  },
  {
    path: 'login-academia',
    data: {
      loginRole: 'academia',
      panelPath: '/inicio-academia',
      loginTitle: 'Acceso Academia'
    },
    loadComponent: () => import('./login-admin/login-admin.page').then( m => m.LoginAdminPage)
  },
  {
    path: 'login-servicios-escolares',
    data: {
      loginRole: 'servicios_escolares',
      panelPath: '/inicio-servicios-escolares',
      loginTitle: 'Acceso Servicios Escolares'
    },
    loadComponent: () => import('./login-admin/login-admin.page').then( m => m.LoginAdminPage)
  },
  {
    path: 'inicio-admin',
    canActivate: [requireRoleSession],
    data: { panelRole: 'coordinador', requiredRole: 'coordinador' },
    loadComponent: () => import('./inicio-admin/inicio-admin.page').then( m => m.InicioAdminPage)
  },
  {
    path: 'inicio-academia',
    canActivate: [requireRoleSession],
    data: { panelRole: 'academia', requiredRole: 'academia' },
    loadComponent: () => import('./inicio-admin/inicio-admin.page').then( m => m.InicioAdminPage)
  },
  {
    path: 'inicio-servicios-escolares',
    canActivate: [requireRoleSession],
    data: { panelRole: 'servicios_escolares', requiredRole: 'servicios_escolares' },
    loadComponent: () => import('./inicio-admin/inicio-admin.page').then( m => m.InicioAdminPage)
  },
  {
    path: 'asesor-alumno',
    loadComponent: () => import('./asesor-alumno/asesor-alumno.page').then( m => m.AsesorAlumnoPage)
  },
  {
    path: 'inicio-asesor',
    loadComponent: () => import('./inicio-asesor/inicio-asesor.page').then( m => m.InicioAsesorPage)
  },
  {
    path: 'login-asesor',
    loadComponent: () => import('./login-asesor/login-asesor.page').then( m => m.LoginAsesorPage)
  },
];