import { NextRequest, NextResponse } from 'next/server'

// API v1 root endpoint
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      version: 'v1',
      name: 'BEE ART ENA API',
      description: 'まつ毛エクステサロン BEE ART ENA の予約・顧客管理API',
      documentation: '/api/v1/docs',
      endpoints: {
        auth: {
          register: 'POST /api/v1/auth/register',
          login: 'POST /api/v1/auth/login',
          logout: 'POST /api/v1/auth/logout',
          me: 'GET /api/v1/auth/me',
        },
        users: {
          list: 'GET /api/v1/users',
          get: 'GET /api/v1/users/:id',
          update: 'PATCH /api/v1/users/:id',
          delete: 'DELETE /api/v1/users/:id',
        },
        reservations: {
          list: 'GET /api/v1/reservations',
          create: 'POST /api/v1/reservations',
          get: 'GET /api/v1/reservations/:id',
          update: 'PATCH /api/v1/reservations/:id',
          cancel: 'POST /api/v1/reservations/:id/cancel',
          slots: 'GET /api/v1/reservations/slots',
        },
        points: {
          balance: 'GET /api/v1/points/balance',
          transactions: 'GET /api/v1/points/transactions',
          use: 'POST /api/v1/points/use',
        },
        inquiries: {
          list: 'GET /api/v1/inquiries',
          create: 'POST /api/v1/inquiries',
          get: 'GET /api/v1/inquiries/:id',
          reply: 'POST /api/v1/inquiries/:id/reply',
        },
        webhooks: {
          list: 'GET /api/v1/webhooks',
          create: 'POST /api/v1/webhooks',
          get: 'GET /api/v1/webhooks/:id',
          update: 'PATCH /api/v1/webhooks/:id',
          delete: 'DELETE /api/v1/webhooks/:id',
          test: 'POST /api/v1/webhooks/:id/test',
        },
      },
      rateLimit: {
        default: '100 requests per minute',
        authenticated: '1000 requests per minute',
      },
      timestamp: new Date().toISOString(),
    },
  })
}
