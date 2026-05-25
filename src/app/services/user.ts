import { Injectable } from '@angular/core';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase.config';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  async getUserById(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as User;
  }

  async createUserDoc(uid: string, data: Omit<User, 'id'>): Promise<void> {
    await setDoc(doc(db, 'users', uid), data);
  }

  async getAllUsers(): Promise<User[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as User);
  }
}
