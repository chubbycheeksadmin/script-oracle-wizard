import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Production Feasibility Engine',
  description: 'A senior producer + 1st AD reality check for advertising scripts and early budgets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
