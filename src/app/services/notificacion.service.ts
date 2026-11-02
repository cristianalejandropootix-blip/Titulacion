import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { MensajeAppComponent, TipoMensaje } from '../components/mensaje-app/mensaje-app.component';

export interface OpcionesConfirmacion {
  titulo?: string;
  textoAceptar?: string;
  textoCancelar?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private avisosAbiertos = new Map<string, Promise<void>>();

  constructor(private modalController: ModalController) {}

  error(mensaje: string, titulo = 'Ocurrió un error'): Promise<void> {
    return this.mostrar('error', mensaje, titulo);
  }

  exito(mensaje: string, titulo = 'Listo'): Promise<void> {
    return this.mostrar('exito', mensaje, titulo);
  }

  advertencia(mensaje: string, titulo = 'Aviso'): Promise<void> {
    return this.mostrar('advertencia', mensaje, titulo);
  }

  info(mensaje: string, titulo = 'Información'): Promise<void> {
    return this.mostrar('info', mensaje, titulo);
  }

  mensajeApi(error: unknown, mensajeAlternativo: string): string {
    if (typeof error !== 'object' || error === null) return mensajeAlternativo;
    const cuerpo = (error as { error?: unknown }).error;
    if (typeof cuerpo !== 'object' || cuerpo === null) return mensajeAlternativo;
    const respuesta = cuerpo as { error?: unknown; message?: unknown };
    const candidatos = [respuesta.error, respuesta.message];
    const mensaje = candidatos.find((valor): valor is string =>
      typeof valor === 'string' &&
      valor.trim().length > 0 &&
      !/[{}\[\]]/.test(valor) &&
      !/\b(undefined|null|exception|stack trace|sql|http error)\b/i.test(valor)
    );
    return mensaje?.trim() ?? mensajeAlternativo;
  }

  async confirmar(mensaje: string, opciones: OpcionesConfirmacion = {}): Promise<boolean> {
    const modal = await this.modalController.create({
      component: MensajeAppComponent,
      componentProps: {
        tipo: 'confirmacion' satisfies TipoMensaje,
        titulo: opciones.titulo ?? 'Confirmar acción',
        mensaje,
        confirmacion: true,
        textoAceptar: opciones.textoAceptar ?? 'Aceptar',
        textoCancelar: opciones.textoCancelar ?? 'Cancelar'
      },
      cssClass: 'mensaje-app-modal',
      backdropDismiss: true,
      showBackdrop: true,
      animated: true
    });
    await modal.present();
    this.focusAcceptButton(modal);
    const { role } = await modal.onDidDismiss();
    return role === 'confirm';
  }

  private mostrar(tipo: TipoMensaje, mensaje: string, titulo: string): Promise<void> {
    const llave = `${tipo}:${mensaje}`;
    const avisoExistente = this.avisosAbiertos.get(llave);
    if (avisoExistente) return avisoExistente;

    const aviso = this.presentar(tipo, mensaje, titulo).finally(() => {
      this.avisosAbiertos.delete(llave);
    });
    this.avisosAbiertos.set(llave, aviso);
    return aviso;
  }

  private async presentar(tipo: TipoMensaje, mensaje: string, titulo: string): Promise<void> {
    try {
      const modal = await this.modalController.create({
        component: MensajeAppComponent,
        componentProps: { tipo, mensaje, titulo },
        cssClass: 'mensaje-app-modal',
        backdropDismiss: true,
        showBackdrop: true,
        animated: true
      });
      await modal.present();
      this.focusAcceptButton(modal);
      await modal.onDidDismiss();
    } catch (error) {
      console.error('No se pudo presentar la notificación de la aplicación.', error);
    }
  }

  private focusAcceptButton(modal: HTMLIonModalElement): void {
    modal.querySelector('app-mensaje-app ion-button')?.shadowRoot?.querySelector('button')?.focus();
  }
}
