import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, CheckCircle2, Clock3, FileUp, Flag, Plus, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import api from '../api';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const emptyTask = { title: '', description: '', assigneeId: '', dueDate: '', priority: 'MEDIUM', status: 'TODO' };

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [showTask, setShowTask] = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [memberEmail, setMemberEmail] = useState('');
  const [reports, setReports] = useState({});

  const load = () => api.get(`/projects/${id}`).then((response) => setProject(response.data));

  useEffect(() => {
    load();
  }, [id]);

  const isAdmin = project?.myRole === 'ADMIN';
  const canManagePeople = isAdmin && project?.myDesignation === 'MANAGER';

  const createTask = async (event) => {
    event.preventDefault();
    try {
      await api.post('/tasks', { ...taskForm, projectId: id, assigneeId: taskForm.assigneeId || null });
      toast.success('Task created');
      setShowTask(false);
      setTaskForm(emptyTask);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create task');
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update task');
    }
  };

  const updateAssignee = async (taskId, assigneeId) => {
    try {
      await api.patch(`/tasks/${taskId}`, { assigneeId: assigneeId || null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not assign task');
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not delete task');
    }
  };

  const addMember = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail.trim().toLowerCase() });
      toast.success('Member added');
      setShowMember(false);
      setMemberEmail('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Create that user first, then add their email here');
    }
  };

  const addMemberById = async (userId) => {
    try {
      await api.post(`/projects/${id}/members`, { userId });
      toast.success('Member added');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not add member');
    }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this person from the project?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      toast.success('Member removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not remove member');
    }
  };

  const updatePerson = async (personId, updates) => {
    try {
      await api.patch(`/company/people/${personId}`, updates);
      toast.success('Employee updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update employee');
    }
  };

  const saveReport = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/reports`, reports[taskId] || {});
      toast.success('Work update saved');
      setReports((current) => ({ ...current, [taskId]: {} }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save update');
    }
  };

  const uploadFiles = async (taskId, files) => {
    try {
      for (const file of files) {
        const data = await fileToBase64(file);
        await api.post(`/tasks/${taskId}/attachments`, {
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          data
        });
      }
      toast.success('File uploaded');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not upload file');
    }
  };

  if (!project) return <div className="text-white/70">Loading project...</div>;

  const done = project.tasks.filter((task) => task.status === 'DONE').length;
  const progress = project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0;
  const projectMemberIds = new Set(project.members.map((member) => member.user.id));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-white/10 bg-white shadow-2xl">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-7 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">{project.myRole} access</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{project.name}</h1>
            <p className="mt-3 max-w-2xl text-gray-500">{project.description || 'No description yet'}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {project.members.map((member) => (
                <div key={member.id} className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold">
                  <span>{member.user.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${member.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'}`}>{member.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#101828] p-7 text-white md:p-8">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white/60">Project progress</span>
              <span className="text-sm font-bold text-cyan-200">{project.tasks.length} tasks</span>
            </div>
            <div className="mt-5 text-6xl font-black">{progress}%</div>
            <div className="mt-6 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-7 flex gap-2">
              {canManagePeople && <button onClick={() => setShowMember(true)} className="btn-secondary flex-1 px-3 py-2"><UserPlus size={17} /> Member</button>}
              <button onClick={() => setShowTask(true)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 font-bold text-gray-950"><Plus size={17} /> Task</button>
            </div>
          </div>
        </div>
      </section>

      {canManagePeople && <section className="workspace-card rounded-lg p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Company people</p>
            <h2 className="text-2xl font-black">Roster and project access</h2>
            <p className="mt-1 text-sm text-gray-500">Add or remove registered company employees from this project. Managers can tune designations and reporting.</p>
          </div>
          <span className="rounded-full bg-gray-950 px-4 py-2 text-sm font-black text-white">{project.companyPeople?.length || 0} people</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {(project.companyPeople || []).filter((person) => person.id !== project.myUserId).map((person) => {
            const inProject = projectMemberIds.has(person.id);
            return (
              <div key={person.id} className="rounded-lg border border-gray-100 bg-white p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="font-black">{person.name}</div>
                    <div className="text-sm text-gray-500">{person.email}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-800">{person.designation.replace('_', ' ')}</span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{person.employeeId || 'No ID'}</span>
                    </div>
                  </div>
                  <button onClick={() => inProject ? removeMember(person.id) : addMemberById(person.id)} className={inProject ? 'btn-secondary px-3 py-2 text-sm' : 'btn-primary px-3 py-2 text-sm'}>
                    {inProject ? <UserMinus size={15} /> : <UserPlus size={15} />} {inProject ? 'Remove' : 'Add'}
                  </button>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <select className="input-field p-2 text-sm font-bold" value={person.designation} onChange={(event) => updatePerson(person.id, { designation: event.target.value })}>
                    <option value="MANAGER">Manager</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="TEAM_MEMBER">Team Member</option>
                    <option value="INTERN">Intern</option>
                    <option value="CONTRACTOR">Contractor</option>
                  </select>
                  <select className="input-field p-2 text-sm font-bold" value={person.managerId || ''} onChange={(event) => updatePerson(person.id, { managerId: event.target.value || null })}>
                    <option value="">No manager</option>
                    {(project.companyPeople || []).filter((item) => item.id !== person.id && ['MANAGER', 'TEAM_LEAD'].includes(item.designation)).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </section>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STATUSES.map((status) => {
          const tasks = project.tasks.filter((task) => task.status === status);
          return (
            <div key={status} className="kanban-column p-4">
              <h3 className="mb-4 flex items-center justify-between font-black">
                <span className="flex items-center gap-2">{statusIcon(status)} {status.replace('_', ' ')}</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-500">{tasks.length}</span>
              </h3>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="task-card p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h4 className="font-black leading-snug">{task.title}</h4>
                      {canManagePeople && <button onClick={() => deleteTask(task.id)} className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>}
                    </div>
                    {task.description && <p className="mb-3 text-sm leading-6 text-gray-500">{task.description}</p>}
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${priorityClass(task.priority)}`}><Flag size={12} /> {task.priority}</span>
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          <CalendarDays size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {task.assignee && <div className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-600"><Users size={13} /> {task.assignee.name}</div>}
                    {(task.workDone || task.currentWork || task.issues || task.technologies) && (
                      <div className="mb-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                        {task.workDone && <p><b>Done:</b> {task.workDone}</p>}
                        {task.currentWork && <p><b>Going:</b> {task.currentWork}</p>}
                        {task.issues && <p className="text-red-700"><b>Issues:</b> {task.issues}</p>}
                        {task.technologies && <p><b>Tech:</b> {task.technologies}</p>}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select value={task.status} onChange={(event) => updateStatus(task.id, event.target.value)} className="input-field p-2 text-xs font-bold flex-1">
                        {STATUSES.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
                      </select>
                      {canManagePeople && (
                        <select value={task.assignee?.id || ''} onChange={(event) => updateAssignee(task.id, event.target.value)} className="input-field p-2 text-xs font-bold flex-1">
                          <option value="">Unassigned</option>
                          {project.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
                        </select>
                      )}
                    </div>
                    <details className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <summary className="cursor-pointer text-xs font-black text-gray-700">Work update, issues, tech, files</summary>
                      <div className="mt-3 grid gap-2">
                        <textarea className="input-field min-h-16 text-sm" placeholder="What is done?" value={reports[task.id]?.workDone || ''} onChange={(event) => setReports((current) => ({ ...current, [task.id]: { ...current[task.id], workDone: event.target.value } }))} />
                        <textarea className="input-field min-h-16 text-sm" placeholder="What is going on now?" value={reports[task.id]?.currentWork || ''} onChange={(event) => setReports((current) => ({ ...current, [task.id]: { ...current[task.id], currentWork: event.target.value } }))} />
                        <textarea className="input-field min-h-16 text-sm" placeholder="Issues facing" value={reports[task.id]?.issues || ''} onChange={(event) => setReports((current) => ({ ...current, [task.id]: { ...current[task.id], issues: event.target.value } }))} />
                        <input className="input-field text-sm" placeholder="Technologies using" value={reports[task.id]?.technologies || ''} onChange={(event) => setReports((current) => ({ ...current, [task.id]: { ...current[task.id], technologies: event.target.value } }))} />
                        <button type="button" onClick={() => saveReport(task.id)} className="btn-primary py-2 text-sm">Save update</button>
                        <label className="btn-secondary cursor-pointer py-2 text-sm">
                          <FileUp size={15} /> Upload doc/code file
                          <input type="file" className="hidden" multiple onChange={(event) => uploadFiles(task.id, Array.from(event.target.files || []))} />
                        </label>
                        {task.attachments?.length > 0 && (
                          <div className="space-y-1 text-xs text-gray-500">
                            {task.attachments.map((file) => <div key={file.id}>File: {file.filename} ({Math.round(file.size / 1024)} KB)</div>)}
                          </div>
                        )}
                        {task.reports?.length > 0 && (
                          <div className="space-y-2">
                            {task.reports.map((report) => (
                              <div key={report.id} className="rounded bg-white p-2 text-xs text-gray-600">
                                <b>{report.user.name}</b>: {report.workDone || report.currentWork || report.issues || report.technologies}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showTask && (
        <Modal onClose={() => setShowTask(false)}>
          <form onSubmit={createTask}>
            <h2 className="mb-1 text-2xl font-black">New Task</h2>
            <p className="mb-5 text-sm text-gray-500">Create the task first. Employees will update progress, blockers, technologies, and files inside the task card.</p>
            <input className="input-field mb-3" placeholder="Title" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required />
            <textarea className="input-field mb-3 min-h-24" placeholder="Description" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} />
            <select className="input-field mb-3" value={taskForm.assigneeId} onChange={(event) => setTaskForm({ ...taskForm, assigneeId: event.target.value })}>
              <option value="">Unassigned</option>
              {project.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
            </select>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <select className="input-field" value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
              </select>
              <input type="date" className="input-field" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} />
            </div>
            <button className="btn-primary w-full py-3">Create Task</button>
          </form>
        </Modal>
      )}

      {showMember && (
        <Modal onClose={() => setShowMember(false)}>
          <form onSubmit={addMember}>
            <h2 className="mb-1 text-2xl font-black">Add Member</h2>
            <p className="mb-5 text-sm text-gray-500">Enter a registered user&apos;s real email. New users should sign up first.</p>
            <input type="email" className="input-field mb-4" placeholder="teammate@company.com" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} required />
            <button className="btn-primary w-full py-3">Add Member</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel w-full max-w-md rounded-lg p-6" onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}

function priorityClass(priority) {
  if (priority === 'HIGH') return 'bg-red-100 text-red-700';
  if (priority === 'LOW') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-800';
}

function statusIcon(status) {
  if (status === 'DONE') return <CheckCircle2 size={17} className="text-teal-600" />;
  if (status === 'IN_PROGRESS') return <Clock3 size={17} className="text-amber-500" />;
  return <Plus size={17} className="text-gray-500" />;
}
