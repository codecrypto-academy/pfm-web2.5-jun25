import '../styles/globals.css'  // Cambio: ../ para subir un nivel y entrar a styles/

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}