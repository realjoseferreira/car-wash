import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Espaço Braite - Sistema de Ordens de Serviço',
  description: 'Sistema multi-tenant para gerenciamento de lava-rápido e estética automotiva',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}