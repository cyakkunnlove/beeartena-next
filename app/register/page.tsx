'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import DatePicker from '@/components/ui/DatePicker';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    birthday: '',
    agreeToTerms: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (formData.password.length < 8) {
      setError('パスワードは8文字以上で設定してください');
      return;
    }

    if (!formData.agreeToTerms) {
      setError('利用規約への同意が必要です');
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.email, formData.password, formData.name, formData.phone, formData.birthday);
      router.push('/mypage');
    } catch (err: any) {
      setError(err.message || '登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gradient">会員登録</h1>
          <p className="mt-2 text-gray-600">
            既にアカウントをお持ちの方は
            <Link href="/login" className="text-primary hover:text-dark-gold ml-1">
              ログイン
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="input-group">
              <label htmlFor="name" className="input-label">
                お名前 *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="山田 花子"
              />
            </div>

            <div className="input-group">
              <label htmlFor="email" className="input-label">
                メールアドレス *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="example@email.com"
              />
            </div>

            <div className="input-group">
              <label htmlFor="phone" className="input-label">
                電話番号 *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="090-1234-5678"
              />
            </div>

            <div className="input-group">
              <label htmlFor="birthday" className="input-label">
                生年月日 *
              </label>
              <DatePicker
                value={formData.birthday}
                onChange={(date) => setFormData(prev => ({ ...prev, birthday: date }))}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                誕生日には1,000ポイントプレゼント！
              </p>
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">
                パスワード * (8文字以上)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword" className="input-label">
                パスワード（確認） *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-start">
            <input
              id="agreeToTerms"
              name="agreeToTerms"
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-1"
            />
            <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-900">
              <Link href="/privacy-policy" className="text-primary hover:text-dark-gold">
                利用規約
              </Link>
              および
              <Link href="/privacy-policy" className="text-primary hover:text-dark-gold">
                プライバシーポリシー
              </Link>
              に同意する
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary btn-large disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '登録中...' : '会員登録'}
          </button>

          <div className="bg-light-accent rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-2">会員登録特典</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 施術料金の5%ポイント還元</li>
              <li>• 予約履歴の確認</li>
              <li>• 誕生日特典</li>
              <li>• 会員限定キャンペーン</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}