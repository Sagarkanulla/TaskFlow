import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Building2, IdCard, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DESIGNATIONS = [
  ['MANAGER', 'Manager'],
  ['TEAM_LEAD', 'Team Lead'],
  ['TEAM_MEMBER', 'Team Member'],
  ['INTERN', 'Intern'],
  ['CONTRACTOR', 'Contractor']
];

export default function Signup() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    designation: 'TEAM_MEMBER',
    companyMode: 'CREATE',
    companyName: '',
    companyCode: ''
  });
  const { signup } = useAuth();
  const navigate = useNavigate();

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    try {
      await signup(form);
      toast.success(form.companyMode === 'CREATE' ? 'Company workspace created' : 'Joined company workspace');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-4 py-10 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={submit} className="glass-panel w-full rounded-lg p-7 md:p-8">
          <div className="mb-7">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gray-950 text-white">
              <Building2 size={18} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Create your company login</h1>
            <p className="mt-2 text-sm text-gray-500">First official creates the company code. Everyone else joins using that code.</p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <button type="button" onClick={() => set('companyMode', 'CREATE')} className={`rounded-md px-3 py-2 text-sm font-black ${form.companyMode === 'CREATE' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Create company</button>
            <button type="button" onClick={() => set('companyMode', 'JOIN')} className={`rounded-md px-3 py-2 text-sm font-black ${form.companyMode === 'JOIN' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Join by code</button>
          </div>

          {form.companyMode === 'CREATE' ? (
            <>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700"><Building2 size={15} /> Company Name</label>
              <input className="input-field mb-4" placeholder="Acme Technologies" value={form.companyName} onChange={(event) => set('companyName', event.target.value)} required />
            </>
          ) : (
            <>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700"><Building2 size={15} /> Company Code</label>
              <input className="input-field mb-4 uppercase" placeholder="ACME-8F2KQ1" value={form.companyCode} onChange={(event) => set('companyCode', event.target.value.toUpperCase())} required />
            </>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field icon={<User size={15} />} label="Employee Name">
              <input className="input-field" placeholder="Deepika Kanulla" value={form.name} onChange={(event) => set('name', event.target.value)} required />
            </Field>
            <Field icon={<IdCard size={15} />} label="Employee ID">
              <input className="input-field" placeholder="EMP-1042" value={form.employeeId} onChange={(event) => set('employeeId', event.target.value)} required />
            </Field>
            <Field icon={<Mail size={15} />} label="Email">
              <input className="input-field" type="email" placeholder="you@company.com" value={form.email} onChange={(event) => set('email', event.target.value)} required />
            </Field>
            <Field icon={<Lock size={15} />} label="Password">
              <input className="input-field" type="password" placeholder="Minimum 6 characters" value={form.password} onChange={(event) => set('password', event.target.value)} required />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Designation">
              <select className="input-field" value={form.companyMode === 'CREATE' ? 'MANAGER' : form.designation} onChange={(event) => set('designation', event.target.value)} disabled={form.companyMode === 'CREATE'}>
                {DESIGNATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>

          <button className="btn-primary mt-6 w-full px-4 py-3">
            {form.companyMode === 'CREATE' ? 'Create company account' : 'Join company'} <ArrowRight size={18} />
          </button>
          <p className="mt-6 text-center text-sm text-gray-500">
            Already registered? <Link to="/login" className="font-bold text-gray-950">Login</Link>
          </p>
        </form>

        <section className="rounded-lg bg-[#0e3030] p-8 text-white shadow-2xl md:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-200">Company-grade access</p>
          <h2 className="mt-4 text-5xl font-black leading-none tracking-tight">One code. One company. Clear roles.</h2>
          <p className="mt-5 text-lg leading-8 text-white/70">
            Managers create the workspace, share the generated company code, then assign team leads and members inside the roster.
          </p>
          <div className="mt-8 grid gap-3">
            {['Employee ID and designation captured at signup', 'Company members show in the project roster', 'Managers organize reporting lines'].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/10 p-4 font-semibold text-white/80">{item}</div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">{icon}{label}</span>
      {children}
    </label>
  );
}
