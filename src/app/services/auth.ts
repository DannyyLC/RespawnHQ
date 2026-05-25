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
      return onAuthStateChanged(auth, user => {
        console.info('[RespawnHQ Auth] Estado de sesion:', {
          loggedIn: !!user,
          uid: user?.uid ?? null,
          email: user?.email ?? null,
        });
        observer.next(user);
      });
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

  getCurrentAuthUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  async getCurrentUserData(): Promise<User | null> {
    const user = auth.currentUser;
    console.info('[RespawnHQ Auth] Leyendo perfil actual:', {
      hasAuthUser: !!user,
      uid: user?.uid ?? null,
      email: user?.email ?? null,
    });

    if (!user) {
      console.warn('[RespawnHQ Auth] No hay usuario autenticado en Firebase Auth.');
      return null;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      console.info(`[RespawnHQ Firestore] getDoc users/${user.uid}`);
      const snap = await getDoc(userDocRef);

      if (!snap.exists()) {
        console.warn(`[RespawnHQ Firestore] No existe el documento users/${user.uid}.`);
        return null;
      }

      const userData = { id: snap.id, ...snap.data() } as User;
      console.info('[RespawnHQ Firestore] Perfil cargado:', userData);
      return userData;
    } catch (error) {
      console.error('[RespawnHQ Firestore] Error leyendo el perfil actual:', error);
      throw error;
    }
  }

  async isAdmin(): Promise<boolean> {
    const userData = await this.getCurrentUserData();
    return userData?.rol === 'admin';
  }
}
