// Notifications du téléphone : préviennent quand l'appli est en arrière-plan (ordre exécuté, liquidation,
// panne, livraison, salaire…). Dans l'appli Android, elles passent par les notifications natives.
// Sans serveur, rien ne peut être envoyé quand l'appli est complètement fermée.
const CLE = 'simcrypto.notifs';

/** Plugin natif de l'appli Android (Capacitor), absent dans le navigateur. */
export function natif(nom) {
  const C = typeof window !== 'undefined' && window.Capacitor;
  return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins[nom] ? C.Plugins[nom] : null;
}
const LN = () => natif('LocalNotifications');

export function disponibles() { return !!LN() || (typeof window !== 'undefined' && 'Notification' in window); }
export function actives() {
  try {
    if (localStorage.getItem(CLE) !== '1') return false;
    return !!LN() || (disponibles() && Notification.permission === 'granted');
  } catch (e) { return false; }
}
export function permission() { return LN() ? 'natif' : disponibles() ? Notification.permission : 'indisponible'; }

export async function activer() {
  let p = 'indisponible';
  if (LN()) {
    try { const r = await LN().requestPermissions(); p = r && r.display === 'granted' ? 'granted' : 'denied'; } catch (e) { p = 'denied'; }
  } else if (disponibles()) {
    p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  }
  try { localStorage.setItem(CLE, p === 'granted' ? '1' : '0'); } catch (e) {}
  return p;
}
export function desactiver() { try { localStorage.setItem(CLE, '0'); } catch (e) {} }

let compteur = 1;
/** Affiche une notification si l'appli n'est pas à l'écran. */
export async function notifier(texte, tag = 'jeu') {
  if (!actives() || document.visibilityState === 'visible') return false;
  try {
    if (LN()) {
      await LN().schedule({ notifications: [{ id: (Date.now() % 1e6) * 10 + (compteur++ % 10), title: 'Proof of Life', body: texte }] });
      return true;
    }
    const options = { body: texte, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag, renotify: true };
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) await reg.showNotification('Proof of Life', options);
    else new Notification('Proof of Life', options);
    return true;
  } catch (e) { return false; }
}
