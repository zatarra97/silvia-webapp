/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Iniettata da Vite (`define` in vite.config.js) leggendo package.json
declare const __APP_VERSION__: string
