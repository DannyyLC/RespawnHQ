import { Timestamp } from 'firebase/firestore';

export interface Noticia {
  id?: string;
  titulo: string;
  contenido: string;
  imagenUrl: string;
  fecha: Timestamp | Date;
  autor: string;
}
