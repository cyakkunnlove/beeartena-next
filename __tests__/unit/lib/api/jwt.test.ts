import { signJWT, verifyJWT } from '@/lib/api/jwt'
import { SignJWT, jwtVerify } from 'jose'

jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setNotBefore: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-token'),
  })),
  jwtVerify: jest.fn(),
}))

describe('JWT utilities', () => {
  const mockPayload = { userId: 'user123', email: 'test@example.com' }
  const mockSecret = 'test-secret'

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = mockSecret
  })

  describe('signJWT', () => {
    it('should sign a JWT token with payload', async () => {
      const token = await signJWT(mockPayload)
      
      expect(token).toBe('mock-token')
      expect(SignJWT).toHaveBeenCalledWith(mockPayload)
    })

    it('should set correct headers and expiration', async () => {
      const mockSignJWT = new SignJWT(mockPayload)
      await signJWT(mockPayload)
      
      expect(mockSignJWT.setProtectedHeader).toHaveBeenCalledWith({ alg: 'HS256' })
      expect(mockSignJWT.setExpirationTime).toHaveBeenCalledWith('24h')
      expect(mockSignJWT.setIssuedAt).toHaveBeenCalled()
      expect(mockSignJWT.setNotBefore).toHaveBeenCalled()
    })

    it('should use JWT_SECRET from environment', async () => {
      await signJWT(mockPayload)
      
      const mockSignJWT = new SignJWT(mockPayload)
      expect(mockSignJWT.sign).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      )
    })
  })

  describe('verifyJWT', () => {
    it('should verify a valid JWT token', async () => {
      const mockVerifiedPayload = {
        payload: { userId: 'user123', email: 'test@example.com' },
        protectedHeader: { alg: 'HS256' },
      }
      
      ;(jwtVerify as jest.Mock).mockResolvedValue(mockVerifiedPayload)
      
      const result = await verifyJWT('valid-token')
      
      expect(result).toEqual(mockVerifiedPayload.payload)
      expect(jwtVerify).toHaveBeenCalledWith(
        'valid-token',
        expect.any(Uint8Array)
      )
    })

    it('should throw error for invalid token', async () => {
      ;(jwtVerify as jest.Mock).mockRejectedValue(new Error('Invalid token'))
      
      await expect(verifyJWT('invalid-token')).rejects.toThrow('Invalid token')
    })

    it('should throw error for expired token', async () => {
      ;(jwtVerify as jest.Mock).mockRejectedValue(new Error('Token expired'))
      
      await expect(verifyJWT('expired-token')).rejects.toThrow('Token expired')
    })
  })
})