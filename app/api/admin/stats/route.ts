import { NextRequest, NextResponse } from 'next/server'

import { getAdminDb } from '@/lib/firebase/admin'
import { requireAdmin, setCorsHeaders } from '@/lib/api/middleware'

import type { Inquiry, Reservation } from '@/lib/types'

interface CustomerDoc {
  role?: string
}

const formatTodayIso = () => new Date().toISOString().split('T')[0]

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return setCorsHeaders(adminError)
  }

  try {
    const db = getAdminDb()

    if (!db) {
      return setCorsHeaders(
        NextResponse.json(
          {
            error: 'Firebase admin is not configured. Please set FIREBASE_ADMIN_* env vars.',
          },
          { status: 503 },
        ),
      )
    }

    const [usersSnapshot, reservationsSnapshot, inquiriesSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('reservations').get(),
      db.collection('inquiries').get(),
    ])

    const customers = usersSnapshot.docs.filter((doc) => {
      const data = doc.data() as CustomerDoc
      return !data.role || data.role === 'customer'
    })

    const reservations = reservationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reservation[]

    const inquiries = inquiriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Inquiry[]

    const todayIso = formatTodayIso()
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)

    const activeCustomerIds = new Set(
      reservations
        .filter((reservation) => {
          if (!reservation.date) return false
          const reservationDate = new Date(reservation.date)
          return !Number.isNaN(reservationDate.getTime()) && reservationDate >= thirtyDaysAgo
        })
        .map((reservation) => reservation.customerId)
        .filter((customerId): customerId is string => Boolean(customerId)),
    )

    const todayReservations = reservations.filter((reservation) => reservation.date === todayIso)
    const pendingReservations = reservations.filter((reservation) => reservation.status === 'pending')

    const sumAmount = (reservation: Reservation) => {
      const baseAmount = reservation.totalPrice ?? reservation.price ?? 0
      const finalAmount = reservation.finalPrice ?? baseAmount
      return finalAmount
    }

    const monthlyRevenue = reservations
      .filter((reservation) => {
        if (!reservation.date) return false
        const date = new Date(reservation.date)
        return (
          !Number.isNaN(date.getTime()) &&
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear &&
          reservation.status !== 'cancelled'
        )
      })
      .reduce((total, reservation) => total + sumAmount(reservation), 0)

    const totalRevenue = reservations
      .filter((reservation) => reservation.status !== 'cancelled')
      .reduce((total, reservation) => total + sumAmount(reservation), 0)

    const unreadInquiries = inquiries.filter((inquiry) => inquiry.status === 'unread')

    return setCorsHeaders(
      NextResponse.json({
        stats: {
          totalCustomers: customers.length,
          totalReservations: reservations.length,
          pendingReservations: pendingReservations.length,
          totalRevenue,
          todayReservations: todayReservations.length,
          monthlyRevenue,
          unreadInquiries: unreadInquiries.length,
          activeCustomers: activeCustomerIds.size,
        },
      }),
    )
  } catch (error) {
    console.error('Admin stats error:', error)
    return setCorsHeaders(
      NextResponse.json({ error: 'Failed to load admin statistics.' }, { status: 500 }),
    )
  }
}
