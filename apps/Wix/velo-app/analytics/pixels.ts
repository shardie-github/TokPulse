/* TokPulse — © Hardonia. MIT. */
// Basic pixel parity (set IDs in Secrets Manager or site settings)
export function initPixels({ tiktokPixelId = '', metaPixelId = '', ga4Id = '' } = {}) {
  if (tiktokPixelId) {
    // TikTok base
    (function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      const tt = (w[t] = w[t] || []);
      tt.methods = ['page', 'track', 'identify'];
      tt.setAndDefer = function (t, e) {
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (let i = 0; i < tt.methods.length; i++) tt.setAndDefer(tt, tt.methods[i]);
      tt.load = function (e) {
        const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        const n = d.createElement('script');
        ((n.async = !0), (n.src = i + '?sdkid=' + e + '&lib=' + t));
        const a = d.getElementsByTagName('script')[0];
        a.parentNode.insertBefore(n, a);
      };
      tt.load(tiktokPixelId);
      tt.page();
    })(window, document, 'ttq');
  }
  if (metaPixelId) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', metaPixelId);
    window.fbq('track', 'PageView');
  }
  if (ga4Id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga4Id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', ga4Id);
  }
}
