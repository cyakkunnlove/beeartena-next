/**
 * 予約情報のセッションストレージ管理
 */

const STORAGE_KEY = 'pending_reservation';

export interface PendingReservation {
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  formData: {
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
  timestamp: number;
}

export const reservationStorage = {
  /**
   * 予約情報を保存
   */
  save(data: Omit<PendingReservation, 'timestamp'>): void {
    if (typeof window === 'undefined') return;
    
    const pendingReservation: PendingReservation = {
      ...data,
      timestamp: Date.now(),
    };
    
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pendingReservation));
  },

  /**
   * 予約情報を取得
   */
  get(): PendingReservation | null {
    if (typeof window === 'undefined') return null;
    
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored) as PendingReservation;
      
      // 1時間以上経過している場合は無効とする
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - data.timestamp > oneHour) {
        this.clear();
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  },

  /**
   * 予約情報をクリア
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
  },

  /**
   * 予約情報が存在するか確認
   */
  exists(): boolean {
    return this.get() !== null;
  },
};