import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonTitle, IonInput, IonItem, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, personAddOutline, documentTextOutline, 
  idCardOutline, schoolOutline,
  lockClosedOutline, arrowBackOutline 
} from 'ionicons/icons';
import { DatabaseService } from '../services/database';
import { NotificacionService } from '../services/notificacion.service';
import { InputCorreoComponent } from '../components/input-correo/input-correo.component';
import { InputPasswordComponent } from '../components/input-password/input-password.component';
import { DOMINIO_INSTITUCIONAL, esCorreoRegistroValido, normalizarCorreo, tieneDominioInstitucional } from '../constants/correo';
import { getApiField, getRegistrationErrorField } from '../shared/auth-form-errors';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, 
    IonButton, IonIcon, IonTitle, IonInput, IonItem, IonSelect, IonSelectOption, InputCorreoComponent, InputPasswordComponent
  ]
})
export class RegistroPage {

  nombre: string = '';
  primerApellido: string = '';
  segundoApellido: string = '';
  proyecto: string = '';
  matricula: string = '';
  carrera: string = '';
  readonly carreras = [
    'Ingeniería en Agronomía',
    'Licenciatura en Biología',
    'Ingeniería en Administración',
    'Ingeniería en Desarrollo Comunitario',
    'Ingeniería en Tecnologías de la Información y Comunicaciones',
    'Ingeniería en Gestión Empresarial'
  ];
  correo: string = '';
  password: string = '';
  registrando = false;
  errores: Record<string, string> = {};
  private registroActivo = false;
  private validacionCorreoPendiente: ReturnType<typeof setTimeout> | null = null;
  private versionValidacionCorreo = 0;

  @ViewChild('nombreInput') private nombreInput?: IonInput;
  @ViewChild('apellidoInput') private apellidoInput?: IonInput;
  @ViewChild('matriculaInput') private matriculaInput?: IonInput;
  @ViewChild('carreraInput', { read: ElementRef }) private carreraInput?: ElementRef<HTMLElement>;
  @ViewChild(InputCorreoComponent) private inputCorreo?: InputCorreoComponent;
  @ViewChild(InputPasswordComponent) private inputPassword?: InputPasswordComponent;

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private notificacion: NotificacionService
  ) {
    addIcons({ 
      personOutline, personAddOutline, documentTextOutline, 
      idCardOutline, schoolOutline,
      lockClosedOutline, arrowBackOutline 
    });
  }

  ionViewWillEnter(): void {
    this.registroActivo = true;
    this.cancelarValidacionCorreo();
    if (this.inputCorreo) {
      this.inputCorreo.autocompletarDominio = true;
      this.inputCorreo.validarAlSalir = (correo) => {
        this.correo = normalizarCorreo(correo);
        this.cancelarValidacionCorreo();
        if (!this.correo) {
          delete this.errores['correo'];
          return;
        }
        const version = this.versionValidacionCorreo;
        this.validacionCorreoPendiente = setTimeout(() => {
          this.validacionCorreoPendiente = null;
          if (!this.registroActivo || version !== this.versionValidacionCorreo) return;
          this.validarCorreo(true, version);
        }, 100);
      };
    }
    this.nombre = '';
    this.primerApellido = '';
    this.segundoApellido = '';
    this.proyecto = '';
    this.matricula = '';
    this.carrera = '';
    this.correo = '';
    this.password = '';
    this.errores = {};
    this.registrando = false;
  }

  ionViewWillLeave(): void {
    this.registroActivo = false;
    this.cancelarValidacionCorreo();
    if (this.inputCorreo) {
      this.inputCorreo.validarAlSalir = null;
      this.inputCorreo.autocompletarDominio = false;
    }
    this.inputPassword?.hide();
    this.nombre = '';
    this.primerApellido = '';
    this.segundoApellido = '';
    this.proyecto = '';
    this.matricula = '';
    this.carrera = '';
    this.correo = '';
    this.password = '';
    this.errores = {};
  }

  registrar() {
    this.inputPassword?.hide();
    this.cancelarValidacionCorreo();
    const version = this.versionValidacionCorreo;
    this.correo = normalizarCorreo(this.correo);
    this.errores = {};
    const correoValido = this.validarCorreo(false);
    const obligatorios: Array<[string, string, boolean]> = [
      ['nombre', this.nombre, true],
      ['primerApellido', this.primerApellido, true],
      ['matricula', this.matricula, true],
      ['carrera', this.carrera, true],
      ['correo', this.correo, true],
      ['password', this.password, true]
    ];
    for (const [field, value, required] of obligatorios) {
      if (required && !value.trim()) this.errores[field] = 'Este campo es obligatorio.';
    }
    if (Object.keys(this.errores).length > 0) {
      if (!correoValido) {
        void this.notificacion.advertencia(this.errores['correo'])
          .then(() => this.enfocarSiRegistroActivo('correo', version));
      } else {
        void this.notificacion.advertencia('Por favor completa todos los campos obligatorios.')
          .then(() => this.enfocarPrimerError(version));
      }
      return;
    }
    if (this.password.length < 8) {
      this.errores['password'] = 'Usa al menos 8 caracteres.';
      void this.notificacion.advertencia('La contraseña debe tener al menos 8 caracteres.')
        .then(() => this.enfocarSiRegistroActivo('password', version));
      return;
    }

    const datosRegistro = {
      nombre: this.nombre,
      primerApellido: this.primerApellido,
      segundoApellido: this.segundoApellido,
      proyecto: this.proyecto,
      matricula: this.matricula,
      carrera: this.carrera,
      correo: this.correo,
      password: this.password
    };

    this.registrando = true;
    this.dbService.registrarUsuario(datosRegistro).subscribe({
      next: (response: any) => {
        this.registrando = false;
        if (!this.registroActivo) return;
        void this.notificacion.exito('¡Usuario registrado con éxito!');
        void this.router.navigate(['/dashboard']).catch((error) => {
          console.error('No se pudo abrir el acceso después del registro.', error);
          void this.notificacion.error('No se pudo abrir el acceso.');
        });
      },
      error: (err: any) => {
        this.registrando = false;
        console.error('Error al registrar usuario.', err);
        if (!this.registroActivo) return;
        const mensaje = this.notificacion.mensajeApi(err, 'No se pudo completar el registro.');
        const errorBody = err?.error;
        const errorDetails = typeof errorBody === 'string'
          ? errorBody
          : typeof errorBody === 'object' && errorBody !== null
            ? ['campo', 'mensaje', 'message', 'error']
              .map((key) => errorBody[key])
              .filter((value): value is string => typeof value === 'string')
              .join(' ')
            : '';
        const normalizedDetails = errorDetails.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const field = getApiField(err, {
          correo: ['correo', 'email'],
          matricula: ['matricula', 'matrícula', 'numero_control', 'número de control', 'control']
        });
        const messageField = getRegistrationErrorField(errorDetails);
        const isConflict = err?.status === 409;
        const isMatricula = /matricula|numero_control|numero de control|\bcontrol\b/.test(normalizedDetails) ||
          field === 'matricula' || messageField === 'matricula';
        const isCorreo = /\bcorreo\b|\bemail\b/.test(normalizedDetails) ||
          field === 'correo' || messageField === 'correo';
        const conflictField = isMatricula ? 'matricula' : isCorreo ? 'correo' : null;
        const hasConflictEvidence = isConflict || errorDetails.length > 0 || field !== null || messageField !== null;

        if (hasConflictEvidence && conflictField === 'matricula') {
          const conflictMessage = 'Este número de control ya ha sido registrado.';
          this.errores['matricula'] = conflictMessage;
          void this.notificacion.error(conflictMessage).then(() => this.enfocarSiRegistroActivo('matricula', version));
        } else if (hasConflictEvidence && conflictField === 'correo') {
          const conflictMessage = 'Este correo institucional ya ha sido registrado.';
          this.errores['correo'] = conflictMessage;
          void this.notificacion.error(conflictMessage).then(() => this.enfocarSiRegistroActivo('correo', version));
        } else {
          void this.notificacion.error(mensaje);
        }
      }
    });
  }

  private validarCorreo(mostrarNotificacion = true, version = this.versionValidacionCorreo): boolean {
    this.correo = normalizarCorreo(this.correo);
    const mensaje = this.mensajeErrorCorreo();
    if (mensaje) {
      this.errores['correo'] = mensaje;
      if (mostrarNotificacion && this.registroActivo) {
        void this.notificacion.advertencia(mensaje)
          .then(() => this.enfocarSiRegistroActivo('correo', version));
      }
      return false;
    }
    delete this.errores['correo'];
    return true;
  }

  private mensajeErrorCorreo(): string | null {
    if (!this.correo) return 'Este campo es obligatorio.';
    if ((this.correo.match(/@/g)?.length ?? 0) > 1) return 'El correo solo puede tener un @.';
    if (/\s/.test(this.correo)) return 'Escribe un correo válido.';
    const localPart = this.correo.slice(0, this.correo.indexOf('@'));
    if (!/^[A-Za-z0-9._-]+$/.test(localPart)) return 'Escribe un correo válido.';
    if (!tieneDominioInstitucional(this.correo)) {
      return `Usa tu correo institucional (@${DOMINIO_INSTITUCIONAL}).`;
    }
    if (!esCorreoRegistroValido(this.correo)) return 'Escribe un correo válido.';
    return null;
  }

  limpiarError(field: string): void {
    delete this.errores[field];
  }

  private async enfocarPrimerError(version: number): Promise<void> {
    const firstInvalid = ['nombre', 'primerApellido', 'matricula', 'carrera', 'correo', 'password']
      .find((field) => this.errores[field]);
    if (firstInvalid) await this.enfocarSiRegistroActivo(firstInvalid, version);
  }

  private async enfocarSiRegistroActivo(field: string, version: number): Promise<void> {
    if (!this.registroActivo || version !== this.versionValidacionCorreo) return;
    await this.enfocarCampo(field);
  }

  private cancelarValidacionCorreo(): void {
    if (this.validacionCorreoPendiente !== null) {
      clearTimeout(this.validacionCorreoPendiente);
      this.validacionCorreoPendiente = null;
    }
    this.versionValidacionCorreo += 1;
  }

  private limpiarEstadoAlSalir(): void {
    this.registroActivo = false;
    this.cancelarValidacionCorreo();
    this.errores = {};
  }

  private async enfocarCampo(field: string): Promise<void> {
    if (field === 'nombre') await this.nombreInput?.setFocus();
    else if (field === 'primerApellido') await this.apellidoInput?.setFocus();
    else if (field === 'matricula') await this.matriculaInput?.setFocus();
    else if (field === 'carrera') this.carreraInput?.nativeElement.shadowRoot?.querySelector('button')?.focus();
    else if (field === 'correo') await this.inputCorreo?.focus();
    else if (field === 'password') await this.inputPassword?.focusAndSelect();
  }

  irALogin() {
    this.limpiarEstadoAlSalir();
    void this.router.navigate(['/dashboard']).catch((error) => {
      this.registroActivo = true;
      console.error('No se pudo abrir el acceso.', error);
      void this.notificacion.error('No se pudo abrir el acceso.');
    });
  }

  irARoles() {
    this.limpiarEstadoAlSalir();
    void this.router.navigate(['/seleccion-rol']).catch((error) => {
      this.registroActivo = true;
      console.error('No se pudo volver a la selección de rol.', error);
      void this.notificacion.error('No se pudo abrir la selección de rol.');
    });
  }
}