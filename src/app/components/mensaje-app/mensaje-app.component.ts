import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonButton, IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, checkmarkCircleOutline, informationCircleOutline, warningOutline } from 'ionicons/icons';

export type TipoMensaje = 'error' | 'exito' | 'advertencia' | 'info' | 'confirmacion';

@Component({
  selector: 'app-mensaje-app',
  standalone: true,
  imports: [IonButton, IonIcon],
  templateUrl: './mensaje-app.component.html',
  styleUrls: ['./mensaje-app.component.scss']
})
export class MensajeAppComponent implements OnInit, OnDestroy {
  @Input() tipo: TipoMensaje = 'info';
  @Input() titulo = '';
  @Input() mensaje = '';
  @Input() confirmacion = false;
  @Input() textoAceptar = 'Aceptar';
  @Input() textoCancelar = 'Cancelar';
  @ViewChild('acceptButton') acceptButton?: ElementRef<HTMLIonButtonElement>;

  private cierreAutomatico?: ReturnType<typeof setTimeout>;

  constructor(private modalController: ModalController) {
    addIcons({
      alertCircleOutline,
      checkmarkCircleOutline,
      informationCircleOutline,
      warningOutline
    });
  }

  ngOnInit() {
    if (this.tipo === 'exito' && !this.confirmacion) {
      this.cierreAutomatico = setTimeout(() => {
        void this.modalController.dismiss(false, 'timeout').catch((error) => {
          console.error('No se pudo cerrar automáticamente el mensaje.', error);
        });
      }, 3000);
    }
  }

  ngOnDestroy() {
    if (this.cierreAutomatico) clearTimeout(this.cierreAutomatico);
  }

  get nombreIcono(): string {
    switch (this.tipo) {
      case 'error':
        return 'alert-circle-outline';
      case 'exito':
        return 'checkmark-circle-outline';
      case 'advertencia':
        return 'warning-outline';
      default:
        return 'information-circle-outline';
    }
  }

  async aceptar() {
    try {
      await this.modalController.dismiss(this.confirmacion, this.confirmacion ? 'confirm' : 'accept');
    } catch (error) {
      console.error('No se pudo cerrar el mensaje de la aplicación.', error);
    }
  }

  async cancelar() {
    try {
      await this.modalController.dismiss(false, 'cancel');
    } catch (error) {
      console.error('No se pudo cancelar el mensaje de la aplicación.', error);
    }
  }
}
