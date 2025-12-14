import { mockPointService } from '@/lib/mock/mockFirebase'

import type { PointTransaction } from '@/lib/types'

export const pointService = {
  async addPoints(userId: string, amount: number, description: string): Promise<PointTransaction> {
    return mockPointService.addPoints(userId, amount, description)
  },

  async usePoints(userId: string, amount: number, description: string): Promise<PointTransaction> {
    return mockPointService.usePoints(userId, amount, description)
  },

  async getUserPointHistory(userId: string): Promise<PointTransaction[]> {
    return mockPointService.getUserPointHistory(userId)
  },

  async getUserPoints(userId: string): Promise<number> {
    return mockPointService.getUserPoints(userId)
  },

  async addReservationPoints(userId: string, reservationAmount: number): Promise<PointTransaction> {
    return mockPointService.addReservationPoints(userId, reservationAmount)
  },
}

