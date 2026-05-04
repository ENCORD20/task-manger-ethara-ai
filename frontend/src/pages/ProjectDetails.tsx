import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiUrl';

interface User {
  _id: string;
  username: string;
  profilePicture?: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  owner: User;
  members: User[];
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority?: 'Low' | 'Mid' | 'High';
  assignedTo?: string | null;
  dueDate: string;
}

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string; profilePicture?: string } | null>(null);
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Low');

  // Edit Project states
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Description modal state
  const [showDescModal, setShowDescModal] = useState(false);
  const [selectedTaskDesc, setSelectedTaskDesc] = useState<{title: string, description: string} | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const userData = sessionStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setCurrentUser(parsedUser);
      fetchProjectData(token);
      if (parsedUser.role === 'admin') {
        fetchAllUsers(token);
      }
    } catch (e) {
      navigate('/login');
    }
  }, [id, navigate]);

  const fetchAllUsers = async (token: string) => {
    try {
      const res = await fetch(apiUrl('/api/auth/users'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users', error);
    }
  };

  const fetchProjectData = async (token: string) => {
    try {
      // Fetch Project Info
      const projRes = await fetch(apiUrl(`/api/projects/${id}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!projRes.ok) {
        if (projRes.status === 403 || projRes.status === 404) navigate('/dashboard');
        return;
      }
      
      const projData = await projRes.json();
      setProject(projData);

      // Fetch Tasks
      const tasksRes = await fetch(apiUrl(`/api/tasks/project/${id}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error fetching project data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/api/tasks/project/${id}`), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: newTaskTitle, 
          description: newTaskDesc, 
          assignedTo: newTaskAssignee || undefined,
          priority: newTaskPriority
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setTasks([...tasks, data]);
        setShowTaskModal(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskAssignee('');
        setNewTaskPriority('Low');
      } else {
        fetchProjectData(token!);
      }
    } catch (error) {
      console.error('Failed to create task', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/api/tasks/${taskId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTasks(tasks.filter(t => t._id !== taskId));
      } else {
        alert("Failed to delete task or unauthorized.");
      }
    } catch (error) {
      console.error('Failed to delete task', error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/api/tasks/${taskId}/status`), {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus as any } : t));
      } else {
        alert("You might not have permission to update this task.");
      }
    } catch (error) {
      console.error('Failed to update task', error);
    }
  };

  const handleSubmitProject = async () => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/api/projects/${id}`), {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'completed' })
      });
      
      if (res.ok) {
        setProject({ ...project!, status: 'completed' });
      } else {
        alert("Failed to submit project.");
      }
    } catch (error) {
      console.error('Failed to submit project', error);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/api/projects/${id}`), {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editProjectName, description: editProjectDesc })
      });
      
      if (res.ok) {
        const updatedProj = await res.json();
        setProject({ ...project!, name: updatedProj.name, description: updatedProj.description });
        setShowEditProjectModal(false);
      } else {
        alert("Failed to update project.");
      }
    } catch (error) {
      console.error('Failed to update project', error);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    // For Firefox compatibility
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedTaskId) {
      const task = tasks.find(t => t._id === draggedTaskId);
      if (task && task.status !== status) {
        handleStatusChange(draggedTaskId, status);
      }
    }
    setDraggedTaskId(null);
  };

  if (loading) return <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">Loading...</div>;
  if (!project) return <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">Project not found</div>;

  const allTasksDone = tasks.length > 0 && tasks.every(t => t.status === 'done');
  const isFinished = project.status === 'completed';

  const renderColumn = (statusKey: 'todo' | 'in_progress' | 'done', title: string) => {
    const columnTasks = tasks.filter(t => t.status === statusKey);
    return (
      <div 
        className="w-80 bg-[#121212] border border-[#2a2a2a] rounded-xl flex flex-col h-[calc(100vh-120px)]"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, statusKey)}
      >
        <div className="p-4 border-b border-[#2a2a2a]">
          <h3 className="font-semibold text-white">{title} <span className="text-gray-500 text-sm ml-2">{columnTasks.length}</span></h3>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {columnTasks.map(task => (
            <div 
              key={task._id} 
              draggable={!isFinished}
              onDragStart={(e) => !isFinished && handleDragStart(e, task._id)}
              className={`bg-[#1e1e1e] border border-[#333] rounded-lg p-4 transition-colors ${!isFinished ? 'hover:border-gray-500 cursor-grab active:cursor-grabbing' : 'opacity-70'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-medium text-white">{task.title}</h4>
                {currentUser?.role === 'admin' && !isFinished && (
                  <button onClick={() => handleDeleteTask(task._id)} className="text-gray-500 hover:text-red-500 transition-colors">
                    &times;
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4 break-words whitespace-pre-wrap">
                {task.description && task.description.length > 100
                  ? task.description.substring(0, 100) + '...'
                  : task.description}
                {task.description && task.description.length > 100 && (
                  <button 
                    onClick={() => setSelectedTaskDesc({ title: task.title, description: task.description })}
                    className="ml-1 text-blue-400 hover:text-blue-300 transition-colors font-medium text-xs"
                  >
                    Read More
                  </button>
                )}
              </p>
              
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  task.priority === 'High' ? 'bg-red-900/30 text-red-400 border-red-800' :
                  task.priority === 'Mid' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                  'bg-green-900/30 text-green-400 border-green-800'
                }`}>
                  {task.priority ? task.priority.toUpperCase() : 'LOW'}
                </span>
                {task.assignedTo && (
                  <div className="text-xs text-gray-500">
                    Assignee: <span className="text-gray-300">{typeof task.assignedTo === 'object' && task.assignedTo !== null ? (task.assignedTo as any).username : users.find(u => u._id === task.assignedTo)?.username || 'Unknown'}</span>
                  </div>
                )}
              </div>

              <select 
                className="w-full bg-[#121212] text-xs text-gray-300 border border-[#333] rounded p-1 outline-none focus:border-white disabled:opacity-50"
                value={task.status}
                onChange={(e) => handleStatusChange(task._id, e.target.value)}
                disabled={isFinished}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          ))}
          {columnTasks.length === 0 && (
            <div className="text-center text-gray-600 text-sm py-8 border-2 border-dashed border-[#2a2a2a] rounded-lg">
              Drop tasks here
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-[#121212] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col hidden md:flex">
        <div className="p-6 border-b border-[#2a2a2a] flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2a2a2a] border border-[#333] flex items-center justify-center shrink-0">
            {currentUser?.profilePicture ? (
              <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-gray-400">{currentUser?.username?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white truncate">{currentUser?.username}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="px-1.5 py-0.5 bg-[#2a2a2a] rounded border border-[#333]">
                {currentUser?.role?.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => navigate('/dashboard', { state: { view: 'active' } })}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors text-gray-400 hover:text-white hover:bg-[#222]"
          >
            Active Projects
          </button>
          <button 
            onClick={() => navigate('/dashboard', { state: { view: 'completed' } })}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors text-gray-400 hover:text-white hover:bg-[#222]"
          >
            Completed Projects
          </button>
          <button 
            onClick={() => navigate('/dashboard', { state: { view: 'trash' } })}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors text-gray-400 hover:text-red-400 hover:bg-red-900/10"
          >
            Trash
          </button>
          <div className="pt-4 mt-4 border-t border-[#2a2a2a]">
            <button 
              onClick={() => navigate('/dashboard', { state: { view: 'profile' } })}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors text-gray-400 hover:text-white hover:bg-[#222]"
            >
              My Profile
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-[#2a2a2a]">
          <button 
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-white rounded-lg transition-colors text-sm"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
        {/* Header */}
        <header className="w-full p-6 flex justify-between items-center border-b border-[#2a2a2a] bg-[#121212] z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors">
              &larr; Back
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  {project.name}
                  {currentUser?.role === 'admin' && !isFinished && (
                    <button 
                      onClick={() => {
                        setEditProjectName(project.name);
                        setEditProjectDesc(project.description);
                        setShowEditProjectModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-all"
                      title="Edit Project Details"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                  )}
                </h1>
                {isFinished && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-green-900/40 text-green-400 border border-green-800 rounded">
                    FINISHED
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1 max-w-3xl break-words whitespace-pre-wrap">
                {project.description && project.description.length > 150
                  ? project.description.substring(0, 150) + '...'
                  : project.description}
                {project.description && project.description.length > 150 && (
                  <button 
                    onClick={() => setShowDescModal(true)}
                    className="ml-2 text-blue-400 hover:text-blue-300 transition-colors font-medium text-xs"
                  >
                    Read More
                  </button>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {currentUser?.role === 'admin' && allTasksDone && !isFinished && (
              <button 
                onClick={handleSubmitProject}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-colors text-sm shadow-lg shadow-green-900/20"
              >
                Submit Project
              </button>
            )}
            {currentUser?.role === 'admin' && !isFinished && (
              <button 
                onClick={() => setShowTaskModal(true)}
                className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                + New Task
              </button>
            )}
          </div>
        </header>

        {/* Kanban Board */}
        <main className="flex-1 p-6 overflow-x-auto bg-[#121212]">
          <div className="flex justify-center gap-6 w-full min-w-max h-full">
            {renderColumn('todo', 'To Do')}
            {renderColumn('in_progress', 'In Progress')}
            {renderColumn('done', 'Done')}
          </div>
        </main>
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  placeholder="What needs to be done?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors h-24 resize-none"
                  placeholder="Details..."
                />
              </div>
              {currentUser?.role === 'admin' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Assign To</label>
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                    >
                      <option value="">-- Unassigned --</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>{u.username}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                    >
                      <option value="Low">Low</option>
                      <option value="Mid">Mid</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 px-4 py-2 bg-[#121212] hover:bg-[#2a2a2a] border border-[#333] text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Edit Project Details</h2>
            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  placeholder="Project Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors h-24 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditProjectModal(false)}
                  className="flex-1 px-4 py-2 bg-[#121212] hover:bg-[#2a2a2a] border border-[#333] text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Description Modal */}
      {showDescModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-4 shrink-0">
              <h2 className="text-xl font-bold text-white pr-4">Project Description</h2>
              <button 
                onClick={() => setShowDescModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
              <p className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                {project.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Task Description Modal */}
      {selectedTaskDesc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-4 shrink-0">
              <h2 className="text-xl font-bold text-white pr-4">{selectedTaskDesc.title}</h2>
              <button 
                onClick={() => setSelectedTaskDesc(null)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
              <p className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                {selectedTaskDesc.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
