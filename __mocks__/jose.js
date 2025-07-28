// Mock jose library for Jest tests
module.exports = {
  jwtVerify: jest.fn().mockResolvedValue({
    payload: {
      userId: 'test-user-id',
      role: 'user',
    },
  }),
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-jwt-token'),
  })),
}