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
        setMessage(data.detail || 'Register failed')
        return
      }

      setMessage('User registered successfully')
      setForm({
        name: '',
        email: '',
        password: '',
        role_id: '',
        dept_id: '',
      })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-wrap flex min-h-screen items-center justify-center px-4 pb-8 pt-14">
      <section className="island-shell max-w-xl rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <h1 className="mb-6 text-3xl font-bold">Register</h1>

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

          <select
            name="role_id"
            value={form.role_id}
            onChange={handleChange}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="">Select Role</option>
            <option value="1">Admin</option>
            <option value="2">Accounting</option>
            <option value="3">Manager</option>
            <option value="4">Employee</option>
            <option value="5">Read Only</option>
          </select>

          <select
            name="dept_id"
            value={form.dept_id}
            onChange={handleChange}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="">Select Department</option>
            <option value="1">Accounting</option>
            <option value="2">Finance</option>
            <option value="3">Human Resources</option>
            <option value="4">Information Technology</option>
            <option value="5">Procurement</option>
            <option value="6">Operations</option>
          </select>

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