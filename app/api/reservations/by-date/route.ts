import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { cache as cacheService } from '@/lib/api/cache'

// Define types locally since we are in server environment and might not have access to client types easily
// or to avoid circular dependencies.
interface BusinessHours {
  dayOfWeek: number
  open: string
  close: string
  isOpen: boolean
  allowMultipleSlots?: boolean
  slotInterval?: number
  maxCapacityPerDay?: number
}

interface ReservationSettings {
  slotDuration: number
  maxCapacityPerSlot: number
  businessHours: BusinessHours[]
  blockedDates: string[]
  cancellationDeadlineHours: number
}

// Default settings as fallback
const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  { dayOfWeek: 0, open: '', close: '', isOpen: false, maxCapacityPerDay: 1 }, // Sunday Closed
  { dayOfWeek: 1, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 2, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 3, open: '09:00', close: '17:00', isOpen: true, maxCapacityPerDay: 10 }, // Wednesday
  { dayOfWeek: 4, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 5, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
  { dayOfWeek: 6, open: '18:30', close: '20:30', isOpen: true, maxCapacityPerDay: 1 },
]

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    // reload parameter can be used to bypass cache if implemented, currently just for client side cache busting
    const reload = searchParams.get('reload')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Attempt to get from cache (Short TTL: 2 minutes to reflect settings changes faster)
    const cacheKey = `slots:${date}`
    if (!reload) {
        const cached = await cacheService.get(cacheKey)
        if (cached) {
            return NextResponse.json({ timeSlots: cached, cached: true })
        }
    }

    const db = getAdminDb()
    if (!db) {
      console.warn('Firebase admin not configured; returning empty slots.')
      return NextResponse.json({ timeSlots: [] })
    }

    // 1. Fetch Settings
    let settings: ReservationSettings = {
        slotDuration: 120,
        maxCapacityPerSlot: 1,
        businessHours: DEFAULT_BUSINESS_HOURS,
        blockedDates: [],
        cancellationDeadlineHours: 72
    }

    try {
        const settingsDoc = await db.collection('settings').doc('reservation-settings').get()
        if (settingsDoc.exists) {
            const data = settingsDoc.data()
            if (data) {
                 settings = {
                    ...settings,
                    ...data,
                    // Ensure businessHours is merged correctly if partial
                    businessHours: (data.businessHours || DEFAULT_BUSINESS_HOURS).map((h: any) => ({
                        ...h,
                        allowMultipleSlots: !!h.allowMultipleSlots,
                        slotInterval: Number(h.slotInterval) || 30,
                        maxCapacityPerDay: Number(h.maxCapacityPerDay) || 1
                    }))
                 }
            }
        }
    } catch (e) {
        console.error('Failed to fetch settings:', e)
        // Fallback to defaults is already handled by initialization
    }

    // 2. Check Blocked Dates
    if (settings.blockedDates.includes(date)) {
         // Return empty slots for blocked dates
         await cacheService.set(cacheKey, [], 120) // Cache for 2 mins
         return NextResponse.json({ timeSlots: [] })
    }

    // 3. Fetch Existing Reservations
    const reservedTimesMap = new Map<string, number>() // time -> count
    const reservationsSnapshot = await db
        .collection('reservations')
        .where('date', '==', date)
        .where('status', 'in', ['pending', 'confirmed'])
        .get()

    reservationsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        if (data.time) {
            const currentCount = reservedTimesMap.get(data.time) || 0
            reservedTimesMap.set(data.time, currentCount + 1)
        }
    })

    // 4. Generate Slots based on Business Hours
    const now = new Date()
    const [year, month, day] = date.split('-').map(Number)
    const selectedDate = new Date(year, month - 1, day)
    const dayOfWeek = selectedDate.getDay() // 0 = Sunday

    const hours = settings.businessHours.find(h => h.dayOfWeek === dayOfWeek)

    if (!hours || !hours.isOpen || !hours.open || !hours.close) {
        // Closed on this day
        await cacheService.set(cacheKey, [], 120)
        return NextResponse.json({ timeSlots: [] })
    }

    const slots: { time: string, available: boolean }[] = []

    // Parse times
    const [openHour, openMinute] = hours.open.split(':').map(Number)
    const [closeHour, closeMinute] = hours.close.split(':').map(Number)

    let currentHour = openHour
    let currentMinute = openMinute

    const interval = (hours.allowMultipleSlots && hours.slotInterval) ? hours.slotInterval : settings.slotDuration
    // If multiple slots are not allowed, we generally might want just one slot or specific logic.
    // The previous logic for weeknights was "18:30, 19:00, 19:30". This corresponds to 30 min interval.
    // However, maxCapacityPerDay applies.

    // If allowMultipleSlots is false, it might mean "Specific fixed slots" or "Only one booking per day".
    // The previous implementation had fixed arrays.
    // Let's assume the Admin settings "Slot Interval" drives the generation,
    // and "Max Capacity" drives the availability.

    // Actually, "allowMultipleSlots" in the legacy logic meant "Can have many slots in the day" (like Wed).
    // If it was false, it was restricted.
    // But now with dynamic settings, we should respect open/close and interval.
    // If allowMultipleSlots is OFF, usually it means just one slot? Or maybe the legacy "Fixed Time" logic?
    // Let's look at `lib/reservationService.ts` for how it handles it.
    // It seems `reservationService.getTimeSlotsForDate` does:
    // if allowMultipleSlots -> interval = slotInterval
    // else -> interval = min(baseDuration, 60) -> essentially generates few slots.

    // Let's stick to generating slots from Open to Close with Interval.

    // Loop to generate slots
    while (true) {
        // Break if we passed closing time
        // Calculate end time of this slot? Or just start time?
        // Usually slots are "Start Times".
        // If close time is 20:30, last slot depends on duration.
        // Assuming slots cannot exceed close time.

        // Simple comparison: current time must be < close time
        if (currentHour > closeHour || (currentHour === closeHour && currentMinute >= closeMinute)) {
            break
        }

        // Format time
        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

        // Determine max capacity for this slot
        // If "allowMultipleSlots" is true, we use "maxCapacityPerSlot" (global setting) or per day?
        // The Admin UI has "Max Capacity" per day setting row. `maxCapacityPerDay`
        // But also global `maxCapacityPerSlot`.
        // If `allowMultipleSlots` is TRUE (like Wed), usually `maxCapacityPerSlot` (simultaneous people) matters.
        // If `allowMultipleSlots` is FALSE (like Mon), usually `maxCapacityPerDay` (total people per day) matters.

        // Let's look at `reservationService.ts`:
        // It uses `this.settings.maxCapacityPerSlot || 1` as capacity for checking specific slot availability.
        // But it doesn't seem to check `maxCapacityPerDay` in `getTimeSlotsForDate`.
        // However, the `DEFAULT_BUSINESS_HOURS` has `maxCapacityPerDay: 1` for Mon-Fri.
        // If `maxCapacityPerDay` is 1, then if ANY reservation exists for that day, NO slots should be available.

        // Let's check total reservations for the day
        const totalReservationsCount = Array.from(reservedTimesMap.values()).reduce((a, b) => a + b, 0)

        let isAvailable = true

        // Check Day Capacity
        if (totalReservationsCount >= (hours.maxCapacityPerDay || 1)) {
            isAvailable = false
        }

        // Check Slot Capacity
        const currentSlotCount = reservedTimesMap.get(timeStr) || 0
        if (currentSlotCount >= settings.maxCapacityPerSlot) {
            isAvailable = false
        }

        // Check Past Time (if today)
        if (selectedDate.toDateString() === now.toDateString()) {
             const slotTime = new Date(selectedDate)
             slotTime.setHours(currentHour, currentMinute, 0, 0)
             if (slotTime.getTime() <= now.getTime()) {
                 isAvailable = false
             }
        }

        slots.push({
            time: timeStr,
            available: isAvailable
        })

        // Increment time
        const nextTimeInMinutes = currentHour * 60 + currentMinute + (hours.slotInterval || 30) // Default 30 if undefined
        currentHour = Math.floor(nextTimeInMinutes / 60)
        currentMinute = nextTimeInMinutes % 60
    }

    // Cache the result (2 minutes)
    await cacheService.set(cacheKey, slots, 120)

    return NextResponse.json({ timeSlots: slots })
  } catch (error: any) {
    console.error('Failed to fetch reservations by date:', error)
    return NextResponse.json(
      { timeSlots: [] },
      { status: 200 }
    )
  }
}
