import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCard, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, peopleCircleOutline, briefcaseOutline, chevronForwardOutline,
  schoolOutline, businessOutline
} from 'ionicons/icons';
import { NotificacionService } from '../services/notificacion.service';

@Component({
  selector: 'app-seleccion-rol',
  templateUrl: './seleccion-rol.page.html',
  styleUrls: ['./seleccion-rol.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonCard, IonIcon]
})
export class SeleccionRolPage {

  constructor(private router: Router, private notificacion: NotificacionService) {
    addIcons({
      personOutline, peopleCircleOutline, briefcaseOutline, chevronForwardOutline,
      schoolOutline, businessOutline
    });
  }

  navegar(rol: string) {
    if (rol === 'estudiante') {
      this.irARuta(['/dashboard']);
    } 
    else if (rol === 'coordinador') {
      this.irARuta(['/login-admin']);
    } 
    else if (rol === 'asesor') {
      this.irARuta(['/login-asesor']);
    }
    else if (rol === 'academia') {
      this.irARuta(['/login-academia']);
    }
    else if (rol === 'servicios_escolares') {
      this.irARuta(['/login-servicios-escolares']);
    }
  }

  private irARuta(ruta: string[]) {
    void this.router.navigate(ruta).catch((error) => {
      console.error('No se pudo abrir la pantalla seleccionada.', error);
      void this.notificacion.error('No se pudo abrir la pantalla seleccionada.');
    });
  }
}