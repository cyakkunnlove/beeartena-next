'use client';

interface ReservationFormProps {
  formData: {
    name: string;
    email: string;
    phone: string;
    notes: string;
  };
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
  isLoggedIn: boolean;
}

export default function ReservationForm({
  formData,
  onChange,
  onSubmit,
  isLoggedIn,
}: ReservationFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isLoggedIn && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">
            会員情報から自動入力されています。
            変更が必要な場合は、以下のフォームで修正してください。
          </p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="山田 花子"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => onChange('email', e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="example@email.com"
        />
        <p className="mt-1 text-xs text-gray-500">
          予約確認メールをお送りします
        </p>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
          電話番号 <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="090-1234-5678"
        />
        <p className="mt-1 text-xs text-gray-500">
          予約確認のご連絡をさせていただく場合があります
        </p>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          ご要望・ご質問（任意）
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="アレルギーやご要望がございましたら、こちらにご記入ください"
        />
      </div>

      <div className="border-t pt-6">
        <h3 className="font-semibold mb-4">注意事項</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>施術当日は、眉毛周りのメイクはお控えください</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>妊娠中・授乳中の方は施術を受けることができません</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>アレルギーや皮膚疾患のある方は、事前にご相談ください</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>キャンセルは前日までにご連絡ください</span>
          </li>
        </ul>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="agreement"
          required
          className="mt-1"
        />
        <label htmlFor="agreement" className="text-sm text-gray-600">
          注意事項を確認し、同意します <span className="text-red-500">*</span>
        </label>
      </div>

      <button
        type="submit"
        className="w-full btn btn-primary"
      >
        予約を確定する
      </button>

      {!isLoggedIn && (
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            会員登録でポイントが貯まります
          </p>
          <a href="/register" className="text-primary hover:text-dark-gold text-sm font-medium">
            会員登録はこちら →
          </a>
        </div>
      )}
    </form>
  );
}