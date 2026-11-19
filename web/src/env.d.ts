/// <reference types="vite/client" />

// 由 web/vite.config.ts 从根 package.json 注入
declare const __APP_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
