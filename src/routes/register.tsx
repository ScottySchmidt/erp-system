import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    dept_id: '',
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!form.name || !form.email || !form.password) {
      setMessage('Please fill in name, email, and password.')
      return
    }

    try {
      setLoading(true)

      const res = await fetch('http://127.0.0.1:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role_id: form.role_id ? Number(form.role_id) : null,
          dept_id: form.dept_id ? Number(form.dept_id) : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || 'Register failed.')
        return
      }

      setMessage('User registered successfully.')
      setForm({
        name: '',
        email: '',
        password: '',
        role_id: '',
        dept_id: '',
      })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14 max-w-xl mx-auto">
        <h1 className="mb-6 text-3xl font-bold text-[var(--sea-ink)]">
          Register User
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="role_id"
            type="number"
            placeholder="Role ID"
            value={form.role_id}
            onChange={handleChange}
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="dept_id"
            type="number"
            placeholder="Department ID"
            value={form.dept_id}
            onChange={handleChange}
            className="w-full rounded-xl border px-4 py-3"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-full border px-5 py-2.5 font-semibold"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </section>
    </main>
  )
}