import { NextRequest } from 'next/server'
import { z } from 'zod'

import { cache, Cache } from '@/lib/api/cache'
import { queue } from '@/lib/api/queue'
import { createApiHandler, apiSuccess, apiError, paginate } from '@/lib/api/v1/base'
import { webhookService } from '@/lib/api/webhook'
import { reservationService } from '@/lib/reservationService'

// Validation schemas
const createReservationSchema = z.object({
  serviceId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
})

const querySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
})

const handler = createApiHandler(
  {
    // GET /api/v1/reservations
    GET: async (req: NextRequest) => {
      const query = (req as any).validatedQuery || {}
      const page = query.page || 1
      const limit = query.limit || 20
      const user = (req as any).user

      // Build cache key
      const cacheKey = Cache.generateKey(
        'reservations',
        user.role === 'admin' ? 'all' : user.userId,
        query,
      )

      // Try cache first
      const cached = (await cache.get(cacheKey)) as any
      if (cached && cached.items) {
        const meta = cached.pagination ? { pagination: cached.pagination } : undefined
        return apiSuccess(cached.items, meta as any)
      }

      // Fetch reservations
      let reservations
      if (user.role === 'admin') {
        reservations = await reservationService.getAllReservations()
      } else {
        reservations = await reservationService.getUserReservations(user.userId)
      }

      // Apply filters
      if (query.status) {
        reservations = reservations.filter((r) => r.status === query.status)
      }
      if (query.date) {
        reservations = reservations.filter((r) => r.date === query.date)
      }

      // Paginate
      const paginated = paginate(reservations, page, limit)

      // Cache results
      await cache.set(cacheKey, paginated, 300, { tags: ['reservations'] })

      return apiSuccess(paginated.items, { pagination: paginated.pagination } as any)
    },

    // POST /api/v1/reservations
    POST: async (req: NextRequest) => {
      const body = (req as any).validatedBody
      const user = (req as any).user

      // Check available slots
      const slots = await reservationService.getTimeSlotsForDate(body.date)
      const selectedSlot = slots.find((slot) => slot.time === body.time)

      if (!selectedSlot || !selectedSlot.available) {
        return apiError('SLOT_UNAVAILABLE', '選択された時間枠は予約できません', 400)
      }

      // Map service ID to type
      const serviceTypeMap: Record<string, '2D' | '3D' | '4D'> = {
        '2d-eyelash': '2D',
        '3d-eyelash': '3D',
        '4d-eyelash': '4D',
      }

      const serviceType = serviceTypeMap[body.serviceId]
      if (!serviceType) {
        return apiError('INVALID_SERVICE', '無効なサービスIDです', 400)
      }

      // Get service details from cache or database
      const serviceDetails =
        (await cache.get<{ name: string; price: number }>(`service:${body.serviceId}`)) ?? {
        name: `${serviceType}まつ毛エクステ`,
        price: serviceType === '2D' ? 6000 : serviceType === '3D' ? 8000 : 10000,
      }

      // Create reservation
      const reservation = await reservationService.createReservation({
        serviceType,
        serviceName: serviceDetails.name,
        price: serviceDetails.price,
        date: body.date,
        time: body.time,
        customerId: user.userId,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        notes: body.notes,
        status: 'pending',
        updatedAt: new Date(),
      })

      // Invalidate cache
      await cache.invalidateByTag('reservations')

      // Send webhook
      await webhookService.sendReservationCreated(reservation)

      // Queue confirmation email
      await queue.add('send_email', {
        to: user.email,
        subject: '予約確認',
        template: 'reservation_confirmation',
        data: { reservation, user },
      })

      // Queue reminder (24 hours before)
      const reminderDate = new Date(`${body.date} ${body.time}`)
      reminderDate.setDate(reminderDate.getDate() - 1)

      await queue.add(
        'send_reminder',
        {
          reservationId: reservation.id,
          userId: user.userId,
        },
        {
          delay: reminderDate.getTime() - Date.now(),
        },
      )

      return apiSuccess(reservation)
    },
  },
  {
    auth: true,
    rateLimit: { limit: 100, window: 60 },
    validation: {
      query: querySchema,
      body: createReservationSchema,
    },
    cache: {
      ttl: 300,
      key: (req) => {
        const { searchParams } = new URL(req.url)
        return `reservations:${searchParams.toString()}`
      },
    },
  },
)

export const GET = handler
export const POST = handler
