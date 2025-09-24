import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'

const defaultSettings = {
  businessHours: [
    { dayOfWeek: 0, isOpen: false, open: '', close: '' },
    { dayOfWeek: 1, isOpen: true, open: '10:00', close: '19:00' },
    { dayOfWeek: 2, isOpen: true, open: '10:00', close: '19:00' },
    { dayOfWeek: 3, isOpen: true, open: '10:00', close: '19:00' },
    { dayOfWeek: 4, isOpen: true, open: '10:00', close: '19:00' },
    { dayOfWeek: 5, isOpen: true, open: '10:00', close: '19:00' },
    { dayOfWeek: 6, isOpen: true, open: '10:00', close: '17:00' },
  ],
  slotDuration: 120,
  bufferTime: 30,
  maxAdvanceBookingDays: 60,
  minAdvanceBookingHours: 24,
}

export async function GET(_request: NextRequest) {
  try {
    const db = getAdminDb()

    if (!db) {
      return NextResponse.json({
        ...defaultSettings,
        warning: 'Firebase admin is not configured; returning default settings.',
      })
    }

    const settingsDoc = await db.collection('settings').doc('reservation').get()

    if (!settingsDoc.exists) {
      return NextResponse.json(defaultSettings)
    }

    const settings = settingsDoc.data()
    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({
      ...defaultSettings,
      warning: 'Failed to fetch settings from Firestore; returning default configuration.',
    })
  }
}
