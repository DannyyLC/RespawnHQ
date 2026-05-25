import { Timestamp } from 'firebase/firestore';

export interface Torneo {
  id?: string;
  nombre: string;
  juego: string;
  descripcion: string;
  fechaInicio: Timestamp | Date;
  fechaFin: Timestamp | Date;
  estado: 'proximo' | 'en_curso' | 'finalizado';
  premio: string;
  imagenUrl: string;
}
