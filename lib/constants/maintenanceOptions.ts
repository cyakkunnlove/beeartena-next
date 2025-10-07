export interface MaintenanceOption {
  id: string
  name: string
  price: number
  description?: string
}

export const MAINTENANCE_OPTIONS: MaintenanceOption[] = [
  {
    id: 'cut-shave',
    name: '眉カット＋フェイスシェービング',
    price: 2000,
    description: '眉毛を整えて、お顔の産毛もきれいに',
  },
  {
    id: 'nose-wax',
    name: '鼻毛ワックス脱毛',
    price: 500,
    description: '気になる鼻毛をすっきりと',
  },
  {
    id: 'bleach',
    name: '眉毛ブリーチ（脱色）',
    price: 1000,
    description: '眉毛を明るくして優しい印象に',
  },
]

export const getMaintenanceOptionById = (id: string): MaintenanceOption | undefined =>
  MAINTENANCE_OPTIONS.find((option) => option.id === id)

export const FULL_SET_PRICE = 3000
