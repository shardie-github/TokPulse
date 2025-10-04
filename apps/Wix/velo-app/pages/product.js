/* TokPulse — © Hardonia. MIT. */
import { initPixels } from '../analytics/pixels.js';

$w.onReady(function () {
  // Example: initialize with site settings or Wix Secrets
  initPixels({ tiktokPixelId: '', metaPixelId: '', ga4Id: '' });
});
