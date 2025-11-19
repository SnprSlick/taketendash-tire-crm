import './globals.css';

export const metadata = {
  title: 'Tire CRM Dashboard',
  description: 'Comprehensive CRM system for tire and auto service companies',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}