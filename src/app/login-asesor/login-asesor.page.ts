import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonTitle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { DatabaseService } from '../services/database';
import { NotificacionService } from '../services/notificacion.service';
import { InputCorreoComponent } from '../components/input-correo/input-correo.component';
import { InputPasswordComponent } from '../components/input-password/input-password.component';
import { esCorreoValido, normalizarCorreo } from '../constants/correo';
import { getApiField } from '../shared/auth-form-errors';

@Component({
  selector: 'app-login-asesor',
  templateUrl: './login-asesor.page.html',
  styleUrls: ['./login-asesor.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, 
    IonButton, IonIcon, IonTitle, InputCorreoComponent, InputPasswordComponent
  ]
})
export class LoginAsesorPage {

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
    addIcons({ arrowBackOutline, mailOutline, lockClosedOutline });
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

  ingresarAlPanel() {
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

    this.iniciandoSesion = true;
    this.dbService.login(this.correo, this.contrasena).subscribe({
      next: (response: any) => {
        this.iniciandoSesion = false;
        if (response.usuario.rol_id !== 2) {
          void this.notificacion.error('Esta cuenta no tiene acceso como asesor. Elige el rol correcto.');
          return;
        }
        sessionStorage.setItem('usuario', JSON.stringify(response.usuario));
        void this.router.navigate(['/inicio-asesor']).catch((error) => {
          console.error('No se pudo abrir el panel de asesoría.', error);
          void this.notificacion.error('No se pudo abrir el panel de asesoría.');
        });
      },
      error: (err: any) => {
        this.iniciandoSesion = false;
        console.error('Error al iniciar sesión como asesor.', err);
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

}