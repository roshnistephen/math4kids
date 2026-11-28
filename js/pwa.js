/* Registers the offline service worker and exposes an "Install app" helper. */
(function () {
    'use strict';
    window.RK = window.RK || {};
    let deferred = null;
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ }); });
    }
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; document.dispatchEvent(new Event('pwa-can-install')); });
    window.addEventListener('appinstalled', () => { deferred = null; document.dispatchEvent(new Event('pwa-installed')); });
    const standalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true || /android-app:\/\//.test(document.referrer);
    RK.pwa = {
        get canInstall() { return !!deferred && !standalone(); },
        get standalone() { return standalone(); },
        install() { if (!deferred) return Promise.resolve(false); deferred.prompt(); return deferred.userChoice.then(r => { deferred = null; return r.outcome === 'accepted'; }); }
    };
})();
