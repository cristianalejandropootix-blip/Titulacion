import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController, IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonItem, IonSelect,
  IonSelectOption, IonModal, IonTitle, IonButtons, IonTextarea, IonBadge, IonSearchbar,
  IonDatetime, IonFooter, PopoverController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline, documentTextOutline, checkmarkOutline, closeOutline,
  personCircleOutline, chevronForwardOutline, documentAttachOutline,
  alertCircleOutline, eyeOutline, searchOutline, lockClosedOutline, calendarOutline
} from 'ionicons/icons';
import { DatabaseService } from '../services/database';
import { NotificacionService } from '../services/notificacion.service';
import { environment } from '../../environments/environment';
import {
  getClaseEstadoFase,
  getEtiquetaEstadoFase,
  getResumenEstadoFase
} from '../shared/titulacion.constants';
import {
  extraerFechaProtocolaria,
  formatearFechaProtocolaria as formatearFechaCalendario,
  normalizarFechaProtocolaria,
  obtenerAnioFechaProtocolaria,
  obtenerFechaActualMerida,
  sumarAnosFechaProtocolaria
} from '../shared/protocol-date';

@Component({
  selector: 'app-inicio-admin',
  templateUrl: './inicio-admin.page.html',
  styleUrls: ['./inicio-admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonButton,
    IonIcon, IonItem, IonSelect, IonSelectOption, IonModal, IonTitle, IonButtons,
    IonTextarea, IonBadge, IonSearchbar, IonDatetime, IonFooter
  ]
})
export class InicioAdminPage implements OnInit {
  @ViewChild('revisionModal') private revisionModal?: IonModal;
  @ViewChild('fechaModal') private fechaModal?: IonModal;
  private readonly alertController = inject(AlertController);
  private readonly popoverController = inject(PopoverController);
  private readonly route = inject(ActivatedRoute);

  private readonly ordenDocumentosPorPaso: Record<string, string[]> = {
    paso1: [
      'Solicitud de Titulación (según opción elegida)',
      'Constancia de Inglés',
      'Certificado Completo de Estudios',
      'Verificación de Documentos',
      'Registro de Proyecto'
    ],
    paso2: ['Dictamen de Trabajo', 'Conformación del Sínodo (Trabajo Final)']
  };

  isModalOpen: boolean = false;
  alumnoSeleccionado: any = null;
  comentariosCoordinador: string = '';
  pasoSeleccionado: string = 'paso1';
  documentosAlumno: any[] = [];

  listaAlumnos: any[] = [];
  listaAlumnosFiltrados: any[] = [];
  busquedaTexto = '';
  readonly sinCarreraAsignada = 'Sin carrera asignada';
  errorCargaDocumentos = false;
  procesandoAccion = false;
  isFechaModalOpen = false;
  fechaProtocolariaSeleccionada = '';
  fechaProtocolariaVigente: string | null = null;
  guardandoFechaProtocolaria = false;
  cancelacionEnCurso = false;
  rolPanel = 'coordinador';
  minFechaProtocolaria = obtenerFechaActualMerida();
  maxFechaProtocolaria = sumarAnosFechaProtocolaria(this.minFechaProtocolaria, 3);
  aniosFechaProtocolaria: number[] = [];
  private busquedaPendiente: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private router: Router,
    private dbService: DatabaseService,
    private notificacion: NotificacionService
  ) {
    addIcons({
      logOutOutline, documentTextOutline, checkmarkOutline, closeOutline, 
      personCircleOutline, chevronForwardOutline, documentAttachOutline,
      alertCircleOutline, eyeOutline, searchOutline, lockClosedOutline, calendarOutline
    });
  }

  ngOnInit() {
    this.rolPanel = this.route.snapshot.data['panelRole'] ?? 'coordinador';
    if (this.rolPanel === 'academia') this.pasoSeleccionado = 'paso2';
    if (this.rolPanel === 'servicios_escolares') this.pasoSeleccionado = 'paso4';
    this.cargarAlumnos();
  }

  get tituloPanel(): string {
    if (this.rolPanel === 'academia') return 'Panel de Academia';
    if (this.rolPanel === 'servicios_escolares') return 'Panel de Servicios Escolares';
    return 'Panel de Coordinación';
  }

  get esCoordinador(): boolean {
    return this.rolPanel === 'coordinador';
  }

  get pasoPermitidoPorRol(): string | null {
    if (this.rolPanel === 'academia') return 'paso2';
    if (this.rolPanel === 'servicios_escolares') return 'paso4';
    return null;
  }

  get revisionDisponible(): boolean {
    if (this.esCoordinador) return true;
    if (this.rolPanel === 'academia') {
      return this.getFaseEstado(this.alumnoSeleccionado, 'paso1') === 'Aprobado';
    }
    if (this.rolPanel === 'servicios_escolares') {
      return this.getFaseEstado(this.alumnoSeleccionado, 'paso3') === 'Aprobado';
    }
    return false;
  }

  private validarEtapaDeRol(): boolean {
    if (this.esCoordinador) return true;
    if (this.pasoSeleccionado !== this.pasoPermitidoPorRol) {
      void this.notificacion.advertencia('Esta etapa no está disponible para tu rol.');
      return false;
    }
    if (!this.revisionDisponible) {
      void this.notificacion.info('Aún no está disponible para revisión.');
      return false;
    }
    return true;
  }

  private actualizarFaseSegunRol(estado: string): import('rxjs').Observable<any> {
    if (this.esCoordinador) {
      return this.dbService.actualizarFase(
        this.alumnoSeleccionado.id,
        this.pasoSeleccionado,
        estado,
        this.comentariosCoordinador
      );
    }
    return this.dbService.actualizarFasePorRol(
      this.rolPanel,
      this.alumnoSeleccionado.id,
      this.pasoSeleccionado,
      estado,
      this.comentariosCoordinador
    );
  }

  ionViewWillEnter(): void {
    const rolActual = this.route.snapshot.data['panelRole'] ?? 'coordinador';
    if (rolActual !== this.rolPanel) {
      this.rolPanel = rolActual;
      this.pasoSeleccionado = this.pasoPermitidoPorRol ?? 'paso1';
    }
    this.reiniciarBusqueda();
  }

  ionViewWillLeave(): void {
    this.cancelarBusquedaPendiente();
  }

  cargarAlumnos() {
    this.dbService.getAlumnosCoordinador().subscribe({
      next: (data: any[]) => {
        this.listaAlumnos = data;
        this.actualizarResultados();
      },
      error: (error) => {
        console.error('Error al cargar alumnos para coordinación.', error);
        void this.notificacion.error('Error al cargar egresados');
      }
    });
  }

  buscarEgresados(event: CustomEvent<{ value?: string | null }>): void {
    this.busquedaTexto = event.detail.value ?? '';
    this.cancelarBusquedaPendiente();
    this.busquedaPendiente = setTimeout(() => {
      this.busquedaPendiente = null;
      this.actualizarResultados();
    }, 250);
  }

  reiniciarBusqueda(): void {
    this.cancelarBusquedaPendiente();
    this.busquedaTexto = '';
    this.actualizarResultados();
  }

  private cancelarBusquedaPendiente(): void {
    if (this.busquedaPendiente !== null) {
      clearTimeout(this.busquedaPendiente);
      this.busquedaPendiente = null;
    }
  }

  actualizarResultados(): void {
    const criterios = this.normalizarTexto(this.busquedaTexto).split(/\s+/).filter(Boolean);
    this.listaAlumnosFiltrados = this.listaAlumnos.filter((egresado) => {
      if (criterios.length === 0) return true;

      const datosNombre = this.getNombreYApellidos(egresado);
      const matricula = this.normalizarTexto(
        egresado.matricula_o_nomina ?? egresado.matricula ?? egresado.numero_control ?? egresado.numeroControl
      );
      const campos = [
        this.normalizarTexto(`${datosNombre.nombre} ${datosNombre.apellidos}`),
        this.normalizarTexto(datosNombre.nombre),
        this.normalizarTexto(datosNombre.apellidos),
        matricula,
        this.normalizarTexto(this.getCarreraEgresado(egresado))
      ];
      return criterios.every((criterio) => campos.some((campo) => campo.includes(criterio)));
    });
  }

  getFaseEstado(alumno: any, paso: string): string {
    if (!alumno?.fases) return 'Pendiente';
    const fase = alumno.fases.find((f: any) => f.paso === paso);
    return fase ? fase.estado : 'Pendiente';
  }

  getAlumnosPorCarrera(): { carrera: string; alumnos: any[] }[] {
    const grupos = new Map<string, any[]>();
    for (const alumno of this.listaAlumnosFiltrados) {
      const carrera = this.getCarreraEgresado(alumno);
      const alumnos = grupos.get(carrera) ?? [];
      alumnos.push(alumno);
      grupos.set(carrera, alumnos);
    }
    return Array.from(grupos, ([carrera, alumnos]) => ({ carrera, alumnos }))
      .sort((a, b) => {
        if (a.carrera === 'Sin carrera asignada') return 1;
        if (b.carrera === 'Sin carrera asignada') return -1;
        return a.carrera.localeCompare(b.carrera);
      });
  }

  private getCarreraEgresado(egresado: any): string {
    return typeof egresado.carrera === 'string' && egresado.carrera.trim()
      ? egresado.carrera.trim()
      : this.sinCarreraAsignada;
  }

  private getNombreYApellidos(egresado: any): { nombre: string; apellidos: string } {
    const primerApellido = String(
      egresado.primer_apellido ?? egresado.primerApellido ?? egresado.apellido_paterno ?? ''
    ).trim();
    const segundoApellido = String(
      egresado.segundo_apellido ?? egresado.segundoApellido ?? egresado.apellido_materno ?? ''
    ).trim();
    const nombre = String(
      egresado.nombre ?? egresado.nombres ?? egresado.nombre_completo ?? egresado.nombreCompleto ?? ''
    ).trim();

    if (primerApellido || segundoApellido) {
      return { nombre, apellidos: [primerApellido, segundoApellido].filter(Boolean).join(' ') };
    }

    const palabras = nombre.split(/\s+/).filter(Boolean);
    if (palabras.length >= 3) {
      return { nombre: palabras.slice(0, -2).join(' '), apellidos: palabras.slice(-2).join(' ') };
    }
    if (palabras.length === 2) {
      return { nombre: palabras[0], apellidos: palabras[1] };
    }
    return { nombre, apellidos: '' };
  }

  private normalizarTexto(valor: unknown): string {
    return String(valor ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  getClaseEstado(estado: string): string {
    return getClaseEstadoFase(estado);
  }

  getEtiquetaEstado(estado: string): string {
    return getEtiquetaEstadoFase(estado);
  }

  getResumenEstado(estado: string): string {
    return getResumenEstadoFase(estado);
  }

  abrirRevision(alumno: any) {
    this.alumnoSeleccionado = alumno;
    this.comentariosCoordinador = '';
    this.pasoSeleccionado = this.pasoPermitidoPorRol ?? 'paso1';
    this.fechaProtocolariaVigente = extraerFechaProtocolaria(alumno);
    this.cargarDocumentosAlumno(alumno.id);
    this.isModalOpen = true;
  }

  get puedeCambiarFechaProtocolaria(): boolean {
    return this.pasoSeleccionado === 'paso3' &&
      this.getFaseEstado(this.alumnoSeleccionado, 'paso1') === 'Aprobado' &&
      this.getFaseEstado(this.alumnoSeleccionado, 'paso2') === 'Aprobado';
  }

  abrirCambioFechaProtocolaria(): void {
    if (!this.esCoordinador || !this.puedeCambiarFechaProtocolaria) {
      void this.notificacion.advertencia('Disponible cuando las etapas 1 y 2 estén aprobadas.');
      return;
    }
    this.minFechaProtocolaria = obtenerFechaActualMerida();
    this.maxFechaProtocolaria = sumarAnosFechaProtocolaria(this.minFechaProtocolaria, 3);
    const anioInicial = obtenerAnioFechaProtocolaria(this.minFechaProtocolaria);
    const anioFinal = obtenerAnioFechaProtocolaria(this.maxFechaProtocolaria);
    this.aniosFechaProtocolaria = anioInicial === null || anioFinal === null
      ? []
      : Array.from({ length: anioFinal - anioInicial + 1 }, (_, indice) => anioInicial + indice);
    this.fechaProtocolariaSeleccionada = this.fechaProtocolariaVigente ?? this.minFechaProtocolaria;
    this.isFechaModalOpen = true;
  }

  get puedeGuardarFechaProtocolaria(): boolean {
    const fechaSeleccionada = normalizarFechaProtocolaria(this.fechaProtocolariaSeleccionada);
    return fechaSeleccionada !== null &&
      fechaSeleccionada !== this.fechaProtocolariaVigente &&
      fechaSeleccionada >= this.minFechaProtocolaria &&
      fechaSeleccionada <= this.maxFechaProtocolaria;
  }

  guardarFechaProtocolaria(): void {
    if (!this.esCoordinador || !this.alumnoSeleccionado || !this.puedeCambiarFechaProtocolaria) {
      void this.notificacion.advertencia('Disponible cuando las etapas 1 y 2 estén aprobadas.');
      return;
    }
    const fecha = normalizarFechaProtocolaria(this.fechaProtocolariaSeleccionada);
    if (!fecha || !this.puedeGuardarFechaProtocolaria) {
      void this.notificacion.advertencia('Selecciona una fecha disponible distinta de la asignada.');
      return;
    }
    if (this.guardandoFechaProtocolaria) return;

    this.guardandoFechaProtocolaria = true;
    this.dbService.cambiarFechaProtocolaria(this.alumnoSeleccionado.id, fecha).subscribe({
      next: () => {
        this.guardandoFechaProtocolaria = false;
        this.isFechaModalOpen = false;
        this.fechaProtocolariaVigente = fecha;
        this.alumnoSeleccionado.fechaProtocolaria = fecha;
        void this.notificacion.exito('Fecha protocolaria guardada.');
      },
      error: (error) => {
        this.guardandoFechaProtocolaria = false;
        console.error('Error al guardar la fecha protocolaria.', error);
        const mensaje = error?.status === 404
          ? 'El servidor aún no tiene habilitada la asignación de fechas.'
          : error?.status === 0
            ? 'No se pudo conectar con el servidor.'
            : this.notificacion.mensajeApi(error, 'No se pudo guardar la fecha protocolaria.');
        void this.notificacion.error(mensaje);
      }
    });
  }

  async autorizarCancelacion(): Promise<void> {
    if (!this.esCoordinador) return;
    if (!this.alumnoSeleccionado || this.cancelacionEnCurso) return;
    if (!String(this.alumnoSeleccionado.id ?? '').trim()) {
      void this.notificacion.error('No se encontró el identificador del egresado.');
      return;
    }
    const nombre = [
      this.alumnoSeleccionado.nombre,
      this.alumnoSeleccionado.primer_apellido,
      this.alumnoSeleccionado.segundo_apellido
    ].filter(Boolean).join(' ');
    try {
      const alert = await this.alertController.create({
        header: 'Cancelar solicitud de titulación',
        message: `Se cancelará la solicitud de ${nombre}. Se rechazarán sus etapas completadas y sus documentos, y deberá iniciar desde la etapa 1. Escribe "SI" para confirmar.`,
        inputs: [{
          name: 'confirmacion',
          type: 'text',
          attributes: { autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false' }
        }],
        buttons: [
          { text: 'Volver', role: 'cancel', cssClass: 'alert-app-cancel' },
          {
            text: 'Confirmar cancelación',
            role: 'confirm',
            cssClass: 'alert-app-confirm',
            handler: (data: { confirmacion?: string }) => {
              if (this.normalizarConfirmacion(data?.confirmacion) !== 'si') {
                void this.notificacion.advertencia('Escribe SI para confirmar.');
                return false;
              }
              this.enviarCancelacionSolicitud();
              return true;
            }
          }
        ],
        cssClass: 'alert-app'
      });
      alert.style.setProperty('--background', '#ffffff');
      alert.style.setProperty('--ion-background-color', '#ffffff');
      alert.style.setProperty('--color', '#1B396A');
      alert.style.setProperty('--ion-text-color', '#1B396A');
      alert.style.setProperty('--ion-color-primary', '#1B396A');
      alert.style.setProperty('--ion-color-step-550', '#64748b');
      alert.style.setProperty('--ion-color-step-150', '#e2e8f0');
      alert.style.setProperty('color-scheme', 'light');
      await alert.present();
      this.estilizarAlertaCancelacion(alert);
    } catch (error) {
      console.error('No se pudo confirmar la cancelación de la solicitud.', error);
      void this.notificacion.error('No se pudo confirmar la cancelación de la solicitud.');
    }
  }

  private enviarCancelacionSolicitud(): void {
    if (!this.alumnoSeleccionado || this.cancelacionEnCurso) return;
    const egresadoId = String(this.alumnoSeleccionado.id ?? '').trim();
    if (!egresadoId) {
      void this.notificacion.error('No se encontró el identificador del egresado.');
      return;
    }
    const url = `${environment.apiUrl}/coordinador/cancelar-solicitud`;
    console.log('Enviando cancelación de solicitud.', { usuarioId: egresadoId, url });
    this.cancelacionEnCurso = true;
    this.dbService.cancelarSolicitud(egresadoId, 'Solicitud cancelada por coordinación').subscribe({
      next: async () => {
        this.cancelacionEnCurso = false;
        await this.cerrarRevision();
        this.cargarAlumnos();
        await this.notificacion.exito(
          'Solicitud cancelada. El egresado deberá iniciar desde la etapa 1.'
        );
      },
      error: (error) => {
        this.cancelacionEnCurso = false;
        console.error('Error al cancelar la solicitud de titulación.', error, {
          status: error?.status,
          error: error?.error
        });
        const mensaje = error?.status === 404
          ? 'El servidor aún no tiene habilitada la cancelación de solicitudes.'
          : error?.status === 0
            ? 'No se pudo conectar con el servidor.'
            : error?.status === 401 || error?.status === 403
              ? 'No tienes permiso para cancelar solicitudes.'
              : this.notificacion.mensajeApi(error, 'No se pudo cancelar la solicitud.');
        void this.notificacion.error(mensaje);
      }
    });
  }

  private normalizarConfirmacion(valor: unknown): string {
    return String(valor ?? '').trim().toLowerCase();
  }

  private estilizarAlertaCancelacion(alert: HTMLIonAlertElement): void {
    const shadowRoot = alert.shadowRoot;
    if (!shadowRoot) {
      console.error('No se encontró el contenido interno del diálogo de cancelación para aplicar estilos.');
      return;
    }
    const style = document.createElement('style');
    style.textContent = `
      .alert-wrapper {
        background: #ffffff;
        border: 1px solid rgba(197, 168, 122, 0.4);
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
      }
      .alert-title { color: #1B396A; }
      .alert-message { color: #64748b; }
      .alert-input {
        color: #1B396A;
        background: #ffffff;
        border: 1px solid rgba(197, 168, 122, 0.4);
        border-radius: 10px;
        padding: 10px;
      }
      .alert-input:focus {
        border-color: #C5A87A;
        box-shadow: 0 0 0 1px #C5A87A;
      }
      .alert-button.alert-app-cancel { color: #64748b; }
      .alert-button.alert-app-confirm {
        color: #ffffff;
        background: #854d0e;
        border-radius: 10px;
      }
    `;
    shadowRoot.appendChild(style);
  }

  formatearFechaProtocolaria(fecha: string): string {
    return formatearFechaCalendario(fecha);
  }

  cargarDocumentosAlumno(alumnoId: string) {
    this.dbService.getDocumentos(alumnoId).subscribe({
      next: (docs: any[]) => {
        this.errorCargaDocumentos = false;
        this.documentosAlumno = docs;
      },
      error: (error) => {
        this.errorCargaDocumentos = true;
        this.documentosAlumno = [];
        console.error('Error al cargar documentos del alumno.', error);
        void this.notificacion.error('Error al cargar documentos.');
      }
    });
  }

  getDocumentosPaso(paso: string): any[] {
    const documentos = this.documentosAlumno.filter(d => {
      if (d.paso !== paso) return false;
      const nombre = String(d.nombre_doc ?? '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase();
      return !(paso === 'paso2' && nombre === 'verificacion de trabajo sometido');
    });
    const orden = this.ordenDocumentosPorPaso[paso] ?? [];
    return documentos.sort((a, b) => {
      const indiceA = orden.indexOf(a.nombre_doc);
      const indiceB = orden.indexOf(b.nombre_doc);
      return (indiceA < 0 ? Number.MAX_SAFE_INTEGER : indiceA) -
        (indiceB < 0 ? Number.MAX_SAFE_INTEGER : indiceB);
    });
  }

  async cerrarRevision(): Promise<void> {
    try {
      if (this.isFechaModalOpen) {
        this.isFechaModalOpen = false;
        await this.fechaModal?.dismiss();
      }
      const popover = await this.popoverController.getTop();
      if (popover?.classList.contains('select-app')) await popover.dismiss();
      if (this.isModalOpen) {
        this.isModalOpen = false;
        await this.revisionModal?.dismiss();
      }
    } catch (error) {
      console.error('No se pudo cerrar la ventana de revisión.', error);
      void this.notificacion.error('No se pudo cerrar la ventana de revisión.');
    } finally {
      this.limpiarEstadoRevision();
    }
  }

  revisionDismissed(): void {
    this.isModalOpen = false;
    this.isFechaModalOpen = false;
    this.limpiarEstadoRevision();
  }

  private limpiarEstadoRevision(): void {
    this.isModalOpen = false;
    this.alumnoSeleccionado = null;
    this.documentosAlumno = [];
    this.fechaProtocolariaVigente = null;
  }

  async aprobarFase() {
    if (!this.alumnoSeleccionado) {
      void this.notificacion.advertencia('Selecciona un egresado antes de aprobar la etapa.');
      return;
    }
    if (!this.validarEtapaDeRol()) return;
    try {
      const confirmar = await this.notificacion.confirmar(
        `¿Deseas aprobar ${this.pasoSeleccionado} para ${this.alumnoSeleccionado.nombre}?`,
        { textoAceptar: 'Aprobar' }
      );
      if (!confirmar) return;
    } catch (error) {
      console.error('No se pudo confirmar la aprobación de la etapa.', error);
      void this.notificacion.error('No se pudo confirmar la aprobación de la etapa.');
      return;
    }
    this.procesandoAccion = true;
    this.actualizarFaseSegunRol('Aprobado').subscribe({
      next: () => {
        this.procesandoAccion = false;
        void this.notificacion.exito(`${this.pasoSeleccionado} aprobado para ${this.alumnoSeleccionado.nombre}.`);
        this.cargarAlumnos();
        if (this.esCoordinador) this.cerrarRevision();
        else this.cargarFasesRevisionActual();
      },
      error: (error) => {
        this.procesandoAccion = false;
        console.error('Error al aprobar la etapa.', error);
        void this.notificacion.error('Error al aprobar la fase');
      }
    });
  }

  async rechazarFase() {
    if (!this.alumnoSeleccionado) {
      void this.notificacion.advertencia('Selecciona un egresado antes de rechazar la etapa.');
      return;
    }
    if (!this.validarEtapaDeRol()) return;
    if (!this.comentariosCoordinador.trim()) {
      void this.notificacion.advertencia('Escribe una observación para rechazar la etapa.');
      return;
    }
    try {
      const confirmar = await this.notificacion.confirmar('¿Deseas rechazar esta etapa?', {
        textoAceptar: 'Rechazar'
      });
      if (!confirmar) return;
    } catch (error) {
      console.error('No se pudo confirmar el rechazo de la etapa.', error);
      void this.notificacion.error('No se pudo confirmar el rechazo de la etapa.');
      return;
    }
    this.procesandoAccion = true;
    this.actualizarFaseSegunRol('Rechazado').subscribe({
      next: () => {
        this.procesandoAccion = false;
        void this.notificacion.exito(`${this.pasoSeleccionado} rechazado. El egresado recibirá el motivo.`);
        this.cargarAlumnos();
        if (this.esCoordinador) this.cerrarRevision();
        else this.cargarFasesRevisionActual();
      },
      error: (error) => {
        this.procesandoAccion = false;
        console.error('Error al rechazar la etapa.', error);
        void this.notificacion.error('Error al rechazar la fase');
      }
    });
  }

  private cargarFasesRevisionActual(): void {
    if (!this.alumnoSeleccionado?.id) return;
    this.dbService.getFases(this.alumnoSeleccionado.id).subscribe({
      next: (fases: any[]) => {
        this.alumnoSeleccionado.fases = fases;
      },
      error: (error) => {
        console.error('No se pudieron actualizar las etapas del egresado.', error);
        void this.notificacion.error('No se pudieron actualizar las etapas del egresado.');
      }
    });
  }

  verDocumento(url: string) {
    if (!url) {
      void this.notificacion.error('No se encontró el archivo solicitado.');
      return;
    }
    if (!window.open(url, '_blank')) {
      void this.notificacion.error('No se pudo abrir el archivo. Permite las ventanas emergentes e inténtalo de nuevo.');
    }
  }

  async cerrarSesionAdmin() {
    try {
      if (await this.notificacion.confirmar('¿Deseas cerrar sesión?')) {
        sessionStorage.clear();
        await this.router.navigate(['/seleccion-rol']);
      }
    } catch (error) {
      console.error('No se pudo cerrar la sesión de coordinación.', error);
      void this.notificacion.error('No se pudo cerrar la sesión.');
    }
  }
}