import { Injectable } from '@angular/core';
import { FirestoreCrudService } from './firestore-crud.service';
import { Jugador } from '../models/jugador.model';

@Injectable({ providedIn: 'root' })
export class PlayerService extends FirestoreCrudService<Jugador> {
  constructor() {
    super('jugadores');
  }
}
