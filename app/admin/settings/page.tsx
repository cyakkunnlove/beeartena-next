'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { reservationService } from '@/lib/reservationService';
import { BusinessHours, ReservationSettings } from '@/lib/types';
import { motion } from 'framer-motion';
import SlideTransition from '@/components/layout/SlideTransition';

const DAYS_OF_WEEK = [
  { value: 0, label: '日曜日' },
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
];

export default function AdminSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [blockedDate, setBlockedDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    // Load current settings
    const currentSettings = reservationService.getSettings();
    setSettings(currentSettings);
  }, [user, router]);

  const handleBusinessHoursChange = (dayOfWeek: number, field: keyof BusinessHours, value: string | boolean) => {
    if (!settings) return;

    const updatedHours = [...settings.businessHours];
    updatedHours[dayOfWeek] = {
      ...updatedHours[dayOfWeek],
      [field]: value,
    };

    setSettings({
      ...settings,
      businessHours: updatedHours,
    });
  };

  const handleSlotSettingsChange = (field: keyof ReservationSettings, value: number) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [field]: value,
    });
  };

  const handleAddBlockedDate = () => {
    if (!settings || !blockedDate) return;

    const updatedBlockedDates = [...(settings.blockedDates || [])];
    if (!updatedBlockedDates.includes(blockedDate)) {
      updatedBlockedDates.push(blockedDate);
      updatedBlockedDates.sort();

      setSettings({
        ...settings,
        blockedDates: updatedBlockedDates,
      });
    }

    setBlockedDate('');
  };

  const handleRemoveBlockedDate = (date: string) => {
    if (!settings) return;

    const updatedBlockedDates = (settings.blockedDates || []).filter(d => d !== date);

    setSettings({
      ...settings,
      blockedDates: updatedBlockedDates,
    });
  };

  const handleSave = () => {
    if (!settings) return;

    setIsSaving(true);
    reservationService.saveSettings(settings);
    
    setTimeout(() => {
      setIsSaving(false);
      alert('設定を保存しました');
    }, 500);
  };

  if (!user || user.role !== 'admin' || !settings) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">予約設定</h1>
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
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 基本設定 */}
          <SlideTransition>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">基本設定</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    1予約あたりの時間（分）
                  </label>
                  <input
                    type="number"
                    value={settings.slotDuration}
                    onChange={(e) => handleSlotSettingsChange('slotDuration', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="30"
                    step="30"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    1時間枠あたりの最大予約数
                  </label>
                  <input
                    type="number"
                    value={settings.maxCapacityPerSlot}
                    onChange={(e) => handleSlotSettingsChange('maxCapacityPerSlot', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg"
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </SlideTransition>

          {/* 営業時間設定 */}
          <SlideTransition delay={0.1}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">営業時間</h2>
              
              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const hours = settings.businessHours[day.value];
                  return (
                    <motion.div
                      key={day.value}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="w-24">
                        <span className="font-medium">{day.label}</span>
                      </div>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={hours.isOpen}
                          onChange={(e) => handleBusinessHoursChange(day.value, 'isOpen', e.target.checked)}
                          className="mr-2"
                        />
                        営業
                      </label>
                      
                      {hours.isOpen && (
                        <>
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleBusinessHoursChange(day.value, 'open', e.target.value)}
                            className="px-3 py-1 border rounded"
                          />
                          <span>〜</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleBusinessHoursChange(day.value, 'close', e.target.value)}
                            className="px-3 py-1 border rounded"
                          />
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </SlideTransition>

          {/* 休業日設定 */}
          <SlideTransition delay={0.2}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">休業日設定</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  休業日を追加
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={blockedDate}
                    onChange={(e) => setBlockedDate(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <motion.button
                    onClick={handleAddBlockedDate}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-dark-gold"
                    whileTap={{ scale: 0.95 }}
                    disabled={!blockedDate}
                  >
                    追加
                  </motion.button>
                </div>
              </div>
              
              {settings.blockedDates && settings.blockedDates.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700">設定済みの休業日</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {settings.blockedDates.map((date) => (
                      <motion.div
                        key={date}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <span>{new Date(date + 'T00:00:00').toLocaleDateString('ja-JP')}</span>
                        <button
                          onClick={() => handleRemoveBlockedDate(date)}
                          className="text-red-500 hover:text-red-700"
                        >
                          削除
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SlideTransition>

          {/* 保存ボタン */}
          <motion.div 
            className="flex justify-end"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.button
              onClick={handleSave}
              className={`px-8 py-3 rounded-lg font-medium text-white ${
                isSaving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-primary hover:bg-dark-gold'
              }`}
              whileTap={{ scale: 0.95 }}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '設定を保存'}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}