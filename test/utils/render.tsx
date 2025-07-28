import React from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/lib/auth/AuthContext'

function render(ui: React.ReactElement, options?: RenderOptions) {
  return rtlRender(<AuthProvider>{ui}</AuthProvider>, options)
}

export * from '@testing-library/react'
export { render }