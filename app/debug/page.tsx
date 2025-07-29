'use client'

import { useState } from 'react'

export default function DebugPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testRegister = async () => {
    setLoading(true)
    setResult('Testing registration...')
    
    try {
      const email = `test-${Date.now()}@example.com`
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: 'password123',
          name: 'デバッグテスト',
          phone: '090-1111-2222'
        })
      })
      
      const data = await response.json()
      setResult(JSON.stringify({ status: response.status, data }, null, 2))
    } catch (error: any) {
      setResult(`Error: ${error.message}\n${error.stack}`)
    } finally {
      setLoading(false)
    }
  }

  const testReservation = async () => {
    setLoading(true)
    setResult('Testing reservation...')
    
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: '2D',
          serviceName: '2D眉毛',
          price: 30000,
          date: '2025-08-25',
          time: '18:30',
          customerName: 'デバッグテスト',
          customerPhone: '090-2222-3333',
          customerEmail: 'debug@example.com',
          notes: 'デバッグテスト'
        })
      })
      
      const data = await response.json()
      setResult(JSON.stringify({ status: response.status, data }, null, 2))
    } catch (error: any) {
      setResult(`Error: ${error.message}\n${error.stack}`)
    } finally {
      setLoading(false)
    }
  }

  const checkEnvironment = () => {
    const info = {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || '(not set - using relative)',
      firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not set',
      firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set',
      useFirebase: process.env.NEXT_PUBLIC_USE_FIREBASE || 'Not set',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      localStorage: typeof window !== 'undefined' && window.localStorage ? 'Available' : 'Not available',
      authToken: typeof window !== 'undefined' && localStorage.getItem('auth_token') ? 'Present' : 'Not present'
    }
    setResult(JSON.stringify(info, null, 2))
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Page</h1>
      
      <div className="space-y-4 mb-6">
        <button 
          onClick={checkEnvironment}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={loading}
        >
          Check Environment
        </button>
        
        <button 
          onClick={testRegister}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-4"
          disabled={loading}
        >
          Test Register API
        </button>
        
        <button 
          onClick={testReservation}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 ml-4"
          disabled={loading}
        >
          Test Reservation API
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <pre className="whitespace-pre-wrap font-mono text-sm">{result}</pre>
      </div>
    </div>
  )
}