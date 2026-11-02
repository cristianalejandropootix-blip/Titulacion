import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonModal, 
  IonTitle, IonButtons, IonTextarea
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  logOutOutline, personCircleOutline, chevronForwardOutline, 
  documentAttachOutline, cloudUploadOutline, eyeOutline
} from 'ionicons/icons';
import { DatabaseService } from '../services/database';
import { NotificacionService } from '../services/notificacion.service';

@Component({
  selector: 'app-inicio-asesor',
  templateUrl: './inicio-asesor.page.html',
  styleUrls: ['./inicio-asesor.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, 
    IonButton, IonIcon, IonModal, IonTitle, IonButtons, IonTextarea
  ]
})
export class InicioAsesorPage implements OnInit {

  isModalOpen: boolean = false;
  alumnoSeleccionado: any = null;
  comentarioAsesor: string = '';
  misAlumnos: any[] = [];
  documentosAlumno: any[] = [];
  asesor: any = null;
  errorCargaAlumnos = false;
  errorCargaDocumentos = false;
  guardandoRetroalimentacion = false;

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private notificacion: NotificacionService
  ) {
    addIcons({ 
      logOutOutline, personCircleOutline, chevronForwardOutline, 
      documentAttachOutline, cloudUploadOutline, eyeOutline
    });
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
      this.asesor = JSON.parse(sesion);
      this.cargarAlumnos();
    } catch (error) {
      console.error('No se pudo leer la sesión del asesor.', error);
      void this.notificacion.error('No se pudieron cargar los datos de tu sesión.');
    }
  }

  cargarAlumnos() {
    this.dbService.getAlumnosAsesor(this.asesor.id).subscribe({
      next: (data: any[]) => {
        this.errorCargaAlumnos = false;
        this.misAlumnos = data;
      },
      error: (error) => {
        this.errorCargaAlumnos = true;
        console.error('Error al cargar los alumnos asignados al asesor.', error);
        void this.notificacion.error('Error al cargar los egresados asignados.');
      }
    });
  }

  revisarProyectoAlumno(alumno: any) {
    this.alumnoSeleccionado = alumno;
    this.comentarioAsesor = '';
    this.documentosAlumno = [];
    // Solo cargamos documentos del paso2 (proyecto)
    this.dbService.getDocumentos(alumno.id.toString()).subscribe({
      next: (docs: any[]) => {
        this.errorCargaDocumentos = false;
        this.documentosAlumno = docs.filter(
          d => d.paso === 'paso2' && d.nombre_doc === 'Dictamen de Trabajo'
        );
        if (this.documentosAlumno.length === 0) {
          void this.notificacion.info('El egresado aún no ha subido documentos del proyecto.');
        }
      },
      error: (error) => {
        this.errorCargaDocumentos = true;
        this.documentosAlumno = [];
        console.error('Error al cargar documentos del alumno para revisión.', error);
        void this.notificacion.error('Error al cargar los documentos del egresado.');
      }
    });
    this.isModalOpen = true;
  }

  verDocumento(url: string) {
    if (!url || !window.open(url, '_blank')) {
      void this.notificacion.error('No se pudo abrir el archivo del egresado.');
    }
  }

  guardarComentariosAsesor() {
    if (!this.comentarioAsesor.trim()) {
      void this.notificacion.advertencia('Escribe una retroalimentación antes de guardar.');
      return;
    }
    this.guardandoRetroalimentacion = true;
    this.dbService.actualizarFase(
      this.alumnoSeleccionado.id.toString(),
      'paso2',
      'En Revisión',
      this.comentarioAsesor
    ).subscribe({
      next: () => {
        this.guardandoRetroalimentacion = false;
        void this.notificacion.exito(`Retroalimentación enviada al egresado ${this.alumnoSeleccionado.nombre}.`);
        this.cerrarModal();
      },
      error: (error) => {
        this.guardandoRetroalimentacion = false;
        console.error('Error al guardar la retroalimentación del asesor.', error);
        void this.notificacion.error('Error al guardar la retroalimentación.');
      }
    });
  }

  cerrarModal() {
    this.isModalOpen = false;
    this.alumnoSeleccionado = null;
    this.documentosAlumno = [];
  }

  async cerrarSesion() {
    try {
      if (await this.notificacion.confirmar('¿Deseas cerrar sesión?')) {
        sessionStorage.clear();
        await this.router.navigate(['/seleccion-rol']);
      }
    } catch (error) {
      console.error('No se pudo cerrar la sesión del asesor.', error);
      void this.notificacion.error('No se pudo cerrar la sesión.');
    }
  }
}