'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { storageService } from '@/lib/storage/storageService';
import { Customer, Reservation, PointTransaction } from '@/lib/types';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([]);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [selectedTier, setSelectedTier] = useState('');
  const [activeTab, setActiveTab] = useState<'reservations' | 'points'>('reservations');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin');
      return;
    }

    if (params.id) {
      loadCustomerData(params.id as string);
    }
  }, [user, router, params.id]);

  const loadCustomerData = (customerId: string) => {
    // 顧客情報を取得
    const allCustomers = storageService.getAllCustomers();
    const customerData = allCustomers.find(c => c.id === customerId);
    
    if (!customerData) {
      router.push('/admin/customers');
      return;
    }
    
    setCustomer(customerData);
    setNotes(customerData.notes || '');
    setSelectedTier(customerData.tier || 'bronze');
    
    // 予約履歴を取得
    const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const customerReservations = allReservations
      .filter((r: any) => r.customerId === customerId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setReservations(customerReservations);
    
    // ポイント履歴を取得
    const allPoints = JSON.parse(localStorage.getItem('points') || '[]');
    const customerPoints = allPoints
      .filter((p: any) => p.userId === customerId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setPointHistory(customerPoints);
  };

  const handleNotesUpdate = () => {
    if (!customer) return;
    
    const updatedCustomer = { ...customer, notes };
    storageService.updateCustomer(customer.id, updatedCustomer);
    setCustomer(updatedCustomer);
    setEditingNotes(false);
  };

  const handleTierUpdate = () => {
    if (!customer) return;
    
    const updatedCustomer = { ...customer, tier: selectedTier as any };
    storageService.updateCustomer(customer.id, updatedCustomer);
    setCustomer(updatedCustomer);
  };

  const calculateStats = () => {
    const completedReservations = reservations.filter(r => r.status === 'completed');
    const totalSpent = completedReservations.reduce((sum, r) => sum + (r.price || 0), 0);
    const visitCount = completedReservations.length;
    const averageSpent = visitCount > 0 ? Math.round(totalSpent / visitCount) : 0;
    
    return { totalSpent, visitCount, averageSpent };
  };

  if (!user || user.role !== 'admin' || !customer) {
    return null;
  }

  const stats = calculateStats();

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-orange-600 bg-orange-50';
      case 'silver': return 'text-gray-600 bg-gray-50';
      case 'gold': return 'text-yellow-600 bg-yellow-50';
      case 'platinum': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'confirmed': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '完了';
      case 'confirmed': return '確定';
      case 'pending': return '承認待ち';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/customers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          顧客一覧に戻る
        </button>
      </div>

      {/* 顧客基本情報 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{customer.name}</h1>
            <p className="text-gray-600">ID: {customer.id}</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              <option value="bronze">ブロンズ</option>
              <option value="silver">シルバー</option>
              <option value="gold">ゴールド</option>
              <option value="platinum">プラチナ</option>
            </select>
            <button
              onClick={handleTierUpdate}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-dark-gold"
            >
              ティア更新
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">メールアドレス</p>
            <p className="font-medium">{customer.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">電話番号</p>
            <p className="font-medium">{customer.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">登録日</p>
            <p className="font-medium">
              {new Date(customer.createdAt).toLocaleDateString('ja-JP')}
            </p>
          </div>
        </div>

        {/* メモ */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">顧客メモ</p>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-sm text-primary hover:text-dark-gold"
              >
                編集
              </button>
            )}
          </div>
          {editingNotes ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="顧客に関するメモを入力..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleNotesUpdate}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-dark-gold"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setNotes(customer.notes || '');
                    setEditingNotes(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">
              {notes || '（メモなし）'}
            </p>
          )}
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">現在のポイント</p>
          <p className="text-2xl font-bold text-primary">
            {(customer.points || 0).toLocaleString()}pt
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">総利用額</p>
          <p className="text-2xl font-bold">
            ¥{stats.totalSpent.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">来店回数</p>
          <p className="text-2xl font-bold">{stats.visitCount}回</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-sm text-gray-600 mb-1">平均利用額</p>
          <p className="text-2xl font-bold">
            ¥{stats.averageSpent.toLocaleString()}
          </p>
        </div>
      </div>

      {/* タブ */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('reservations')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'reservations'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              予約履歴 ({reservations.length})
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'points'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ポイント履歴 ({pointHistory.length})
            </button>
          </nav>
        </div>

        {/* 予約履歴 */}
        {activeTab === 'reservations' && (
          <div className="p-6">
          {reservations.length === 0 ? (
            <p className="text-center text-gray-500 py-8">予約履歴がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="pb-3">日時</th>
                    <th className="pb-3">サービス</th>
                    <th className="pb-3">金額</th>
                    <th className="pb-3">ステータス</th>
                    <th className="pb-3">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="border-t">
                      <td className="py-3">
                        <p>{new Date(reservation.date).toLocaleDateString('ja-JP')}</p>
                        <p className="text-sm text-gray-500">{reservation.time}</p>
                      </td>
                      <td className="py-3">{reservation.serviceName}</td>
                      <td className="py-3">¥{reservation.price.toLocaleString()}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                          {getStatusText(reservation.status)}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => router.push(`/admin/reservations/${reservation.id}`)}
                          className="text-sm text-primary hover:text-dark-gold"
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        )}

        {/* ポイント履歴 */}
        {activeTab === 'points' && (
          <div className="p-6">
            {pointHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">ポイント履歴がありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="pb-3">日時</th>
                      <th className="pb-3">タイプ</th>
                      <th className="pb-3">ポイント</th>
                      <th className="pb-3">理由</th>
                      <th className="pb-3">残高</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointHistory.map((transaction, index) => {
                      // 残高を計算（最新から過去に向かって）
                      let balance = customer?.points || 0;
                      for (let i = 0; i < index; i++) {
                        balance -= pointHistory[i].amount;
                      }
                      
                      return (
                        <tr key={transaction.id} className="border-t">
                          <td className="py-3">
                            <p>{new Date(transaction.createdAt).toLocaleDateString('ja-JP')}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(transaction.createdAt).toLocaleTimeString('ja-JP')}
                            </p>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.type === 'earned'
                                ? 'text-green-600 bg-green-50'
                                : transaction.type === 'redeemed'
                                ? 'text-red-600 bg-red-50'
                                : 'text-gray-600 bg-gray-50'
                            }`}>
                              {transaction.type === 'earned' ? '獲得' : transaction.type === 'redeemed' ? '使用' : '失効'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`font-medium ${
                              transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}pt
                            </span>
                          </td>
                          <td className="py-3">{transaction.reason}</td>
                          <td className="py-3 font-medium">
                            {balance.toLocaleString()}pt
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}