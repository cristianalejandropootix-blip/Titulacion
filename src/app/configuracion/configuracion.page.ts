import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonIcon, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, textOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { NotificacionService } from '../services/notificacion.service';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonIcon, IonToggle]
})
export class ConfiguracionPage implements OnInit {

  textoGrande: boolean = false;
  usuario: any = null;

  constructor(private router: Router, private notificacion: NotificacionService) {
    addIcons({ arrowBackOutline, textOutline });
  }

  ngOnInit() {
    try {
      this.textoGrande = localStorage.getItem('textoGrande') === 'true';
    } catch (error) {
      console.error('No se pudo leer la preferencia de tamaño de texto.', error);
      void this.notificacion.advertencia('El almacenamiento está bloqueado. El ajuste solo se conservará durante esta sesión.');
    }
    this.aplicarTextoGrande(this.textoGrande);
    try {
      const sesion = sessionStorage.getItem('usuario');
      if (sesion) this.usuario = JSON.parse(sesion);
    } catch (error) {
      console.error('No se pudieron leer los datos de sesión en configuración.', error);
      void this.notificacion.error('No se pudieron cargar los datos de tu sesión.');
    }
  }

  toggleTextoGrande(event: any) {
    this.textoGrande = event.detail.checked;
    this.aplicarTextoGrande(this.textoGrande);
    try {
      localStorage.setItem('textoGrande', String(this.textoGrande));
    } catch (error) {
      console.error('No se pudo guardar la preferencia de tamaño de texto.', error);
      void this.notificacion.advertencia('El almacenamiento está bloqueado. El ajuste solo se conservará durante esta sesión.');
    }
  }

  aplicarTextoGrande(activo: boolean) {
    const root = document.documentElement;
    if (activo) {
      root.style.fontSize = '20px';
    } else {
      root.style.fontSize = '14px';
    }
  }

  regresar() {
    void this.router.navigate(['/inicio']).catch((error) => {
      console.error('No se pudo volver al menú del estudiante.', error);
      void this.notificacion.error('No se pudo abrir el menú del estudiante.');
    });
  }
}