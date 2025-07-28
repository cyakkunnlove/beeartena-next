import { createHmac } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { queue, JobTypes } from './queue'

export interface WebhookEvent {
  id: string
  type: string
  data: any
  timestamp: string
  version: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  eventId: string
  url: string
  status: 'pending' | 'success' | 'failed'
  attempts: number
  responseStatus?: number
  responseBody?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

// Webhook event types
export const WebhookEvents = {
  // Reservation events
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_UPDATED: 'reservation.updated',
  RESERVATION_CANCELLED: 'reservation.cancelled',
  RESERVATION_COMPLETED: 'reservation.completed',
  RESERVATION_REMINDER: 'reservation.reminder',

  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',

  // Points events
  POINTS_EARNED: 'points.earned',
  POINTS_USED: 'points.used',
  POINTS_EXPIRED: 'points.expired',
  TIER_CHANGED: 'tier.changed',

  // Inquiry events
  INQUIRY_CREATED: 'inquiry.created',
  INQUIRY_REPLIED: 'inquiry.replied',
} as const

class WebhookService {
  // Send webhook event
  async send(eventType: string, data: any): Promise<void> {
    // Create event
    const event: WebhookEvent = {
      id: uuidv4(),
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      version: 'v1',
    }

    // Get active webhooks for this event type
    const webhooks = await this.getWebhooksForEvent(eventType)

    // Queue delivery for each webhook
    for (const webhook of webhooks) {
      await queue.add(JobTypes.PROCESS_WEBHOOK, {
        webhookId: webhook.id,
        event,
        url: webhook.url,
        secret: webhook.secret,
      })
    }
  }

  // Process webhook delivery (called by queue)
  async processWebhookDelivery(job: any): Promise<void> {
    const { webhookId, event, url, secret } = job.data

    const delivery: WebhookDelivery = {
      id: uuidv4(),
      webhookId,
      eventId: event.id,
      url,
      status: 'pending',
      attempts: job.attempts,
      createdAt: new Date(),
    }

    try {
      // Generate signature
      const signature = this.generateSignature(event, secret)

      // Send webhook
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.type,
          'X-Webhook-ID': event.id,
          'X-Webhook-Timestamp': event.timestamp,
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      delivery.responseStatus = response.status
      delivery.responseBody = await response.text()

      if (response.ok) {
        delivery.status = 'success'
        delivery.completedAt = new Date()
      } else {
        throw new Error(`HTTP ${response.status}: ${delivery.responseBody}`)
      }
    } catch (error) {
      delivery.status = 'failed'
      delivery.error = error instanceof Error ? error.message : 'Unknown error'
      throw error // Re-throw to trigger retry
    } finally {
      // Store delivery record
      await this.storeDelivery(delivery)
    }
  }

  // Generate webhook signature
  private generateSignature(event: WebhookEvent, secret: string): string {
    const payload = JSON.stringify(event)
    const hmac = createHmac('sha256', secret)
    hmac.update(payload)
    return `sha256=${hmac.digest('hex')}`
  }

  // Verify webhook signature (for incoming webhooks)
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(JSON.parse(payload), secret)
    return signature === expectedSignature
  }

  // Get webhooks for specific event type
  private async getWebhooksForEvent(eventType: string): Promise<Webhook[]> {
    // This would query your database
    // For now, returning mock data
    return []
  }

  // Store webhook delivery record
  private async storeDelivery(delivery: WebhookDelivery): Promise<void> {
    // This would store in your database
    console.log('Webhook delivery:', delivery)
  }

  // Create a new webhook
  async createWebhook(data: { url: string; events: string[]; metadata?: any }): Promise<Webhook> {
    const webhook: Webhook = {
      id: uuidv4(),
      url: data.url,
      events: data.events,
      secret: this.generateSecret(),
      active: true,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Store in database
    // await db.collection('webhooks').add(webhook);

    return webhook
  }

  // Update webhook
  async updateWebhook(
    id: string,
    updates: Partial<Omit<Webhook, 'id' | 'secret' | 'createdAt'>>,
  ): Promise<Webhook> {
    // Update in database
    const webhook = await this.getWebhook(id)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    const updated = {
      ...webhook,
      ...updates,
      updatedAt: new Date(),
    }

    // await db.collection('webhooks').doc(id).update(updated);

    return updated
  }

  // Delete webhook
  async deleteWebhook(id: string): Promise<void> {
    // Delete from database
    // await db.collection('webhooks').doc(id).delete();
  }

  // Get webhook by ID
  async getWebhook(id: string): Promise<Webhook | null> {
    // Query database
    return null
  }

  // Test webhook
  async testWebhook(id: string): Promise<void> {
    const webhook = await this.getWebhook(id)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    // Send test event
    await this.send('webhook.test', {
      message: 'This is a test webhook event',
      webhookId: id,
    })
  }

  // Generate webhook secret
  private generateSecret(): string {
    return `whsec_${uuidv4().replace(/-/g, '')}`
  }

  // Webhook event helpers
  async sendReservationCreated(reservation: any): Promise<void> {
    await this.send(WebhookEvents.RESERVATION_CREATED, { reservation })
  }

  async sendReservationCancelled(reservation: any): Promise<void> {
    await this.send(WebhookEvents.RESERVATION_CANCELLED, { reservation })
  }

  async sendPointsEarned(userId: string, points: number, reason: string): Promise<void> {
    await this.send(WebhookEvents.POINTS_EARNED, { userId, points, reason })
  }

  async sendTierChanged(userId: string, oldTier: string, newTier: string): Promise<void> {
    await this.send(WebhookEvents.TIER_CHANGED, { userId, oldTier, newTier })
  }
}

// Export singleton instance
export const webhookService = new WebhookService()

// Register webhook processor with queue
queue.register(JobTypes.PROCESS_WEBHOOK, async (job) => {
  await webhookService.processWebhookDelivery(job)
})
