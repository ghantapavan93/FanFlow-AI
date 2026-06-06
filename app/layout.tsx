import type { Metadata } from 'next'
import './globals.css'
import { DemoToolbar } from '@/components/debug/DemoToolbar'
import { MotionProvider } from '@/components/providers/MotionProvider'

export const metadata: Metadata = {
  title: 'FanFlow AI | From Ticket Confirmed to Venue Ready',
  description: 'Personalized event-day guidance. Lower support friction. Reduce FanProtect claims.',
  openGraph: {
    title: 'FanFlow AI',
    description: 'From ticket confirmed to venue ready',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <MotionProvider>
          {children}
          <DemoToolbar />
        </MotionProvider>
      </body>
    </html>
  )
}
