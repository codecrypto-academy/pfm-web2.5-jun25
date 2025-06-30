import Link from "next/link";

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Besu Network Manager</h1>
        <nav className="space-x-4">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/networks" className="hover:underline">
            Networks
          </Link>
        </nav>
      </div>
    </header>
  );
} 