import './globals.css'

export const metadata = {
  title: 'CommandTOUR',
  description: 'Tour Management Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Apply saved theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{
          __html: `try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`
        }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
