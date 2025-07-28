import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 50 },  // Scale down to 50 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],             // Custom error rate
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Helper function to get auth token
function getAuthToken() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
  
  if (loginRes.status === 200) {
    return loginRes.json('token')
  }
  return null
}

export default function () {
  // Scenario 1: Homepage load
  const homeRes = http.get(`${BASE_URL}/`)
  check(homeRes, {
    'homepage loaded': (r) => r.status === 200,
    'homepage fast': (r) => r.timings.duration < 300,
  })
  errorRate.add(homeRes.status !== 200)
  
  sleep(1)
  
  // Scenario 2: Browse services
  const servicesRes = http.get(`${BASE_URL}/services`)
  check(servicesRes, {
    'services loaded': (r) => r.status === 200,
  })
  
  sleep(2)
  
  // Scenario 3: Authentication flow
  const token = getAuthToken()
  check(token, {
    'login successful': (t) => t !== null,
  })
  
  if (token) {
    // Scenario 4: Make reservation (authenticated)
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
    
    // Get available slots
    const slotsRes = http.get(`${BASE_URL}/api/reservations/slots?date=2024-01-20`, { headers })
    check(slotsRes, {
      'slots loaded': (r) => r.status === 200,
      'slots response fast': (r) => r.timings.duration < 200,
    })
    
    sleep(1)
    
    // Create reservation
    const reservationData = {
      date: '2024-01-20',
      time: '14:00',
      service: 'カット',
    }
    
    const reservationRes = http.post(
      `${BASE_URL}/api/reservations`,
      JSON.stringify(reservationData),
      { headers }
    )
    
    check(reservationRes, {
      'reservation created': (r) => r.status === 201 || r.status === 409, // 409 if slot taken
      'reservation fast': (r) => r.timings.duration < 500,
    })
    
    // Get user reservations
    const myReservationsRes = http.get(`${BASE_URL}/api/reservations`, { headers })
    check(myReservationsRes, {
      'user reservations loaded': (r) => r.status === 200,
    })
  }
  
  sleep(2)
  
  // Scenario 5: Static assets
  const cssRes = http.get(`${BASE_URL}/_next/static/css/app.css`)
  check(cssRes, {
    'CSS cached': (r) => r.status === 200 || r.status === 304,
  })
  
  // Scenario 6: API health check
  const healthRes = http.get(`${BASE_URL}/api/health`)
  check(healthRes, {
    'API healthy': (r) => r.status === 200,
    'API response time ok': (r) => r.timings.duration < 100,
  })
}

// Lifecycle hooks
export function setup() {
  // Setup code - create test data if needed
  console.log('Setting up performance test...')
}

export function teardown(data) {
  // Cleanup code
  console.log('Cleaning up performance test...')
}

// Custom scenario for stress testing specific endpoints
export function stressTestReservations() {
  const token = getAuthToken()
  if (!token) return
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
  
  // Rapid fire slot checks
  for (let i = 0; i < 10; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    const res = http.get(`${BASE_URL}/api/reservations/slots?date=${dateStr}`, { headers })
    check(res, {
      'slot check successful': (r) => r.status === 200,
    })
  }
}