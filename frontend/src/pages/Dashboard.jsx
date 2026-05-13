import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, CheckCircle2, Clock3, FolderKanban, ListTodo, TimerReset, Bell } from 'lucide-react';
import api from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [company, setCompany] = useState(null);
  const [quickNotes, setQuickNotes] = useState({});
  const [notifications, setNotifications] = useState([]);

  const load = () => {
    api.get('/tasks/dashboard').then((response) => setData(response.data));
    api.get('/company').then((response) => setCompany(response.data)).catch(() => setCompany(null));
    api.get('/users/notifications').then((response) => setNotifications(response.data)).catch(() => setNotifications([]));
  };

  useEffect(() => {
    load();
  }, []);

  if (!data) return <div className="text-white/70">Loading workspace...</div>;

  const statusCount = (status) => data.byStatus.find((item) => item.status === status)?._count || 0;
  const totalAssigned = statusCount('TODO') + statusCount('IN_PROGRESS') + statusCount('DONE');
  const companyStats = data.companyStats || {};

  const sendQuickNote = async (taskId) => {
    const note = quickNotes[taskId] || 'Need more time';
    const payload = note === 'Blocked'
      ? { issues: 'Blocked. Needs manager review.' }
      : { currentWork: note };
    await api.post(`/tasks/${taskId}/reports`, payload);
    setQuickNotes((current) => ({ ...current, [taskId]: '' }));
    load();
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/users/notifications/${id}/read`);
      setNotifications(n => n.filter(x => x.id !== id));
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {notifications.length > 0 && (
        <section className="rounded-lg border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-black flex items-center gap-2 mb-4 text-blue-900"><Bell size={18} /> Notifications</h2>
          <div className="space-y-2">
            {notifications.map(notif => (
              <div key={notif.id} className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-blue-100">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">{notif.message}</div>
                  <div className="text-xs text-gray-400">{new Date(notif.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  {notif.link && <Link to={notif.link} className="btn-secondary px-3 py-1.5 text-xs">View</Link>}
                  <button onClick={() => markAsRead(notif.id)} className="btn-primary px-3 py-1.5 text-xs">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-white/10 bg-white text-gray-950 shadow-2xl">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-7 md:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">{company?.company?.name || 'Company'} control room</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Track company projects, teams, active work, and completed delivery.
            </h1>
            <p className="mt-4 max-w-2xl text-gray-500">
              A process dashboard for the company: projects in motion, team members, assigned tasks, overdue work, and completion progress.
            </p>
          </div>
          <div className="bg-[#101828] p-7 text-white md:p-8">
            <p className="text-sm font-semibold text-white/50">Assigned task completion</p>
            <div className="mt-5 flex items-end gap-3">
              <span className="text-6xl font-black">{totalAssigned ? Math.round((statusCount('DONE') / totalAssigned) * 100) : 0}%</span>
              <span className="pb-2 text-sm text-white/50">done</span>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${totalAssigned ? (statusCount('DONE') / totalAssigned) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card to="/projects" icon={<FolderKanban />} label="Company Projects" value={companyStats.projects ?? data.totalProjects} accent="bg-blue-600" />
        <Card to="/projects" icon={<UsersIcon />} label="Team Members" value={companyStats.teamMembers ?? company?.people?.length ?? 0} accent="bg-gray-800" />
        <Card to="/projects" icon={<Clock3 />} label="Going Projects" value={companyStats.activeProjects ?? 0} accent="bg-amber-500" />
        <Card to="/projects" icon={<CheckCircle2 />} label="Completed Projects" value={companyStats.completedProjects ?? 0} accent="bg-teal-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="workspace-card rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Risk radar</p>
              <h2 className="text-xl font-black">Overdue Tasks</h2>
            </div>
            <AlertCircle className={data.overdue.length ? 'text-red-500' : 'text-teal-600'} />
          </div>
          {data.overdue.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm font-semibold text-gray-500">
              No delayed task right now. If a task needs extra time, employees can mark it from the execution queue.
            </div>
          ) : data.overdue.map((task) => (
            <div key={task.id} className="mb-3 rounded-lg border border-red-100 bg-red-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-red-950">{task.title}</div>
                  <div className="mt-1 text-sm text-red-700">{task.project.name} - Due {new Date(task.dueDate).toLocaleDateString()}</div>
                </div>
                <Link to={`/projects/${task.project.id}`}><ArrowUpRight size={16} className="text-red-500" /></Link>
              </div>
              <TaskSignal taskId={task.id} value={quickNotes[task.id]} setQuickNotes={setQuickNotes} sendQuickNote={sendQuickNote} />
            </div>
          ))}
        </section>

        <section className="workspace-card rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Execution queue</p>
              <h2 className="text-xl font-black">My Tasks</h2>
            </div>
            <TimerReset className="text-blue-600" />
          </div>
          {data.myTasks.length === 0 ? <p className="rounded-lg bg-gray-50 p-6 text-gray-500">No tasks assigned</p> : data.myTasks.map((task) => (
            <div key={task.id} className="mb-3 rounded-lg border border-gray-100 bg-white p-4 hover:border-blue-200 hover:bg-blue-50/30">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold">{task.title}</div>
                  <div className="text-sm text-gray-500">{task.project.name}</div>
                </div>
                <Link to={`/projects/${task.project.id}`} className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(task.status)}`}>{task.status.replace('_', ' ')}</Link>
              </div>
              <TaskSignal taskId={task.id} value={quickNotes[task.id]} setQuickNotes={setQuickNotes} sendQuickNote={sendQuickNote} />
            </div>
          ))}
        </section>
      </div>

      {company && (
        <section className="workspace-card rounded-lg p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Company Directory</p>
              <h2 className="text-2xl font-black">{company.company.name}</h2>
              <p className="mt-1 text-sm text-gray-500">Company code: <span className="font-black text-gray-950">{company.company.code}</span></p>
            </div>
            <span className="rounded-full bg-gray-950 px-4 py-2 text-sm font-black text-white">{company.people.length} employees</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {company.people.map((person) => (
              <div key={person.id} className="rounded-lg border border-gray-100 bg-white p-4">
                <div className="font-black">{person.name}</div>
                <div className="text-sm text-gray-500">{person.email}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-800">{person.designation.replace('_', ' ')}</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{person.employeeId || 'No ID'}</span>
                </div>
                {person.manager && <p className="mt-1 text-xs text-gray-400">Reports to {person.manager.name}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ icon, label, value, accent, to }) {
  const body = (
    <>
      <div className={`${accent} mb-4 flex h-11 w-11 items-center justify-center rounded-lg text-white`}>{icon}</div>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-sm font-semibold text-gray-500">{label}</div>
    </>
  );
  return (
    <Link to={to} className="metric-card block p-5 transition hover:-translate-y-1 hover:border-blue-200">
      {body}
    </Link>
  );
}

function TaskSignal({ taskId, value, setQuickNotes, sendQuickNote }) {
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <select className="input-field p-2 text-sm font-bold" value={value || ''} onChange={(event) => setQuickNotes((current) => ({ ...current, [taskId]: event.target.value }))}>
        <option value="">Update status</option>
        <option>On track</option>
        <option>Need more time</option>
        <option>Blocked</option>
        <option>Waiting for review</option>
      </select>
      <button type="button" onClick={() => sendQuickNote(taskId)} className="btn-secondary px-3 py-2 text-sm">Send</button>
    </div>
  );
}

function UsersIcon() {
  return <span className="text-lg font-black">TM</span>;
}

function statusClass(status) {
  if (status === 'DONE') return 'bg-teal-100 text-teal-800';
  if (status === 'IN_PROGRESS') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
}
