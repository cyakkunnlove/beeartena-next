'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { storageService } from '@/lib/storage/storageService';
import { Customer, PointHistory } from '@/types';

export default function AdminPoints() {
  const router = useRouter();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pointAmount, setPointAmount] = useState('');
  const [pointReason, setPointReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    loadCustomers();
  }, [user, router]);

  const loadCustomers = () => {
    const allCustomers = storageService.getAllCustomers();
    setCustomers(allCustomers);
  };

  const handlePointsAdd = () => {
    if (!selectedCustomer || !pointAmount || !pointReason) {
      alert('すべての項目を入力してください');
      return;
    }

    const points = parseInt(pointAmount);
    if (isNaN(points) || points <= 0) {
      alert('正しいポイント数を入力してください');
      return;
    }

    storageService.addPoints(selectedCustomer.id, points, 'manual', pointReason);
    
    // Reset form
    setSelectedCustomer(null);
    setPointAmount('');
    setPointReason('');
    loadCustomers();
    
    alert(`${selectedCustomer.name}様に${points}ポイントを付与しました`);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">ポイント管理</h1>
            <button
              onClick={() => router.push('/admin')}
              className="text-primary hover:text-dark-gold"
            >
              ← 管理画面に戻る
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Point Addition Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">ポイント付与</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                顧客を選択
              </label>
              <input
                type="text"
                placeholder="顧客名またはメールアドレスで検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
              />
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const customer = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(customer || null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">顧客を選択してください</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email}) - 現在: {customer.points}pt
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                付与ポイント数
              </label>
              <input
                type="number"
                value={pointAmount}
                onChange={(e) => setPointAmount(e.target.value)}
                placeholder="例: 100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              付与理由
            </label>
            <input
              type="text"
              value={pointReason}
              onChange={(e) => setPointReason(e.target.value)}
              placeholder="例: キャンペーン特典、誕生日プレゼント"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <button
            onClick={handlePointsAdd}
            disabled={!selectedCustomer || !pointAmount || !pointReason}
            className="mt-6 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ポイントを付与する
          </button>
        </div>

        {/* Recent Point Activities */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">最近のポイント履歴</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タイプ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ポイント
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    説明
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.slice(0, 10).map((customer) => {
                  const history = JSON.parse(localStorage.getItem(`pointHistory_${customer.id}`) || '[]') as PointHistory[];
                  return history.slice(0, 1).map((entry) => (
                    <tr key={`${customer.id}-${entry.date}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {new Date(entry.date).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.type === 'earned' ? 'bg-green-100 text-green-800' : 
                          entry.type === 'used' ? 'bg-red-100 text-red-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.type === 'earned' ? '獲得' : 
                           entry.type === 'used' ? '使用' : 
                           '手動付与'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {entry.type === 'used' ? '-' : '+'}{entry.points}pt
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {entry.description}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}