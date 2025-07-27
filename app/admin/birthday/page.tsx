'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { User } from '@/lib/types';
import { apiClient } from '@/lib/api/client';
import { CakeIcon, GiftIcon } from '@heroicons/react/24/outline';
import { userService } from '@/lib/firebase/users';
import { mockUserService } from '@/lib/mock/mockFirebase';

export default function BirthdayManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'thisMonth'>('all');

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      // Firebaseが設定されているか確認（クライアントサイドでは環境変数が展開されている）
      const isFirebaseConfigured = false; // 現在はモックを使用

      let allUsers: User[];
      if (isFirebaseConfigured) {
        allUsers = await userService.getAllUsers();
      } else {
        allUsers = await mockUserService.getAllUsers();
      }

      // カスタマーのみをフィルタリング
      const customers = allUsers.filter(u => u.role === 'customer');
      
      // 誕生日でソート
      const sortedUsers = customers.sort((a, b) => {
        if (!a.birthday && !b.birthday) return 0;
        if (!a.birthday) return 1;
        if (!b.birthday) return -1;
        
        const [, aMonth, aDay] = a.birthday.split('-').map(Number);
        const [, bMonth, bDay] = b.birthday.split('-').map(Number);
        
        if (aMonth !== bMonth) return aMonth - bMonth;
        return aDay - bDay;
      });
      
      setUsers(sortedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const runBirthdayBatch = async () => {
    setProcessingBatch(true);
    setBatchResults(null);
    
    try {
      const response = await fetch('/api/admin/birthday-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setBatchResults(data.results);
        // ユーザーリストを再取得
        await fetchUsers();
      } else {
        alert(data.error || 'バッチ処理に失敗しました');
      }
    } catch (error) {
      console.error('Batch process error:', error);
      alert('バッチ処理中にエラーが発生しました');
    } finally {
      setProcessingBatch(false);
    }
  };

  const filterUsers = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    return users.filter(user => {
      if (!user.birthday) return false;
      
      const [, month, day] = user.birthday.split('-').map(Number);
      
      switch (filter) {
        case 'today':
          return month === currentMonth && day === currentDay;
        case 'thisMonth':
          return month === currentMonth;
        default:
          return true;
      }
    });
  };

  const formatBirthday = (birthday: string) => {
    const [year, month, day] = birthday.split('-');
    return `${month}月${day}日`;
  };

  const getAge = (birthday: string) => {
    const [year, month, day] = birthday.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const isBirthdayToday = (birthday: string) => {
    const today = new Date();
    const [, month, day] = birthday.split('-').map(Number);
    return month === today.getMonth() + 1 && day === today.getDate();
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return <div className="text-center py-8">アクセス権限がありません</div>;
  }

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  const filteredUsers = filterUsers();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">誕生日管理</h1>
        <button
          onClick={runBirthdayBatch}
          disabled={processingBatch}
          className="btn btn-primary flex items-center gap-2"
        >
          <GiftIcon className="h-5 w-5" />
          {processingBatch ? '処理中...' : '誕生日ポイント一括処理'}
        </button>
      </div>

      {batchResults && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">バッチ処理結果</h3>
          <p>チェック: {batchResults.checked}人</p>
          <p>ポイント付与: {batchResults.granted}人</p>
          {batchResults.errors > 0 && (
            <p className="text-red-600">エラー: {batchResults.errors}件</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            全て ({users.filter(u => u.birthday).length})
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded ${
              filter === 'today' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            今日 ({users.filter(u => u.birthday && isBirthdayToday(u.birthday)).length})
          </button>
          <button
            onClick={() => setFilter('thisMonth')}
            className={`px-4 py-2 rounded ${
              filter === 'thisMonth' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            今月 ({users.filter(u => {
              if (!u.birthday) return false;
              const [, month] = u.birthday.split('-').map(Number);
              return month === new Date().getMonth() + 1;
            }).length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  顧客名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  誕生日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  年齢
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  今年のポイント付与
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={isBirthdayToday(user.birthday!) ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {isBirthdayToday(user.birthday!) && (
                        <CakeIcon className="h-5 w-5 text-yellow-500 mr-2" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.birthday ? formatBirthday(user.birthday) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.birthday ? `${getAge(user.birthday)}歳` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.lastBirthdayPointsYear === new Date().getFullYear() ? (
                      <span className="text-green-600 font-medium">付与済み</span>
                    ) : (
                      <span className="text-gray-500">未付与</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {isBirthdayToday(user.birthday!) && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        本日誕生日
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              該当するユーザーがいません
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">誕生日ポイントについて</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 誕生日当日に1,000ポイントが自動付与されます</li>
          <li>• 1年に1回のみ付与されます</li>
          <li>• 手動でバッチ処理を実行することも可能です</li>
          <li>• 誕生日が登録されていないユーザーは対象外です</li>
        </ul>
      </div>
    </div>
  );
}