import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowUpRight, FolderPlus, Plus, Users } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const { user } = useAuth();
  const canCreateProject = user?.designation === 'MANAGER';

  const load = () => api.get('/projects').then((response) => setProjects(response.data));

  useEffect(() => {
    load();
  }, []);

  const create = async (event) => {
    event.preventDefault();
    try {
      await api.post('/projects', form);
      toast.success('Project created');
      setShow(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create project');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50">Portfolio</p>
          <h1 className="text-4xl font-black tracking-tight text-white">Projects</h1>
          <p className="mt-2 max-w-2xl text-white/60">Create workspaces for real teams. Every project carries members, roles, tasks, and ownership.</p>
        </div>
        {canCreateProject && (
          <button onClick={() => setShow(true)} className="btn-primary px-4 py-3">
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="workspace-card rounded-lg p-8 text-center">
          <FolderPlus className="mx-auto mb-4 text-blue-600" size={38} />
          <h2 className="text-2xl font-black">{canCreateProject ? 'Create your first project' : 'No projects assigned yet'}</h2>
          <p className="mx-auto mt-2 max-w-lg text-gray-500">
            {canCreateProject ? 'Start with a real project, then add registered company teammates from the project page.' : 'A manager has to create projects and add you. Once added, you can create and update tasks.'}
          </p>
          {canCreateProject && <button onClick={() => setShow(true)} className="btn-primary mt-6 px-5 py-3">Create project</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="workspace-card group rounded-lg p-6 transition hover:-translate-y-1 hover:border-blue-200">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-950 text-white">
                  <FolderPlus size={20} />
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${project.members[0].role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{project.members[0].role}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-black tracking-tight">{project.name}</h3>
                <ArrowUpRight className="text-gray-300 transition group-hover:text-blue-600" size={18} />
              </div>
              <p className="mt-2 min-h-10 text-sm leading-6 text-gray-500">{project.description || 'No description yet'}</p>
              <div className="mt-6 flex gap-3 text-sm font-bold text-gray-600">
                <span className="rounded-full bg-gray-100 px-3 py-1">{project._count.tasks} tasks</span>
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1"><Users size={14} /> {project._count.members}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={create} className="glass-panel w-full max-w-md rounded-lg p-6">
            <h2 className="mb-1 text-2xl font-black tracking-tight">New Project</h2>
            <p className="mb-5 text-sm text-gray-500">Give the team a clear mission and a place to execute.</p>
            <label className="mb-2 block text-sm font-bold text-gray-700">Name</label>
            <input className="input-field mb-4" placeholder="Website redesign" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <label className="mb-2 block text-sm font-bold text-gray-700">Description</label>
            <textarea className="input-field mb-5 min-h-28" placeholder="What is this project about?" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShow(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
              <button className="btn-primary flex-1 py-2.5">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
