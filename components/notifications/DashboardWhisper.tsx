'use client'

import { useState } from 'react'
import WhisperBanner from './WhisperBanner'

interface DashboardWhisperProps {
  message: string
}

export default function DashboardWhisper({ message }: DashboardWhisperProps) {
  const [visible, setVisible] = useState(true)
  if (!visible || !message) return null
  return <WhisperBanner message={message} onClose={() => setVisible(false)} />
}
