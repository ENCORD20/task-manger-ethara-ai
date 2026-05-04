import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { apiUrl } from "../apiUrl";

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  owner: { _id: string; username: string };
  members: { _id: string; username: string }[];
  createdAt: string;
}

interface Task {
  _id: string;
  title: string;
  project: { _id: string; name: string };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{
    id: string;
    username: string;
    role: string;
    profilePicture?: string;
  } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trashProjects, setTrashProjects] = useState<Project[]>([]);
  const [trashTasks, setTrashTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState<
    "active" | "completed" | "trash" | "profile"
  >(location.state?.view || "active");

  // Profile edit states
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editProfilePic, setEditProfilePic] = useState("");

  // Create project state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  // Deployment modal state
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [deploymentProjectId, setDeploymentProjectId] = useState<string | null>(
    null,
  );
  const [deploymentProjectName, setDeploymentProjectName] =
    useState<string>("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);

      // Redirect members to member dashboard
      if (parsedUser.role !== "admin") {
        navigate("/member-dashboard");
        return;
      }

      setUser(parsedUser);
      setEditUsername(parsedUser.username);
      setEditProfilePic(parsedUser.profilePicture || "");

      fetchProjects(token);
      fetchTrash(token);
      fetchAssignedTasks(token);
    } catch (e) {
      navigate("/login");
    }
  }, [navigate, location.state]);

  const fetchAssignedTasks = async (token: string) => {
    try {
      const res = await fetch(apiUrl("/api/tasks/assigned"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAssignedTasks(await res.json());
    } catch (error) {
      console.error("Failed to fetch assigned tasks", error);
    }
  };

  const fetchProjects = async (token: string) => {
    try {
      const res = await fetch(apiUrl("/api/projects"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrash = async (token: string) => {
    try {
      const pRes = await fetch(apiUrl("/api/projects/trash"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pRes.ok) setTrashProjects(await pRes.json());

      const tRes = await fetch(apiUrl("/api/tasks/trash"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tRes.ok) setTrashTasks(await tRes.json());
    } catch (error) {
      console.error("Failed to fetch trash", error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/projects"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewProjectName("");
        setNewProjectDesc("");
        fetchProjects(token!);
      }
    } catch (error) {
      console.error("Failed to create project", error);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (
      !window.confirm(
        "Are you sure you want to delete this project? It will be moved to trash.",
      )
    )
      return;

    const token = sessionStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/projects/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchProjects(token!);
        fetchTrash(token!);
      }
    } catch (error) {
      console.error("Failed to delete project", error);
    }
  };

  const handlePushToDeployment = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    const project = (
      currentView === "active" ? activeProjects : completedProjects
    ).find((p) => p._id === id);
    if (project) {
      setDeploymentProjectId(id);
      setDeploymentProjectName(project.name);
      setShowDeploymentModal(true);
    }
  };

  const confirmDeployment = async () => {
    if (!deploymentProjectId) return;

    const token = sessionStorage.getItem("token");
    try {
      // First soft delete the project
      const res = await fetch(
        apiUrl(`/api/projects/${deploymentProjectId}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        // Then permanently delete it from trash
        const permRes = await fetch(
          apiUrl(`/api/projects/trash/${deploymentProjectId}`),
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (permRes.ok) {
          setShowDeploymentModal(false);
          setDeploymentProjectId(null);
          setDeploymentProjectName("");
          fetchProjects(token!);
          fetchTrash(token!);
        }
      }
    } catch (error) {
      console.error("Failed to push project to deployment", error);
      alert("Failed to push project to deployment");
    }
  };

  const handlePermanentDeleteProject = async (id: string) => {
    if (
      !window.confirm("Permanently delete this project? This cannot be undone.")
    )
      return;
    const token = sessionStorage.getItem("token");
    try {
      const res = await fetch(
        apiUrl(`/api/projects/trash/${id}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) fetchTrash(token!);
    } catch (error) {
      console.error("Failed to permanently delete project", error);
    }
  };

  const handlePermanentDeleteTask = async (id: string) => {
    if (!window.confirm("Permanently delete this task? This cannot be undone."))
      return;
    const token = sessionStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/tasks/trash/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchTrash(token!);
    } catch (error) {
      console.error("Failed to permanently delete task", error);
    }
  };

  const handleEmptyTrash = async () => {
    if (
      !window.confirm(
        "Are you sure you want to completely empty the trash? ALL deleted projects and tasks will be permanently removed!",
      )
    )
      return;
    const token = sessionStorage.getItem("token");
    try {
      await fetch(apiUrl("/api/projects/trash/empty"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetch(apiUrl("/api/tasks/trash/empty"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTrash(token!);
    } catch (error) {
      console.error("Failed to empty trash", error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/auth/profile"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: editUsername,
          password: editPassword || undefined,
          profilePicture: editProfilePic,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        setEditPassword("");
        alert("Profile updated successfully!");
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  if (!user) return null;

  const activeProjects = projects.filter((p) => p.status === "active");
  const completedProjects = projects.filter((p) => p.status === "completed");

  return (
    <div className="min-h-screen w-full bg-[#121212] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col">
        <div className="px-6 py-4 border-b border-[#2a2a2a]">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
        </div>

        <div className="p-6 border-b border-[#2a2a2a] flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2a2a2a] border border-[#333] flex items-center justify-center shrink-0">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-gray-400">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white truncate">
              {user.username}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="px-1.5 py-0.5 bg-[#2a2a2a] rounded border border-[#333]">
                {user.role.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setCurrentView("active")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentView === "active" ? "bg-[#2a2a2a] text-white" : "text-gray-400 hover:text-white hover:bg-[#222]"}`}
          >
            Active Projects ({activeProjects.length})
          </button>
          <button
            onClick={() => setCurrentView("completed")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentView === "completed" ? "bg-[#2a2a2a] text-white" : "text-gray-400 hover:text-white hover:bg-[#222]"}`}
          >
            Completed Projects ({completedProjects.length})
          </button>
          <button
            onClick={() => setCurrentView("trash")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentView === "trash" ? "bg-red-900/20 text-red-400" : "text-gray-400 hover:text-red-400 hover:bg-red-900/10"}`}
          >
            Trash ({trashProjects.length + trashTasks.length})
          </button>
          <div className="pt-4 mt-4 border-t border-[#2a2a2a]">
            <button
              onClick={() => setCurrentView("profile")}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentView === "profile" ? "bg-[#2a2a2a] text-white" : "text-gray-400 hover:text-white hover:bg-[#222]"}`}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-screen overflow-y-auto">
        <header className="p-6 flex justify-between items-center sticky top-0 bg-[#121212]/90 backdrop-blur-md z-10 border-b border-transparent shrink-0">
          <h2 className="text-2xl font-semibold text-white capitalize">
            {currentView === "active" && "Active Projects"}
            {currentView === "completed" && "Completed Projects"}
            {currentView === "trash" && "Trash"}
            {currentView === "profile" && "My Profile"}
          </h2>
          <div className="flex gap-3">
            {user.role === "admin" &&
              currentView === "trash" &&
              (trashProjects.length > 0 || trashTasks.length > 0) && (
                <button
                  onClick={handleEmptyTrash}
                  className="px-4 py-2 bg-red-900/40 text-red-400 font-semibold rounded-lg hover:bg-red-900/60 border border-red-800 transition-colors text-sm"
                >
                  Empty Trash
                </button>
              )}
            {user.role === "admin" &&
              (currentView === "active" || currentView === "completed") && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  + New Project
                </button>
              )}
          </div>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading...</div>
          ) : currentView === "trash" ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg text-white mb-4 border-b border-[#333] pb-2">
                  Deleted Projects
                </h3>
                {trashProjects.length === 0 ? (
                  <p className="text-gray-500 text-sm">No deleted projects.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trashProjects.map((p) => (
                      <div
                        key={p._id}
                        className="bg-red-900/10 border border-red-900/30 rounded-xl p-6 relative group"
                      >
                        <h3 className="text-lg font-bold text-red-400 line-through mb-2 pr-6">
                          {p.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {p.description}
                        </p>

                        {user.role === "admin" && (
                          <button
                            onClick={() => handlePermanentDeleteProject(p._id)}
                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-all"
                            title="Delete Permanently"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg text-white mb-4 border-b border-[#333] pb-2">
                  Deleted Tasks
                </h3>
                {trashTasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No deleted tasks.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trashTasks.map((t) => (
                      <div
                        key={t._id}
                        className="bg-red-900/10 border border-red-900/30 rounded-xl p-6 relative group"
                      >
                        <h3 className="text-base font-bold text-red-400 line-through mb-1 pr-6">
                          {t.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          From project: {t.project?.name}
                        </p>

                        {user.role === "admin" && (
                          <button
                            onClick={() => handlePermanentDeleteTask(t._id)}
                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-all"
                            title="Delete Permanently"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : currentView === "profile" ? (
            <div className="max-w-4xl space-y-8">
              {/* Profile Details */}
              <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 flex items-start gap-8">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-[#2a2a2a] border-4 border-[#333] flex items-center justify-center shrink-0">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl font-bold text-gray-400">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {user.username}
                  </h3>
                  <span className="px-3 py-1 bg-blue-900/30 text-blue-400 border border-blue-800 rounded-full text-sm font-semibold mb-6 inline-block">
                    {user.role.toUpperCase()}
                  </span>

                  <form
                    onSubmit={handleUpdateProfile}
                    className="space-y-4 max-w-md mt-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Profile Picture URL
                      </label>
                      <input
                        type="url"
                        value={editProfilePic}
                        onChange={(e) => setEditProfilePic(e.target.value)}
                        placeholder="https://example.com/avatar.png"
                        className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        New Password (leave blank to keep current)
                      </label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Save Profile Updates
                    </button>
                  </form>
                </div>
              </div>

              {/* Assigned Tasks */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  Tasks Assigned
                  <span className="bg-[#2a2a2a] text-sm px-3 py-0.5 rounded-full border border-[#333]">
                    {assignedTasks.length}
                  </span>
                </h3>
                {assignedTasks.length === 0 ? (
                  <p className="text-gray-500 bg-[#1a1a1a] p-6 rounded-xl border border-[#333]">
                    You have no tasks assigned right now.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignedTasks.map((task) => (
                      <Link
                        to={`/project/${task.project?._id}`}
                        key={task._id}
                        className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5 hover:border-gray-500 transition-all block group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                            {task.title}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">
                          Project:{" "}
                          <span className="text-gray-300">
                            {task.project?.name}
                          </span>
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {(currentView === "active" ? activeProjects : completedProjects)
                .length === 0 ? (
                <div className="text-center py-16 bg-[#1a1a1a] rounded-xl border border-[#333]">
                  <h3 className="text-lg text-white mb-2">No projects found</h3>
                  <p className="text-gray-400 text-sm">
                    {user.role === "admin" && currentView === "active"
                      ? "Create a project to get started."
                      : "Nothing to see here."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(currentView === "active"
                    ? activeProjects
                    : completedProjects
                  ).map((project) => (
                    <Link
                      to={`/project/${project._id}`}
                      key={project._id}
                      className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-6 hover:border-gray-500 transition-all duration-300 flex flex-col h-full relative group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-white truncate pr-4">
                          {project.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-semibold border ${project.status === "active" ? "bg-[#121212] text-white border-[#333]" : "bg-green-900/40 text-green-400 border-green-800"}`}
                        >
                          {project.status === "completed"
                            ? "FINISHED"
                            : project.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-6 flex-1 line-clamp-2 break-words">
                        {project.description || "No description provided."}
                      </p>
                      <div className="text-xs text-gray-500 flex justify-between items-center pt-4 border-t border-[#333]">
                        <span>{project.members.length} member(s)</span>
                        <span>
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {user.role === "admin" && currentView === "active" && (
                        <button
                          onClick={(e) => handleDeleteProject(e, project._id)}
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 bg-red-900/80 text-white rounded-lg hover:bg-red-600 transition-all"
                          title="Delete Project"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                      {user.role === "admin" && currentView === "completed" && (
                        <button
                          onClick={(e) =>
                            handlePushToDeployment(e, project._id)
                          }
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-blue-600/80 text-white rounded-lg hover:bg-blue-500 transition-all text-xs font-medium flex items-center gap-1.5"
                          title="Deployment"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 19V5M5 12l7-7 7 7"></path>
                          </svg>
                          Push
                        </button>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              Create New Project
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm Push to font-medium text-gray-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white transition-colors h-24 resize-none"
                  
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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

      {/* Deployment Modal */}
      {showDeploymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-900/30 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-400"
                >
                  <path d="M12 19V5M5 12l7-7 7 7"></path>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Ready to Push to Deployment?
            </h2>
            <p className="text-gray-400 text-center mb-6">
              Project{" "}
              <span className="text-white font-semibold">
                "{deploymentProjectName}"
              </span>{" "}
              will be deployed and moved to production.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowDeploymentModal(false)}
                className="flex-1 px-4 py-2 bg-[#121212] hover:bg-[#2a2a2a] border border-[#333] text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeployment}
                className="flex-1 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Push
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
