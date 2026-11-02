import { Component, inject, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonTitle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, arrowBackOutline } from 'ionicons/icons';
import { DatabaseService } from '../services/database';
import { NotificacionService } from '../services/notificacion.service';
import { InputCorreoComponent } from '../components/input-correo/input-correo.component';
import { InputPasswordComponent } from '../components/input-password/input-password.component';
import { esCorreoValido, normalizarCorreo } from '../constants/correo';
import { getApiField } from '../shared/auth-form-errors';

@Component({
  selector: 'app-login-admin',
  templateUrl: './login-admin.page.html',
  styleUrls: ['./login-admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonTitle,
    InputCorreoComponent, InputPasswordComponent
  ]
})
export class LoginAdminPage {

  correo: string = '';
  contrasena: string = '';
  iniciandoSesion = false;
  errores: Record<string, string> = {};
  private readonly route = inject(ActivatedRoute);
  private loginRole = 'coordinador';
  private panelPath = '/inicio-admin';

  @ViewChild(InputCorreoComponent) private inputCorreo?: InputCorreoComponent;
  @ViewChild(InputPasswordComponent) private inputPassword?: InputPasswordComponent;

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private notificacion: NotificacionService
  ) {
    addIcons({ personOutline, lockClosedOutline, arrowBackOutline });
  }

  ionViewWillEnter(): void {
    this.loginRole = this.route.snapshot.data['loginRole'] ?? 'coordinador';
    this.panelPath = this.route.snapshot.data['panelPath'] ?? '/inicio-admin';
    this.correo = '';
    this.contrasena = '';
    this.errores = {};
    this.iniciandoSesion = false;
  }

  get tituloAcceso(): string {
    return this.route.snapshot.data['loginTitle'] ?? 'Portal de Coordinador';
  }

  get tituloFormulario(): string {
    return this.loginRole === 'coordinador' ? 'Portal Administrativo' : this.tituloAcceso;
  }

  get descripcionAcceso(): string {
    if (this.loginRole === 'academia') {
      return 'Ingresa tus credenciales de Academia para revisar la etapa 2.';
    }
    if (this.loginRole === 'servicios_escolares') {
      return 'Ingresa tus credenciales de Servicios Escolares para revisar la etapa 4.';
    }
    return 'Ingresa tus credenciales de coordinador para acceder al panel';
  }

  ionViewWillLeave(): void {
    this.inputPassword?.hide();
    this.correo = '';
    this.contrasena = '';
    this.errores = {};
  }

  validarAccesoAdmin() {
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
        const usuario = response?.usuario ?? response?.user ?? response;
        const rolRespuesta = usuario?.rol ?? usuario?.role ?? usuario?.tipo ??
          response?.rol ?? response?.role ?? response?.tipo;
        if (this.loginRole === 'coordinador' && usuario?.rol_id !== 3) {
          void this.notificacion.error('Esta cuenta no tiene acceso como coordinador. Elige el rol correcto.');
          return;
        }
        if (this.loginRole !== 'coordinador' &&
          (typeof rolRespuesta !== 'string' || rolRespuesta.toLowerCase() !== this.loginRole)) {
          void this.notificacion.error('Este usuario no tiene acceso a esta sección.');
          return;
        }
        const usuarioSesion = this.loginRole === 'coordinador'
          ? usuario
          : { ...usuario, rol: rolRespuesta };
        sessionStorage.setItem('usuario', JSON.stringify(usuarioSesion));
        void this.router.navigate([this.panelPath]).catch((error) => {
          console.error('No se pudo abrir el panel seleccionado.', error);
          void this.notificacion.error('No se pudo abrir el panel seleccionado.');
        });
      },
      error: (err: any) => {
        this.iniciandoSesion = false;
        console.error('Error al iniciar sesión como coordinador.', err);
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

  regresarARoles() {
    void this.router.navigate(['/seleccion-rol']).catch((error) => {
      console.error('No se pudo volver a la selección de rol.', error);
      void this.notificacion.error('No se pudo abrir la selección de rol.');
    });
  }

}