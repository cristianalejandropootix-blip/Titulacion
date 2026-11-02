import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonTitle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personOutline, lockClosedOutline } from 'ionicons/icons';
import { DatabaseService } from '../services/database';
import { NotificacionService } from '../services/notificacion.service';
import { InputCorreoComponent } from '../components/input-correo/input-correo.component';
import { InputPasswordComponent } from '../components/input-password/input-password.component';
import { DOMINIO_INSTITUCIONAL, esCorreoValido, normalizarCorreo, tieneDominioInstitucional } from '../constants/correo';
import { getApiField } from '../shared/auth-form-errors';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar,
    IonButton, IonIcon, IonTitle, InputCorreoComponent, InputPasswordComponent
  ]
})
export class DashboardPage {

  correo: string = '';
  contrasena: string = '';
  iniciandoSesion = false;
  errores: Record<string, string> = {};

  @ViewChild(InputCorreoComponent) private inputCorreo?: InputCorreoComponent;
  @ViewChild(InputPasswordComponent) private inputPassword?: InputPasswordComponent;

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private notificacion: NotificacionService
  ) {
    addIcons({ arrowBackOutline, personOutline, lockClosedOutline });
  }

  ionViewWillEnter(): void {
    this.correo = '';
    this.contrasena = '';
    this.errores = {};
    this.iniciandoSesion = false;
  }

  ionViewWillLeave(): void {
    this.inputPassword?.hide();
    this.correo = '';
    this.contrasena = '';
    this.errores = {};
  }

  ingresarAlMenu() {
    this.inputPassword?.hide();
    this.correo = normalizarCorreo(this.correo);
    this.errores = {};
    if (!this.correo || !this.contrasena) {
      if (!this.correo) this.errores['correo'] = 'Ingresa tu correo.';
      if (!this.contrasena) this.errores['contrasena'] = 'Ingresa tu contraseña.';
      void this.notificacion.advertencia('Por favor ingresa tu correo y contraseña.')
        .then(() => this.enfocarPrimerError());
      return;
    }
    if (!esCorreoValido(this.correo)) {
      this.errores['correo'] = 'Escribe un correo válido.';
      void this.notificacion.advertencia('Escribe un correo institucional válido.')
        .then(() => this.inputCorreo?.focus());
      return;
    }
    if (!tieneDominioInstitucional(this.correo)) {
      this.errores['correo'] = `Usa tu correo @${DOMINIO_INSTITUCIONAL}.`;
      void this.notificacion.advertencia(`Usa tu correo institucional (@${DOMINIO_INSTITUCIONAL}).`)
        .then(() => this.inputCorreo?.focus());
      return;
    }

    this.iniciandoSesion = true;
    this.dbService.login(this.correo, this.contrasena).subscribe({
      next: (response: any) => {
        this.iniciandoSesion = false;
        if (response.usuario.rol_id !== 1) {
          void this.notificacion.error('Esta cuenta no tiene acceso como estudiante. Elige el rol correcto.');
          return;
        }
        sessionStorage.setItem('usuario', JSON.stringify(response.usuario));
        void this.router.navigate(['/inicio']).catch((error) => {
          console.error('No se pudo abrir el menú del estudiante.', error);
          void this.notificacion.error('No se pudo abrir el menú del estudiante.');
        });
      },
      error: (err: any) => {
        this.iniciandoSesion = false;
        console.error('Error al iniciar sesión como estudiante.', err);
        const field = getApiField(err, {
          correo: ['correo', 'email'],
          contrasena: ['contrasena', 'contraseña', 'password']
        }) ?? 'contrasena';
        this.errores[field] = field === 'correo' ? 'Revisa el correo.' : 'Credenciales incorrectas.';
        void this.notificacion.error(this.notificacion.mensajeApi(err, 'Credenciales incorrectas.'))
          .then(() => field === 'correo'
            ? this.inputCorreo?.focus()
            : this.inputPassword?.focusAndSelect());
      }
    });
  }

  limpiarError(field: string): void {
    delete this.errores[field];
  }

  private async enfocarPrimerError(): Promise<void> {
    if (this.errores['correo']) {
      await this.inputCorreo?.focus();
    } else if (this.errores['contrasena']) {
      await this.inputPassword?.focus();
    }
  }

  volverARoles() {
    void this.router.navigate(['/seleccion-rol']).catch((error) => {
      console.error('No se pudo volver a la selección de rol.', error);
      void this.notificacion.error('No se pudo abrir la selección de rol.');
    });
  }

  crearUsuario() {
    void this.router.navigate(['/registro']).catch((error) => {
      console.error('No se pudo abrir el registro.', error);
      void this.notificacion.error('No se pudo abrir el registro.');
    });
  }

  recuperarContrasena() {
    void this.notificacion.info('Contacta al administrador para recuperar tu contraseña.');
  }
}