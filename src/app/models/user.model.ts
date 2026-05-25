import { Timestamp } from 'firebase/firestore';

export interface User {
  id?: string;
  nombre: string;
  correo: string;
  rol: 'admin' | 'user';
  fechaRegistro: Timestamp | Date;
}
