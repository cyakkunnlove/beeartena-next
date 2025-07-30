// Queue key management with app prefix
export class QueueKeys {
  private static appPrefix = process.env.REDIS_KEY_PREFIX || 'beeartena'

  static get pending() {
    return `${this.appPrefix}:queue:pending`
  }

  static get processing() {
    return `${this.appPrefix}:queue:processing`
  }

  static get completed() {
    return `${this.appPrefix}:queue:completed`
  }

  static get failed() {
    return `${this.appPrefix}:queue:failed`
  }

  static get delayed() {
    return `${this.appPrefix}:queue:delayed`
  }

  static job(jobId: string) {
    return `${this.appPrefix}:job:${jobId}`
  }
}