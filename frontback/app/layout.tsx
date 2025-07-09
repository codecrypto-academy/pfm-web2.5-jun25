import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { BalanceProvider } from './context/BalanceContext';
import { NetworkProvider } from './context/NetworkContext';

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
        <NetworkProvider>
          <BalanceProvider>
            {children}
          </BalanceProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}