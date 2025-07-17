interface ServiceSelectionProps {
  onSelect: (service: string) => void;
  selected: string;
}

const services = [
  {
    id: '2D',
    name: 'パウダーブロウ',
    description: 'ふんわりパウダー眉',
    price: 20000,
    duration: '約2時間',
  },
  {
    id: '3D',
    name: 'フェザーブロウ',
    description: '立体的な毛流れ眉',
    price: 20000,
    duration: '約2時間',
  },
  {
    id: '4D',
    name: 'パウダー&フェザー',
    description: '2D+3Dのいいとこ取り',
    price: 25000,
    duration: '約2時間',
    featured: true,
  },
];

export default function ServiceSelection({ onSelect, selected }: ServiceSelectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {services.map((service) => (
        <button
          key={service.id}
          onClick={() => onSelect(service.id)}
          className={`relative p-6 rounded-xl border-2 transition-all ${
            selected === service.id
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 hover:border-primary/50'
          }`}
        >
          {service.featured && (
            <div className="absolute top-0 right-0 bg-primary text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg">
              人気No.1
            </div>
          )}
          
          <div className="text-3xl font-bold text-primary mb-2">{service.id}</div>
          <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{service.description}</p>
          <p className="text-2xl font-bold mb-1">¥{service.price.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{service.duration}</p>
        </button>
      ))}
    </div>
  );
}