import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-white/70">
            <Sparkles size={14} /> Team execution, without the noise
          </div>
          <h1 className="max-w-2xl text-6xl font-black leading-[0.95] tracking-tight">
            Bring every project into one focused command center.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
            Sign in with your real account, create projects, invite registered teammates by email, and move work from idea to done.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {['Role-aware teams', 'Live task board', 'Deadline clarity'].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/10 p-4 text-sm font-semibold text-white/80">
                <CheckCircle2 className="mb-3 text-cyan-300" size={18} /> {item}
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={submit} className="glass-panel w-full rounded-lg p-7 text-gray-950 md:p-8">
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gray-950 text-white">
              <Sparkles size={18} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-500">Use the email you signed up with, or create a new account.</p>
          </div>
          <label className="mb-2 block text-sm font-bold text-gray-700">Email</label>
          <input className="input-field mb-4" type="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="mb-2 block text-sm font-bold text-gray-700">Password</label>
          <input className="input-field mb-5" type="password" placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="btn-primary w-full px-4 py-3">
            Login <ArrowRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@demo.com');
              setPassword('password123');
            }}
            className="btn-secondary mt-3 w-full px-4 py-3"
          >
            Fill demo admin
          </button>
          <p className="mt-6 text-center text-sm text-gray-500">
            New teammate? <Link to="/signup" className="font-bold text-gray-950">Create your account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
