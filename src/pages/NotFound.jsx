import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="font-mono text-3xl font-semibold text-teal-700">Q-404</span>
      <h1 className="mt-2 font-display text-xl font-semibold">This page took a wrong turn</h1>
      <p className="mt-1 text-sm text-ink/55">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-5 !px-5 !py-2.5">Back home</Link>
    </div>
  )
}
