import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RegistroUsuario {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  proyecto: string;
  matricula: string;
  carrera: string;
  correo: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  login(correo: string, contrasena: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { correo, contrasena });
  }

  registrarUsuario(datos: RegistroUsuario): Observable<any> {
    return this.http.post(`${this.apiUrl}/registro`, datos);
  }

  getUsuario(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuario/${id}`);
  }

  getCoordinador(): Observable<any> {
    return this.http.get(`${this.apiUrl}/coordinador`);
  }

  getFases(usuarioId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/fases/${usuarioId}`);
  }

  actualizarFase(usuarioId: string, paso: string, estado: string, comentario: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/fases/actualizar`, { usuarioId, paso, estado, comentario });
  }

  // POST /login acepta correo/contrasena y devuelve usuario con rol, role o tipo
  // igual a "academia" o "servicios_escolares".
  // Ambos roles pueden consultar /coordinador/alumnos, /fases/:usuarioId y /documentos/:usuarioId.
  // PUT /fases/actualizar debe inferir el rol de la sesión, permitir solo paso2 a Academia y paso4
  // a Servicios Escolares, y responder 403 ante otra etapa. Al aprobar paso2/paso4 habilita la siguiente.
  actualizarFasePorRol(
    rol: string,
    usuarioId: string,
    paso: string,
    estado: string,
    comentario: string
  ): Observable<any> {
    const pasoPermitido = rol === 'academia'
      ? 'paso2'
      : rol === 'servicios_escolares'
        ? 'paso4'
        : null;
    if (!pasoPermitido || paso !== pasoPermitido) {
      return throwError(() => new Error('El rol no puede actualizar esta etapa.'));
    }
    return this.http.put(`${this.apiUrl}/fases/actualizar`, {
      usuarioId,
      paso,
      estado,
      comentario
    });
  }

  getDocumentos(usuarioId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/documentos/${usuarioId}`);
  }

  subirDocumento(usuarioId: string, paso: string, nombreDoc: string, archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('usuarioId', usuarioId);
    formData.append('paso', paso);
    formData.append('nombreDoc', nombreDoc);
    return this.http.post(`${this.apiUrl}/documentos/subir`, formData);
  }

  getAlumnosAsesor(asesorId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/asesor/alumnos/${asesorId}`);
  }

  getAlumnosCoordinador(): Observable<any> {
    return this.http.get(`${this.apiUrl}/coordinador/alumnos`);
  }

  getAsesores(): Observable<any> {
    return this.http.get(`${this.apiUrl}/asesores`);
  }

  asignarAsesor(alumnoId: string, asesorId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/coordinador/asignar-asesor`, { alumnoId, asesorId });
  }

  // PUT /api/coordinador/cancelar-solicitud; transacción única, solo coordinadores.
  // Body: { usuarioId, motivo }; respuesta: { ok: true }.
  cancelarSolicitud(usuarioId: string, motivo?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/coordinador/cancelar-solicitud`, { usuarioId, motivo });
  }

  // PUT /api/coordinador/fecha-protocolaria { usuarioId, fecha: "YYYY-MM-DD" } responde { ok: true }.
  // El servidor debe permitir solo coordinadores, rechazar si las etapas 1 y 2 no están aprobadas,
  // guardar la fecha y notificar al egresado. Usuario/fases deben devolver fechaProtocolaria como YYYY-MM-DD.
  // POST /documentos/subir debe responder 403 para paso3 si la fecha de hoy en America/Merida no es la asignada.
  cambiarFechaProtocolaria(usuarioId: string, fecha: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/coordinador/fecha-protocolaria`, { usuarioId, fecha });
  }
}