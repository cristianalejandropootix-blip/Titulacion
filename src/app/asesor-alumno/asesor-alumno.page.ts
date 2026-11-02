import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonButtons, IonTitle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, documentTextOutline, cloudUploadOutline, 
  documentAttachOutline, chatbubbleEllipsesOutline, timeOutline 
} from 'ionicons/icons';
import { DatabaseService } from '../services/database';
import { MAX_FILE_SIZE_BYTES } from '../shared/titulacion.constants';
import { NotificacionService } from '../services/notificacion.service';

@Component({
  selector: 'app-asesor-alumno',
  templateUrl: './asesor-alumno.page.html',
  styleUrls: ['./asesor-alumno.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, 
    IonButton, IonIcon, IonButtons, IonTitle
  ]
})
export class AsesorAlumnoPage implements OnInit {

  nombreAsesor: string = '';
  nombreArchivo: string = '';
  urlArchivo: string = '';
  comentarioAsesor: string = '';
  usuarioId: string = '';
  toastAbierto = false;
  mensajeToast = '';
  readonly maxFileSizeBytes = MAX_FILE_SIZE_BYTES;
  errorCargaUsuario = false;
  errorCargaDocumento = false;
  errorCargaRetroalimentacion = false;
  subiendoDocumento = false;

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private notificacion: NotificacionService
  ) {
    addIcons({ 
      arrowBackOutline, documentTextOutline, cloudUploadOutline, 
      documentAttachOutline, chatbubbleEllipsesOutline, timeOutline 
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
      const usuario = JSON.parse(sesion);
      this.usuarioId = usuario.id;
      this.cargarDatosAsesor(usuario);
      this.cargarDocumentoProyecto();
      this.cargarRetroalimentacion();
    } catch (error) {
      console.error('No se pudo leer la sesión del estudiante.', error);
      void this.notificacion.error('No se pudieron cargar los datos de tu sesión.');
    }
  }

  cargarDatosAsesor(usuario: any) {
    this.dbService.getUsuario(usuario.id).subscribe({
      next: (data: any) => {
        if (data.asesor_asignado_id) {
          this.dbService.getUsuario(data.asesor_asignado_id.toString()).subscribe({
            next: (asesor: any) => {
              this.nombreAsesor = `${asesor.nombre} ${asesor.primer_apellido}`;
            },
            error: (error) => {
              this.errorCargaUsuario = true;
              console.error('No se pudo cargar el asesor asignado.', error);
              void this.notificacion.error('Error al cargar los datos del asesor.');
            }
          });
        } else {
          this.nombreAsesor = 'Sin asesor asignado';
          void this.notificacion.info('Aún no tienes un asesor asignado.');
        }
      },
      error: (error) => {
        this.errorCargaUsuario = true;
        console.error('No se pudo cargar el perfil del estudiante.', error);
        void this.notificacion.error('Error al cargar los datos del estudiante.');
      }
    });
  }

  cargarDocumentoProyecto() {
    this.dbService.getDocumentos(this.usuarioId).subscribe({
      next: (docs: any[]) => {
        this.errorCargaDocumento = false;
        // Buscamos el documento del proyecto (paso2 - dictamen de trabajo)
        const docProyecto = docs.find(d => d.paso === 'paso2' && d.nombre_doc === 'Dictamen de Trabajo');
        if (docProyecto) {
          this.nombreArchivo = docProyecto.nombre_archivo;
          this.urlArchivo = docProyecto.ruta_archivo;
        }
      },
      error: (error) => {
        this.errorCargaDocumento = true;
        console.error('No se pudieron cargar los documentos del proyecto.', error);
        void this.notificacion.error('Error al cargar el documento del proyecto.');
      }
    });
  }

  cargarRetroalimentacion() {
    this.dbService.getFases(this.usuarioId).subscribe({
      next: (fases: any[]) => {
        this.errorCargaRetroalimentacion = false;
        const fasesConComentario = fases.filter(f => f.comentario && f.comentario.trim() !== '');
        if (fasesConComentario.length > 0) {
          this.comentarioAsesor = fasesConComentario[fasesConComentario.length - 1].comentario;
        }
      },
      error: (error) => {
        this.errorCargaRetroalimentacion = true;
        console.error('No se pudo cargar la retroalimentación del asesor.', error);
        void this.notificacion.error('Error al cargar la retroalimentación del asesor.');
      }
    });
  }

  async seleccionarYSubirArchivo() {
    if (this.nombreArchivo) {
      try {
        const reemplazar = await this.notificacion.confirmar('¿Deseas reemplazar el archivo existente?', {
          textoAceptar: 'Reemplazar'
        });
        if (!reemplazar) return;
      } catch (error) {
        console.error('No se pudo confirmar el reemplazo del archivo.', error);
        void this.notificacion.error('No se pudo confirmar el reemplazo del archivo.');
        return;
      }
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.oncancel = () => this.notificacion.advertencia('No seleccionaste ningún archivo.');
    input.onchange = async (event: Event) => {
      const archivo = (event.target as HTMLInputElement).files?.[0];
      if (!archivo) {
        void this.notificacion.advertencia('No seleccionaste ningún archivo.');
        return;
      }
      if (archivo.type !== 'application/pdf') {
        void this.notificacion.advertencia('Solo se aceptan archivos en formato PDF.');
        input.value = '';
        return;
      }
      if (archivo.size === 0) {
        void this.notificacion.advertencia('El archivo está vacío.');
        input.value = '';
        return;
      }
      if (archivo.size > this.maxFileSizeBytes) {
        void this.notificacion.advertencia('El archivo excede el límite de 2 MB. Reduce su tamaño e inténtalo de nuevo.');
        input.value = '';
        return;
      }
      try {
        const cabecera = new Uint8Array(await archivo.slice(0, 5).arrayBuffer());
        if (new TextDecoder().decode(cabecera) !== '%PDF-') {
          void this.notificacion.advertencia('El archivo PDF está dañado o no se puede leer.');
          input.value = '';
          return;
        }
      } catch (error) {
        console.error('No se pudo leer el archivo de proyecto.', error);
        void this.notificacion.error('El archivo PDF está dañado o no se puede leer.');
        input.value = '';
        return;
      }
      this.subirDocumentoProyecto(archivo);
    };
    input.click();
  }

  private subirDocumentoProyecto(archivo: File) {
    this.subiendoDocumento = true;
    this.dbService.subirDocumento(
      this.usuarioId,
      'paso2',
      'Dictamen de Trabajo',
      archivo
    ).subscribe({
      next: (response: any) => {
        this.nombreArchivo = archivo.name;
        this.urlArchivo = response.url;
        this.subiendoDocumento = false;
        void this.notificacion.exito('Proyecto enviado a tu asesor correctamente.');
      },
      error: (error) => {
        this.subiendoDocumento = false;
        console.error('Error al subir el Dictamen de Trabajo.', error);
        void this.reintentarSubida(archivo);
      }
    });
  }

  private async reintentarSubida(archivo: File) {
    try {
      const reintentar = await this.notificacion.confirmar('Error al subir el archivo. Intenta de nuevo.', {
        textoAceptar: 'Reintentar',
        textoCancelar: 'Cancelar'
      });
      if (reintentar) this.subirDocumentoProyecto(archivo);
    } catch (error) {
      console.error('No se pudo mostrar la opción de reintento para el proyecto.', error);
      void this.notificacion.error('Error al subir el archivo. Intenta de nuevo.');
    }
  }

  verArchivo() {
    if (!this.urlArchivo) {
      void this.notificacion.error('No se encontró el archivo del proyecto.');
      return;
    }
    if (!window.open(this.urlArchivo, '_blank')) {
      void this.notificacion.error('No se pudo abrir el archivo del proyecto.');
    }
  }

  regresarAlMenu() {
    void this.router.navigate(['/inicio']).catch((error) => {
      console.error('No se pudo volver al menú del estudiante.', error);
      void this.notificacion.error('No se pudo abrir el menú del estudiante.');
    });
  }
}