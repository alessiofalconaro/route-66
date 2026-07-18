/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Declares our custom build-time env variable so TypeScript knows its type.
interface ImportMetaEnv {
  /** URL of the Cloudflare Worker chat proxy (NOT a secret). Optional. */
  readonly VITE_CHAT_ENDPOINT?: string;
}
