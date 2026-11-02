import { Component, OnInit } from '@angular/core';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personOutline, medalOutline, bookOutline, mailOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database';
import { NotificacionService } from '../services/notificacion.service';

@Component({
  selector: 'app-datos-generales',
  templateUrl: './datos-generales.page.html',
  styleUrls: ['./datos-generales.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon]
})
export class DatosGeneralesPage implements OnInit {

  usuario: any = null;

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private notificacion: NotificacionService
  ) {
    addIcons({ arrowBackOutline, personOutline, medalOutline, bookOutline, mailOutline });
  }

  ngOnInit() {
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
      const usuarioSesion = JSON.parse(sesion);
      this.dbService.getUsuario(usuarioSesion.id).subscribe({
        next: (data: any) => this.usuario = data,
        error: (error) => {
          console.error('No se pudo cargar el perfil actualizado del estudiante.', error);
          this.usuario = usuarioSesion;
          void this.notificacion.info('No se pudieron actualizar los datos. Se muestran los datos guardados de la sesión.');
        }
      });
    } catch (error) {
      console.error('No se pudo leer la sesión del estudiante.', error);
      void this.notificacion.error('No se pudieron cargar los datos del estudiante.');
    }
  }

  regresar() {
    void this.router.navigate(['/inicio']).catch((error) => {
      console.error('No se pudo volver al menú del estudiante.', error);
      void this.notificacion.error('No se pudo abrir el menú del estudiante.');
    });
  }
}