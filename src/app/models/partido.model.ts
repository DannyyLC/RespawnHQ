import { Timestamp } from 'firebase/firestore';

export interface Partido {
  id?: string;
  torneoId: string;
  equipoAId: string;
  equipoBId: string;
  marcadorA: number;
  marcadorB: number;
  fecha: Timestamp | Date;
  estado: 'programado' | 'finalizado';
}
