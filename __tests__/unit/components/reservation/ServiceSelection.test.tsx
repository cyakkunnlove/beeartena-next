import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ServiceSelection from '@/components/reservation/ServiceSelection'
import type { ServicePlan } from '@/lib/types'

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>
        {children}
      </button>
    ),
  },
}))

const createMockService = (overrides: Partial<ServicePlan> = {}): ServicePlan => ({
  id: 'plan-2d',
  type: '2D',
  name: '2Dまつ毛エクステ',
  description: '自然な仕上がりで初めての方にもおすすめのコースです。',
  price: 8000,
  monitorPrice: 6000,
  otherShopPrice: 9000,
  duration: 90,
  image: undefined,
  badge: undefined,
  isFeatured: false,
  tags: [],
  isPublished: true,
  effectiveFrom: new Date().toISOString(),
  effectiveUntil: undefined,
  displayOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const mockServices: ServicePlan[] = [
  createMockService(),
  createMockService({
    id: 'plan-4d',
    type: '4D',
    name: '4Dまつ毛エクステ',
    price: 12000,
    monitorPrice: 10000,
    otherShopPrice: 14000,
    duration: 150,
    badge: '人気No.1',
    isFeatured: true,
    displayOrder: 2,
  }),
  createMockService({
    id: 'plan-wax',
    type: 'wax',
    name: '眉毛ワックス脱毛',
    price: 3000,
    monitorPrice: undefined,
    otherShopPrice: undefined,
    duration: 30,
    displayOrder: 3,
  }),
]

describe('ServiceSelection', () => {
  const onSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders service cards based on props', () => {
    render(
      <ServiceSelection
        services={mockServices}
        onSelect={onSelect}
        selected=""
        isMonitorPrice={false}
      />,
    )

    expect(screen.getByText('2Dまつ毛エクステ')).toBeInTheDocument()
    expect(screen.getByText('4Dまつ毛エクステ')).toBeInTheDocument()
    expect(screen.getByText('眉毛ワックス脱毛')).toBeInTheDocument()
    expect(screen.getByText('所要時間: 約1時間30分')).toBeInTheDocument()
  })

  it('shows empty state when no services are provided', () => {
    render(<ServiceSelection services={[]} onSelect={onSelect} selected="" />)

    expect(
      screen.getByText('現在選択できるプランがありません。管理画面からサービスプランを追加してください。'),
    ).toBeInTheDocument()
  })

  it('calls onSelect immediately when selecting a plan without monitor price', async () => {
    const user = userEvent.setup()
    render(
      <ServiceSelection
        services={mockServices}
        onSelect={onSelect}
        selected=""
        isMonitorPrice={false}
      />,
    )

    await user.click(screen.getByText('眉毛ワックス脱毛'))

    expect(onSelect).toHaveBeenCalledWith('plan-wax', false)
  })

  it('requires confirmation for monitor price plans', async () => {
    const user = userEvent.setup()
    render(
      <ServiceSelection
        services={mockServices}
        onSelect={onSelect}
        selected=""
        isMonitorPrice={false}
      />,
    )

    await user.click(screen.getByText('4Dまつ毛エクステ'))
    expect(onSelect).not.toHaveBeenCalled()

    await user.click(screen.getByText('モニター価格'))
    await user.click(screen.getByText('次へ進む'))

    expect(onSelect).toHaveBeenCalledWith('plan-4d', true)
  })

  it('highlights the card that matches the selected prop', () => {
    render(
      <ServiceSelection
        services={mockServices}
        onSelect={onSelect}
        selected="plan-4d"
        isMonitorPrice={false}
      />,
    )

    const highlightedCard = screen.getByText('4Dまつ毛エクステ').closest('button')
    expect(highlightedCard).toHaveClass('border-primary')
  })

  it('prefills monitor selection when isMonitorPrice is true', () => {
    render(
      <ServiceSelection
        services={mockServices}
        onSelect={onSelect}
        selected="plan-4d"
        isMonitorPrice
      />,
    )

    // モニター価格が表示されることを確認
    const monitorPriceElements = screen.getAllByText(/モニター価格/)
    expect(monitorPriceElements.length).toBeGreaterThan(0)

    // モニター価格の金額が表示されることを確認
    expect(screen.getByText('¥10,000')).toBeInTheDocument()
  })
})
