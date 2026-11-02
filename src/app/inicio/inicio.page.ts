import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonButtons, IonCard } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { NotificacionService } from '../services/notificacion.service';
import { DatabaseService } from '../services/database';
import { 
  arrowForwardOutline, peopleCircleOutline, personOutline, 
  checkmarkCircleOutline, logOutOutline, documentAttachOutline, settingsOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonToolbar, IonButton, 
    IonIcon, IonCard
  ]
})
export class InicioPage {
  private readonly dbService = inject(DatabaseService);
  mostrarAvisoCancelacion = false;
  private usuarioId = '';
  private readonly mensajeCancelacion =
    'Coordinación canceló tu solicitud de titulación. Tus etapas fueron reiniciadas y debes volver a subir tus documentos desde la etapa 1.';

  constructor(
    private router: Router,
    private notificacion: NotificacionService
  ) {
    addIcons({ 
      arrowForwardOutline, peopleCircleOutline, personOutline, 
      checkmarkCircleOutline, logOutOutline, documentAttachOutline, settingsOutline 
    });
  }

  ionViewWillEnter(): void {
    this.cargarAvisoCancelacion();
  }

  private cargarAvisoCancelacion(): void {
    try {
      const sesion = sessionStorage.getItem('usuario');
      if (!sesion) return;
      const usuario = JSON.parse(sesion);
      if (!usuario?.id) return;
      this.usuarioId = String(usuario.id);
    } catch (error) {
      console.error('No se pudo leer la sesión para consultar cancelaciones.', error);
      void this.notificacion.error('No se pudo consultar el estado de tu solicitud.');
      return;
    }

    this.dbService.getUsuario(this.usuarioId).subscribe({
      next: (datos: any) => this.procesarAvisoCancelacion(datos),
      error: (error) => {
        console.error('No se pudo cargar el aviso de cancelación del egresado.', error);
        void this.notificacion.error('No se pudo consultar el estado de tu solicitud.');
      }
    });
    this.dbService.getFases(this.usuarioId).subscribe({
      next: (fases: any) => this.procesarAvisoCancelacion(fases),
      error: (error) => {
        console.error('No se pudieron consultar las etapas para el aviso de cancelación.', error);
        void this.notificacion.error('No se pudo consultar el estado de tus etapas.');
      }
    });
  }

  private procesarAvisoCancelacion(datos: any): void {
    if (!this.contieneSolicitudCancelada(datos)) return;
    const claveEntendido = `solicitud-cancelada-entendida:${this.usuarioId}`;
    if (sessionStorage.getItem(claveEntendido) === 'true') return;

    this.mostrarAvisoCancelacion = true;
    const claveNotificacion = `solicitud-cancelada-notificada:${this.usuarioId}`;
    if (sessionStorage.getItem(claveNotificacion) !== 'true') {
      sessionStorage.setItem(claveNotificacion, 'true');
      void this.notificacion.info(this.mensajeCancelacion, 'Solicitud cancelada');
    }
  }

  // El servidor puede incluir solicitudCancelada, fechaCancelacion y mensajeCancelacion
  // en el usuario o en cualquiera de sus etapas; si faltan, se omite este aviso.
  private contieneSolicitudCancelada(datos: any): boolean {
    if (!datos || typeof datos !== 'object') return false;
    const raices = Array.isArray(datos)
      ? datos
      : [datos, datos.usuario, datos.data, datos.data?.usuario];
    const registros: any[] = [];
    for (const raiz of raices) {
      if (!raiz || typeof raiz !== 'object') continue;
      registros.push(raiz);
      if (Array.isArray(raiz.fases)) registros.push(...raiz.fases);
    }
    return registros.some((registro) =>
      registro &&
      typeof registro === 'object' &&
      (registro.solicitudCancelada === true ||
        registro.cancelacion?.solicitudCancelada === true)
    );
  }

  entenderAvisoCancelacion(): void {
    if (this.usuarioId) {
      sessionStorage.setItem(`solicitud-cancelada-entendida:${this.usuarioId}`, 'true');
    }
    this.mostrarAvisoCancelacion = false;
  }

  navegargeneral(seccion: string) {
    if (seccion === 'datos') {
      this.navegar(['/datos-generales']);
    }
    else if (seccion === 'fases') {
      this.navegar(['/fases']);
    }
    else if (seccion === 'profesores') {
      this.navegar(['/profesores']);
    }
    else if (seccion === 'asesor-proyecto') {
      this.navegar(['/asesor-alumno']); 
    }
    else if (seccion === 'ajustes') {
      this.navegar(['/configuracion']);
    }
  }

  private navegar(ruta: string[]) {
    void this.router.navigate(ruta).catch((error) => {
      console.error('No se pudo abrir la sección solicitada.', error);
      void this.notificacion.error('No se pudo abrir la sección solicitada.');
    });
  }

  async cerrarSesion() {
    try {
      if (await this.notificacion.confirmar('¿Deseas cerrar sesión?')) {
        sessionStorage.clear();
        await this.router.navigate(['/seleccion-rol']);
      }
    } catch (error) {
      console.error('No se pudo cerrar la sesión del estudiante.', error);
      void this.notificacion.error('No se pudo cerrar la sesión.');
    }
  }
}