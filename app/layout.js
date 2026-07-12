import { Inter } from 'next/font/google'
import './globals.css'
import SideNav from '../components/SideNav'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'CommandTOUR',
  description: 'Tour Management Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{
          __html: `try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}`
        }} />
      </head>
      <body className={inter.variable} style={{ margin: 0, padding: 0 }}>
        <div style={{
          display: 'flex',
          gap: 10,
          padding: 10,
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--page-bg)',
        }}>
          <SideNav />
          <main style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
