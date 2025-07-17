'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { storageService } from '@/lib/storage/storageService';
import { Reservation } from '@/lib/types';

export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (user) {
      loadReservations();
    }
  }, [user]);

  const loadReservations = async () => {
    try {
      const userReservations = storageService.getReservations(user!.id);
      setReservations(userReservations.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (error) {
      console.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const reservationDate = new Date(reservation.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      return reservationDate >= today && reservation.status !== 'cancelled';
    } else if (filter === 'past') {
      return reservationDate < today || reservation.status === 'completed';
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">確定</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">確認待ち</span>;
      case 'completed':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">完了</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">キャンセル</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="loading-spinner mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">予約履歴</h1>
        
        {/* フィルター */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'upcoming' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            今後の予約
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'past' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            過去の予約
          </button>
        </div>

        {/* 予約リスト */}
        {filteredReservations.length > 0 ? (
          <div className="space-y-4">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{reservation.serviceName}</h3>
                    <p className="text-gray-600">
                      {new Date(reservation.date).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                      })} {reservation.time}
                    </p>
                  </div>
                  {getStatusBadge(reservation.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">料金:</span>
                    <span className="ml-2 font-semibold">¥{reservation.price.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">予約番号:</span>
                    <span className="ml-2">{reservation.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                {reservation.notes && (
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="font-medium">備考:</span> {reservation.notes}
                  </div>
                )}

                {reservation.status === 'completed' && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-green-600">
                      ✨ この施術で {Math.floor(reservation.price * 0.05)} ポイント獲得しました
                    </p>
                  </div>
                )}

                {reservation.status === 'confirmed' && new Date(reservation.date) > new Date() && (
                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <button className="text-sm text-primary hover:text-dark-gold">
                      予約を変更
                    </button>
                    <span className="text-gray-400">|</span>
                    <button className="text-sm text-red-600 hover:text-red-700">
                      キャンセル
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              {filter === 'upcoming' ? '今後の予約はありません' : '予約履歴がありません'}
            </p>
            <a href="/reservation" className="btn btn-primary">
              新規予約をする
            </a>
          </div>
        )}
      </div>
    </div>
  );
}