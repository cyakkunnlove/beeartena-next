import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const loginDuration = new Trend('login_duration')
const reservationDuration = new Trend('reservation_duration')
const errorRate = new Rate('errors')

// Load test configuration
export const options = {
  scenarios: {
    // Constant load scenario
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
    // Spike test scenario
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 200 }, // Spike
        { duration: '30s', target: 200 },
        { duration: '10s', target: 100 }, // Recovery
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '5m', // Start after constant load
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<1000'], // 99% of requests must complete below 1s
    login_duration: ['p(95)<800'],     // 95% of logins must complete below 800ms
    reservation_duration: ['p(95)<1200'], // 95% of reservations below 1.2s
    errors: ['rate<0.05'],             // Error rate must be below 5%
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// User behavior simulation
class VirtualUser {
  constructor() {
    this.token = null
    this.userId = `user_${__VU}_${Date.now()}`
  }

  login() {
    const start = new Date()
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: `test${__VU}@example.com`,
      password: 'password123',
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    })
    
    loginDuration.add(new Date() - start)
    
    const success = check(res, {
      'login successful': (r) => r.status === 200,
    })
    
    if (success && res.json('token')) {
      this.token = res.json('token')
    }
    
    errorRate.add(!success)
    return success
  }

  browseServices() {
    group('browse_services', () => {
      // View services page
      const servicesRes = http.get(`${BASE_URL}/services`, {
        tags: { name: 'view_services' },
      })
      
      check(servicesRes, {
        'services page loaded': (r) => r.status === 200,
      })
      
      sleep(2) // Simulate reading time
      
      // View service details
      const detailsRes = http.get(`${BASE_URL}/services/cut`, {
        tags: { name: 'view_service_details' },
      })
      
      check(detailsRes, {
        'service details loaded': (r) => r.status === 200,
      })
      
      sleep(1)
    })
  }

  makeReservation() {
    if (!this.token) return false
    
    const start = new Date()
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    }
    
    group('make_reservation', () => {
      // Check available slots
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]
      
      const slotsRes = http.get(`${BASE_URL}/api/reservations/slots?date=${dateStr}`, {
        headers,
        tags: { name: 'check_slots' },
      })
      
      const slotsOk = check(slotsRes, {
        'slots retrieved': (r) => r.status === 200,
      })
      
      if (!slotsOk) {
        errorRate.add(1)
        return
      }
      
      sleep(1) // User thinking time
      
      // Make reservation
      const reservationRes = http.post(
        `${BASE_URL}/api/reservations`,
        JSON.stringify({
          date: dateStr,
          time: '14:00',
          service: 'カット',
        }),
        {
          headers,
          tags: { name: 'create_reservation' },
        }
      )
      
      const reservationOk = check(reservationRes, {
        'reservation created': (r) => r.status === 201 || r.status === 409,
      })
      
      errorRate.add(!reservationOk)
      reservationDuration.add(new Date() - start)
    })
  }

  viewProfile() {
    if (!this.token) return
    
    const headers = {
      'Authorization': `Bearer ${this.token}`,
    }
    
    group('view_profile', () => {
      // View profile
      const profileRes = http.get(`${BASE_URL}/api/auth/me`, {
        headers,
        tags: { name: 'view_profile' },
      })
      
      check(profileRes, {
        'profile loaded': (r) => r.status === 200,
      })
      
      // View reservations
      const reservationsRes = http.get(`${BASE_URL}/api/reservations`, {
        headers,
        tags: { name: 'view_reservations' },
      })
      
      check(reservationsRes, {
        'reservations loaded': (r) => r.status === 200,
      })
      
      // View points
      const pointsRes = http.get(`${BASE_URL}/api/points/balance`, {
        headers,
        tags: { name: 'view_points' },
      })
      
      check(pointsRes, {
        'points loaded': (r) => r.status === 200,
      })
    })
  }
}

export default function () {
  const user = new VirtualUser()
  
  // User journey
  sleep(Math.random() * 2) // Random start delay
  
  // 80% of users browse before logging in
  if (Math.random() < 0.8) {
    user.browseServices()
  }
  
  // 60% of users log in
  if (Math.random() < 0.6) {
    if (user.login()) {
      sleep(2)
      
      // 70% of logged-in users make a reservation
      if (Math.random() < 0.7) {
        user.makeReservation()
      }
      
      // 50% view their profile
      if (Math.random() < 0.5) {
        sleep(1)
        user.viewProfile()
      }
    }
  }
  
  sleep(Math.random() * 3) // Random think time
}

// Smoke test scenario for CI/CD
export function smokeTest() {
  const res = http.get(`${BASE_URL}/api/health`)
  check(res, {
    'API is up': (r) => r.status === 200,
  })
}