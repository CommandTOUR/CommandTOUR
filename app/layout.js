import './globals.css'

export const metadata = {
  title: 'CommandTOUR',
  description: 'Tour Management Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}