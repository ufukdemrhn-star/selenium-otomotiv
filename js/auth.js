// Kullanıcı yönetimi — giriş, çıkış, oturum durumu
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { auth } from "./firebase.js";
import { USER_DOMAIN } from "./firebase-config.js";

/**
 * Kullanıcı adını @selenium.local'lı maile çevir
 * "raven" → "raven@selenium.local"
 */
function usernameToEmail(username) {
  return username.toLowerCase().trim() + USER_DOMAIN;
}

/**
 * Maili kullanıcı adına çevir (ekranda göstermek için)
 * "raven@selenium.local" → "raven"
 */
export function emailToUsername(email) {
  if (!email) return '';
  return email.split('@')[0];
}

/**
 * Kullanıcı adı + şifre ile giriş
 */
export async function login(username, password) {
  const email = usernameToEmail(username);
  return await signInWithEmailAndPassword(auth, email, password);
}

/**
 * Çıkış
 */
export async function logout() {
  return await signOut(auth);
}

/**
 * Oturum değişimi dinleyicisi
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Şu anki kullanıcı (yoksa null)
 */
export function getCurrentUser() {
  return auth.currentUser;
}
