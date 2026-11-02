import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonButtons, IonTitle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, documentOutline, documentTextOutline, cloudUploadOutline, 
  refreshOutline, alertCircleOutline, lockClosedOutline, folderOpenOutline,
  chevronDownOutline, chevronUpOutline, checkmarkCircleOutline, calendarOutline,
  schoolOutline, businessOutline
} from 'ionicons/icons';
import { DatabaseService } from '../services/database';
import { getClaseEstadoFase, getEtiquetaEstadoFase, MAX_FILE_SIZE_BYTES } from '../shared/titulacion.constants';
import { NotificacionService } from '../services/notificacion.service';
import {
  extraerFechaProtocolaria,
  formatearFechaProtocolaria,
  obtenerFechaActualMerida,
  obtenerMinutoDelDiaMerida
} from '../shared/protocol-date';

@Component({
  selector: 'app-fases',
  templateUrl: './fases.page.html',
  styleUrls: ['./fases.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonButtons, IonTitle]
})
export class FasesPage implements OnInit {

  faseAbierta: string | null = 'paso1';
  usuarioId: string = '';
  errorCargaFases = false;
  errorCargaDocumentos = false;
  enviandoRevision = false;
  subiendoDocumento = false;
  fechaProtocolariaVigente: string | null = null;
  private temporizadorFechaProtocolaria: ReturnType<typeof setInterval> | null = null;
  private readonly alCambiarVisibilidad = () => this.actualizarEstadoFechaProtocolaria();
  private fechaEstadoActualizado = Date.now();
  private fechaProtocolariaEncontradaEnFases = false;
  readonly maxFileSizeBytes = MAX_FILE_SIZE_BYTES;

  listaFases = [
    {
      id: 'paso1',
      nombre: 'Paso 1: Inicio de Proceso (DEP)',
      estado: 'Pendiente',
      bloqueada: false,
      comentario: '',
      documentos: [
        { id: 'p1d1', nombreDoc: 'Solicitud de Titulación (según opción elegida)', archivo: null as any, urlArchivo: '', estado: '' },
        { id: 'p1d3', nombreDoc: 'Constancia de Inglés', archivo: null as any, urlArchivo: '', estado: '' },
        { id: 'p1d4', nombreDoc: 'Certificado Completo de Estudios', archivo: null as any, urlArchivo: '', estado: '' },
        { id: 'p1d5', nombreDoc: 'Verificación de Documentos', archivo: null as any, urlArchivo: '', estado: '' },
        { id: 'p1d2', nombreDoc: 'Registro de Proyecto', archivo: null as any, urlArchivo: '', estado: '' }
      ]
    },
    {
      id: 'paso2',
      nombre: 'Paso 2: Academias',
      estado: 'Pendiente',
      bloqueada: true,
      comentario: '',
      documentos: [
        { id: 'p2d2', nombreDoc: 'Dictamen de Trabajo', archivo: null as any, urlArchivo: '', estado: '' },
        { id: 'p2d3', nombreDoc: 'Conformación del Sínodo (Trabajo Final)', archivo: null as any, urlArchivo: '', estado: '' }
      ]
    },
    {
      id: 'paso3',
      nombre: 'Paso 3: Solicitud de Acto Protocolario (DEP)',
      estado: 'Pendiente',
      bloqueada: true,
      comentario: '',
      documentos: [
        { id: 'p3d1', nombreDoc: 'Emisión de Solicitud de Acto Protocolario', archivo: null as any, urlArchivo: '', estado: '' }
      ]
    },
    {
      id: 'paso4',
      nombre: 'Paso 4: Autorización para Sustentar (Serv. Escolares)',
      estado: 'Pendiente',
      bloqueada: true,
      comentario: '',
      documentos: [
        { id: 'p4d1', nombreDoc: 'Verificación de Documentos (Serv. Escolares)', archivo: null as any, urlArchivo: '', estado: '' },
        { id: 'p4d2', nombreDoc: 'Carta de No Inconveniencia para Sustentar', archivo: null as any, urlArchivo: '', estado: '' }
      ]
    },
    {
      id: 'paso5',
      nombre: 'Paso 5: Sustentación de Acto Protocolario',
      estado: 'Pendiente',
      bloqueada: true,
      comentario: '',
      documentos: [
        { id: 'p5d1', nombreDoc: 'Programación de Fecha para Sustentar (DEP)', archivo: null as any, urlArchivo: '', estado: '' },
        { id: 'p5d2', nombreDoc: 'Aviso de Acto Protocolario (DEP)', archivo: null as any, urlArchivo: '', estado: '' },
        { id: 'p5d3', nombreDoc: 'Constancia de Sustentación de Acto Protocolario', archivo: null as any, urlArchivo: '', estado: '' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private notificacion: NotificacionService
  ) {
    addIcons({ 
      arrowBackOutline, documentOutline, documentTextOutline, cloudUploadOutline, 
      refreshOutline, alertCircleOutline, lockClosedOutline, folderOpenOutline,
      chevronDownOutline, chevronUpOutline, checkmarkCircleOutline, calendarOutline,
      schoolOutline, businessOutline
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
      this.usuarioId = String(usuario.id ?? '');
    } catch (error) {
      console.error('No se pudo leer la sesión del estudiante.', error);
      void this.notificacion.error('No se pudieron cargar los datos de tu sesión.');
    }
  }

  ionViewWillEnter(): void {
    if (!this.usuarioId) return;
    this.fechaProtocolariaVigente = null;
    this.fechaProtocolariaEncontradaEnFases = false;
    this.cargarFases();
    this.cargarDocumentos();
    this.cargarFechaProtocolaria();
    this.actualizarEstadoFechaProtocolaria();
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
    if (this.temporizadorFechaProtocolaria === null) {
      this.temporizadorFechaProtocolaria = setInterval(
        this.alCambiarVisibilidad,
        30_000
      );
    }
  }

  ionViewWillLeave(): void {
    document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    if (this.temporizadorFechaProtocolaria !== null) {
      clearInterval(this.temporizadorFechaProtocolaria);
      this.temporizadorFechaProtocolaria = null;
    }
  }

  private cargarFechaProtocolaria(): void {
    this.dbService.getUsuario(this.usuarioId).subscribe({
      next: (respuesta: any) => {
        const fecha = this.extraerFechaProtocolariaRespuesta(respuesta);
        if (fecha || !this.fechaProtocolariaEncontradaEnFases) {
          this.actualizarFechaProtocolaria(fecha);
        }
      },
      error: (error) => {
        console.error('No se pudo cargar la fecha de acto protocolario.', error);
        void this.notificacion.error('No se pudo consultar la fecha de acto protocolario.');
      }
    });
  }

  private extraerFechaProtocolariaRespuesta(respuesta: any): string | null {
    const registros = [
      respuesta,
      respuesta?.usuario,
      respuesta?.data,
      respuesta?.data?.usuario
    ];
    for (const registro of registros) {
      const fecha = extraerFechaProtocolaria(registro);
      if (fecha) return fecha;
    }
    return null;
  }

  private actualizarFechaProtocolaria(fecha: string | null): void {
    let fechaAnterior: string | null = null;
    const clave = `fecha-protocolaria-vista:${this.usuarioId}`;
    try {
      fechaAnterior = localStorage.getItem(clave);
    } catch (error) {
      console.warn('No se pudo consultar la fecha protocolaria guardada localmente.', error);
    }
    this.fechaProtocolariaVigente = fecha;
    if (fecha) {
      try {
        localStorage.setItem(clave, fecha);
      } catch (error) {
        console.warn('No se pudo guardar localmente la fecha protocolaria.', error);
      }
      if (fechaAnterior && fechaAnterior !== fecha) {
        void this.notificacion.info(
          `Coordinación actualizó tu fecha de acto protocolario: ${formatearFechaProtocolaria(fecha, true)}.`
        );
      }
    }
    this.actualizarEstadoFechaProtocolaria();
  }

  get tipoFechaProtocolaria(): 'sin-fecha' | 'hoy' | 'futura' | 'pasada' {
    if (!this.fechaProtocolariaVigente) return 'sin-fecha';
    const hoy = obtenerFechaActualMerida(new Date(this.fechaEstadoActualizado));
    if (this.fechaProtocolariaVigente === hoy) return 'hoy';
    return this.fechaProtocolariaVigente > hoy ? 'futura' : 'pasada';
  }

  get puedeCargarPaso3(): boolean {
    return this.tipoFechaProtocolaria === 'hoy' &&
      obtenerMinutoDelDiaMerida(new Date(this.fechaEstadoActualizado)) >= 1;
  }

  formatearFechaAsignada(fecha: string): string {
    return formatearFechaProtocolaria(fecha, true);
  }

  private actualizarEstadoFechaProtocolaria(): void {
    this.fechaEstadoActualizado = Date.now();
  }

  cargarFases() {
    this.dbService.getFases(this.usuarioId).subscribe({
      next: (fases: any[]) => {
        this.errorCargaFases = false;
        const fechaDesdeFases = extraerFechaProtocolaria(fases) ?? (Array.isArray(fases)
          ? fases.map(fase => extraerFechaProtocolaria(fase)).find((fecha): fecha is string => fecha !== null)
          : null);
        this.fechaProtocolariaEncontradaEnFases = true;
        if (fechaDesdeFases) this.actualizarFechaProtocolaria(fechaDesdeFases);
        if (!Array.isArray(fases)) {
          this.errorCargaFases = true;
          console.error('La respuesta de etapas del egresado tiene un formato inesperado.', fases);
          void this.notificacion.error('No se pudieron cargar las etapas de titulación.');
          return;
        }
        this.notificarCambiosEtapasDeRevision(fases);
        fases.forEach(faseDB => {
          const fase = this.listaFases.find(f => f.id === faseDB.paso);
          if (fase) {
            fase.estado = faseDB.estado;
            fase.comentario = faseDB.comentario || '';
          }
        });
        this.actualizarBloqueos();
      },
      error: (error) => {
        this.errorCargaFases = true;
        console.error('Error al cargar las etapas del estudiante.', error);
        void this.notificacion.error('Error al cargar las etapas de titulación.');
      }
    });
  }

  private notificarCambiosEtapasDeRevision(fases: any[]): void {
    if (!this.usuarioId) return;
    for (const paso of ['paso2', 'paso4']) {
      const estado = fases.find(fase => fase?.paso === paso)?.estado;
      if (typeof estado !== 'string') continue;
      const clave = `estado-etapa-coordinacion:${this.usuarioId}:${paso}`;
      try {
        const estadoAnterior = localStorage.getItem(clave);
        if (estadoAnterior && estadoAnterior !== estado &&
          (estado === 'Aprobado' || estado === 'Rechazado')) {
          const numeroEtapa = paso === 'paso2' ? '2' : '4';
          const resultado = estado === 'Aprobado' ? 'aprobada' : 'no aprobada';
          void this.notificacion.info(`Tu etapa ${numeroEtapa} fue ${resultado}.`);
        }
        localStorage.setItem(clave, estado);
      } catch (error) {
        console.warn(`No se pudo guardar el estado anterior de ${paso}.`, error);
      }
    }
  }

  cargarDocumentos() {
    this.dbService.getDocumentos(this.usuarioId).subscribe({
      next: (docs: any[]) => {
        this.errorCargaDocumentos = false;
        docs.forEach(doc => {
          const fase = this.listaFases.find(f => f.id === doc.paso);
          if (fase) {
            const documento = fase.documentos.find(d => d.nombreDoc === doc.nombre_doc);
            if (documento) {
              documento.urlArchivo = doc.ruta_archivo;
              documento.archivo = doc.nombre_archivo;
              documento.estado = typeof (doc.estado ?? doc.estatus) === 'string'
                ? (doc.estado ?? doc.estatus)
                : '';
            }
          }
        });
      },
      error: (error) => {
        this.errorCargaDocumentos = true;
        console.error('Error al cargar los documentos del estudiante.', error);
        void this.notificacion.error('Error al cargar los documentos de la etapa.');
      }
    });
  }

  actualizarBloqueos() {
    for (let i = 1; i < this.listaFases.length; i++) {
      const anterior = this.listaFases[i - 1];
      this.listaFases[i].bloqueada = anterior.estado !== 'Aprobado';
    }
  }

  toggleFase(fase: any) {
    if (fase.bloqueada) {
      void this.notificacion.advertencia('Primero debe aprobarse la etapa anterior.');
      return;
    }
    this.faseAbierta = this.faseAbierta === fase.id ? null : fase.id;
  }

  triggerFileInput(docId: string, fase?: any) {
    if (fase?.id === 'paso3' && !this.puedeCargarPaso3) return;
    const input = document.getElementById('file-' + docId) as HTMLInputElement;
    if (input) input.click();
  }

  async seleccionarArchivo(event: Event, fase: any, documento: any) {
    const input = event.target as HTMLInputElement;
    if (fase.id === 'paso3' && !this.puedeCargarPaso3) {
      input.value = '';
      return;
    }
    const archivo = input.files?.[0];
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
      console.error('No se pudo leer el archivo seleccionado.', error);
      void this.notificacion.error('El archivo PDF está dañado o no se puede leer.');
      input.value = '';
      return;
    }
    if (documento.urlArchivo) {
      try {
        const reemplazar = await this.notificacion.confirmar('¿Deseas reemplazar el archivo existente?', {
          textoAceptar: 'Reemplazar'
        });
        if (!reemplazar) {
          input.value = '';
          return;
        }
      } catch (error) {
        console.error('No se pudo confirmar el reemplazo del documento.', error);
        void this.notificacion.error('No se pudo confirmar el reemplazo del archivo.');
        return;
      }
    }
    documento.archivo = archivo;
    this.subirArchivo(fase, documento);
  }

  subirArchivo(fase: any, documento: any) {
    if (!documento.archivo) return;
    if (fase.id === 'paso3' && !this.puedeCargarPaso3) return;
    this.subiendoDocumento = true;
    this.dbService.subirDocumento(
      this.usuarioId,
      fase.id,
      documento.nombreDoc,
      documento.archivo
    ).subscribe({
      next: (response: any) => {
        documento.urlArchivo = response.url;
        documento.estado = typeof response?.estado === 'string' ? response.estado : 'En Revisión';
        this.subiendoDocumento = false;
        void this.notificacion.exito(`"${documento.nombreDoc}" subido correctamente.`);
      },
      error: (error) => {
        this.subiendoDocumento = false;
        console.error('Error al subir documento de etapa.', error);
        void this.reintentarSubida(fase, documento);
      }
    });
  }

  private async reintentarSubida(fase: any, documento: any) {
    try {
      const reintentar = await this.notificacion.confirmar('Error al subir el archivo. Intenta de nuevo.', {
        textoAceptar: 'Reintentar',
        textoCancelar: 'Cancelar'
      });
      if (reintentar) this.subirArchivo(fase, documento);
    } catch (error) {
      console.error('No se pudo mostrar la opción para reintentar la carga.', error);
      void this.notificacion.error('Error al subir el archivo. Intenta de nuevo.');
    }
  }

  async enviarARevision(fase: any) {
    if (fase.id === 'paso3' && !this.puedeCargarPaso3) return;
    const faltantes = fase.documentos.filter((documento: any) => !documento.urlArchivo);
    if (faltantes.length > 0) {
      const nombres = faltantes.map((documento: any) => `• ${documento.nombreDoc}`).join('\n');
      void this.notificacion.advertencia(
        `Por favor sube todos los documentos de esta etapa antes de enviarla a revisión.\nFaltan:\n${nombres}`
      );
      return;
    }
    try {
      const confirmar = await this.notificacion.confirmar('¿Deseas enviar esta etapa a revisión?');
      if (!confirmar) return;
    } catch (error) {
      console.error('No se pudo confirmar el envío de la etapa.', error);
      void this.notificacion.error('No se pudo confirmar el envío de la etapa.');
      return;
    }
    this.enviandoRevision = true;
    this.dbService.actualizarFase(this.usuarioId, fase.id, 'En Revisión', '').subscribe({
      next: () => {
        fase.estado = 'En Revisión';
        this.enviandoRevision = false;
        void this.notificacion.exito('Etapa enviada a revisión correctamente.');
      },
      error: (error) => {
        this.enviandoRevision = false;
        console.error('Error al enviar la etapa a revisión.', error);
        void this.notificacion.error('Error al enviar la etapa.');
      }
    });
  }

  getClaseEstado(estado: string): string {
    return getClaseEstadoFase(estado);
  }

  getEtiquetaEstado(estado: string): string {
    return getEtiquetaEstadoFase(estado);
  }

  verArchivo(url: string) {
    const ventana = window.open(url, '_blank');
    if (!ventana) void this.notificacion.error('No se pudo abrir el archivo.');
  }

  archivoCancelado() {
    void this.notificacion.advertencia('No seleccionaste ningún archivo.');
  }

  regresarAlInicio() {
    void this.router.navigate(['/inicio']).catch((error) => {
      console.error('No se pudo volver al menú del estudiante.', error);
      void this.notificacion.error('No se pudo abrir el menú del estudiante.');
    });
  }
}