// Server-side only module
// Next.jsのクライアントバンドルに混入するのを防ぐため、ブラウザでは例外にする
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  throw new Error('This module is server-side only')
}

export { cache, Cache } from './cache.server'

