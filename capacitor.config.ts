import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell configuration.
 *
 * Sahn is server-rendered with API routes, SSR city pages and cookie-based
 * auth, so there is no static export to bundle. The shell loads the live site
 * instead, which means one codebase and no second interface to keep in step.
 *
 * `webDir` still has to exist: it holds the offline fallback the webview shows
 * when the app is opened with no connection, so a cold start on a plane is a
 * branded screen rather than a white one.
 *
 * The app earns its place on a store through capability the web cannot give
 * it - scheduled prayer notifications computed on the device - not through
 * being a browser in a box. See src/lib/native/notifications.ts.
 */
const config: CapacitorConfig = {
  // No hyphens: Android package names forbid them, so this cannot mirror the
  // domain exactly.
  appId: 'com.sahnai.app',
  appName: 'Sahn',
  webDir: 'native/shell',

  server: {
    url: 'https://sahn-ai.com',
    androidScheme: 'https',
    // Nothing is served over plain HTTP, including in development.
    cleartext: false
  },

  ios: {
    contentInset: 'always',
    backgroundColor: '#10202B'
  },

  android: {
    backgroundColor: '#10202B'
  },

  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_sahn',
      iconColor: '#1F6F6B'
    }
  }
};

export default config;
