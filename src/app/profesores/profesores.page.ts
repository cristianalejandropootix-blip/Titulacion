import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, personCircleOutline, 
  mailOutline, informationCircleOutline 
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database';
import { NotificacionService } from '../services/notificacion.service';

@Component({
  selector: 'app-profesores',
  templateUrl: './profesores.page.html',
  styleUrls: ['./profesores.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon]
})
export class ProfesoresPage implements OnInit {

  asesor: any = null;
  coordinador: any = null;

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private notificacion: NotificacionService
  ) {
    addIcons({ 
      arrowBackOutline, personCircleOutline, 
      mailOutline, informationCircleOutline 
    });
  }

  ngOnInit() {
    this.cargarCoordinador();
    try {
      const sesion = sessionStorage.getItem('usuario');
      if (!sesion) {
        void this.notificacion.advertencia('Tu sesión expiró. Inicia sesión de nuevo.');
        void this.router.navigate(['/seleccion-rol']).catch((error) => {
          console.error('No se pudo volver a la selección de rol.', error);
          void this.notificacion.error('No se pudo abrir la selección de rol.');
        });
        return;
      }
      const usuario = JSON.parse(sesion);
      this.dbService.getUsuario(usuario.id).subscribe({
        next: (data: any) => {
          if (data.asesor_asignado_id) {
            this.dbService.getUsuario(data.asesor_asignado_id.toString()).subscribe({
              next: (asesor: any) => {
                this.asesor = asesor;
                if (!asesor) void this.notificacion.info('No se encontró información del asesor.');
              },
              error: (error) => {
                console.error('Error al cargar los datos del asesor.', error);
                this.asesor = null;
                void this.notificacion.error('Error al cargar los datos del asesor.');
              }
            });
          } else {
            this.asesor = null;
            void this.notificacion.info('Aún no tienes un asesor asignado por el departamento.');
          }
        },
        error: (error) => {
          console.error('Error al cargar los datos del estudiante para el directorio.', error);
          void this.notificacion.error('Error al cargar los datos del estudiante.');
        }
      });
    } catch (error) {
      console.error('No se pudo leer la sesión del estudiante en el directorio.', error);
      void this.notificacion.error('No se pudieron cargar los datos de tu sesión.');
    }
  }

  cargarCoordinador() {
    this.dbService.getCoordinador().subscribe({
      next: (data: any) => {
        this.coordinador = data;
        if (!data) void this.notificacion.info('No se encontró información del coordinador.');
      },
      error: (error) => {
        console.error('Error al cargar los datos del coordinador.', error);
        this.coordinador = null;
        void this.notificacion.error('Error al cargar los datos del coordinador.');
      }
    });
  }

  async contactarCorreo(correo: string) {
    if (!correo) {
      void this.notificacion.advertencia('El correo de contacto no está disponible.');
      return;
    }
    const ventana = window.open(`mailto:${correo}`, '_blank');
    if (ventana) return;
    try {
      const copiar = await this.notificacion.confirmar(
        'No se pudo abrir el cliente de correo. ¿Deseas copiar la dirección?',
        { textoAceptar: 'Copiar correo' }
      );
      if (!copiar) return;
      await navigator.clipboard.writeText(correo);
      void this.notificacion.exito('Correo copiado al portapapeles.');
    } catch (error) {
      console.error('No se pudo abrir el cliente de correo ni copiar la dirección.', error);
      void this.notificacion.advertencia(`No se pudo copiar el correo: ${correo}`);
    }
  }

  regresar() {
    void this.router.navigate(['/inicio']).catch((error) => {
      console.error('No se pudo volver al menú del estudiante.', error);
      void this.notificacion.error('No se pudo abrir el menú del estudiante.');
    });
  }
}