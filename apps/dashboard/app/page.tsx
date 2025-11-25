import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Vakkya Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your voice agent projects
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-2 border border-border rounded-md hover:bg-muted"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}
