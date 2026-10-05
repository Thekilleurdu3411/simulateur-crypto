// Notifications du téléphone : préviennent quand l'appli est en arrière-plan (ordre exécuté, liquidation,
// panne, livraison, salaire…). Sans serveur, rien ne peut être envoyé quand l'appli est complètement fermée.
const CLE = 'simcrypto.notifs';

export function disponibles() { return typeof window !== 'undefined' && 'Notification' in window; }
export function actives() {
  try { return disponibles() && Notification.permission === 'granted' && localStorage.getItem(CLE) === '1'; } catch (e) { return false; }
}
export function permission() { return disponibles() ? Notification.permission : 'indisponible'; }

export async function activer() {
  if (!disponibles()) return 'indisponible';
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  try { localStorage.setItem(CLE, p === 'granted' ? '1' : '0'); } catch (e) {}
  return p;
}
export function desactiver() { try { localStorage.setItem(CLE, '0'); } catch (e) {} }

/** Affiche une notification si l'appli n'est pas à l'écran. */
export async function notifier(texte, tag = 'jeu') {
  if (!actives() || document.visibilityState === 'visible') return false;
  const options = { body: texte, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag, renotify: true };
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) await reg.showNotification('Simulateur crypto', options);
    else new Notification('Simulateur crypto', options);
    return true;
  } catch (e) { return false; }
}
