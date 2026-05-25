import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  CollectionReference,
  DocumentData,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase.config';

@Injectable()
export abstract class FirestoreCrudService<T extends { id?: string }> {
  protected collectionRef: CollectionReference<DocumentData>;

  constructor(protected collectionName: string) {
    this.collectionRef = collection(db, collectionName);
  }

  getAll(): Observable<T[]> {
    return new Observable(observer => {
      const unsub = onSnapshot(
        this.collectionRef,
        snapshot => {
          const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as T);
          observer.next(items);
        },
        error => observer.error(error)
      );
      return unsub;
    });
  }

  async getById(id: string): Promise<T | null> {
    const snap = await getDoc(doc(db, this.collectionName, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as T;
  }

  async create(data: Omit<T, 'id'>): Promise<string> {
    const ref = await addDoc(this.collectionRef, data as DocumentData);
    return ref.id;
  }

  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<void> {
    await updateDoc(doc(db, this.collectionName, id), data as DocumentData);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }
}
