import { Inter } from 'next/font/google';
import './globals.css';
import { BalanceProvider } from './context/BalanceContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Besu Blocks',
  description: 'Besu Blocks',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BalanceProvider>
          {children}
        </BalanceProvider>
      </body>
    </html>
  );
}