// Mock for rate limiter
module.exports = {
  checkRateLimit: jest.fn().mockResolvedValue(true), // Always allow in tests
}
