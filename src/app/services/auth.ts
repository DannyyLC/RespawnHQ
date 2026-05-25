import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { auth, db } from '../firebase.config';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser$: Observable<FirebaseUser | null>;

  constructor() {
    this.currentUser$ = new Observable(observer => {
      return onAuthStateChanged(auth, user => observer.next(user));
    });
  }

  async register(nombre: string, correo: string, password: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(auth, correo, password);
    await setDoc(doc(db, 'users', credential.user.uid), {
      nombre,
      correo,
      rol: 'user',
      fechaRegistro: new Date(),
    });
  }

  login(correo: string, password: string) {
    return signInWithEmailAndPassword(auth, correo, password);
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const userRef = doc(db, 'users', credential.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        nombre: credential.user.displayName ?? '',
        correo: credential.user.email ?? '',
        rol: 'user',
        fechaRegistro: new Date(),
      });
    }
  }

  logout(): Promise<void> {
    return signOut(auth);
  }

  async getCurrentUserData(): Promise<User | null> {
    const user = auth.currentUser;
    if (!user) return null;
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as User;
  }

  async isAdmin(): Promise<boolean> {
    const userData = await this.getCurrentUserData();
    return userData?.rol === 'admin';
  }
}
