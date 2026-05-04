import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../apiUrl";

interface User {
  id: string;
  username: string;
  role: string;
  profilePicture?: string;
}

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
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "Low" | "Mid" | "High";
  dueDate: string;
  project: { _id: string; name: string };
  assignedTo: { _id: string; username: string };
  createdAt: string;
}

const MemberDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trashTasks, setTrashTasks] = useState<Task[]>([]);
  const [trashProjects, setTrashProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<
    "projects" | "assigned" | "trash" | "profile"
  >("projects");

  // Profile edit states
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editProfilePic, setEditProfilePic] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);

      // Redirect admins to admin dashboard
      if (parsedUser.role === "admin") {
        navigate("/dashboard");
        return;
      }

      setUser(parsedUser);
      setEditUsername(parsedUser.username);
      setEditProfilePic(parsedUser.profilePicture || "");

      fetchAssignedTasks(token);
      fetchProjects(token);
      fetchTrashTasks(token);
      fetchTrashProjects(token);
    } catch (e) {
      navigate("/login");
    }
  }, [navigate]);

  const fetchAssignedTasks = async (token: string) => {
    try {
      const res = await fetch(apiUrl("/api/tasks/assigned"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAllTasks(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
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
    }
  };

  const fetchTrashTasks = async (token: string) => {
    try {
      const res = await fetch(apiUrl("/api/tasks/trash"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTrashTasks(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch trash tasks", error);
    }
  };

  const fetchTrashProjects = async (token: string) => {
    try {
      const res = await fetch(apiUrl("/api/projects/trash"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTrashProjects(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch trash projects", error);
    }
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

  const handleResetDashboard = () => {
    const u = user;
    if (!u) return;
    if (
      !window.confirm(
        "Are you sure you want to reset your dashboard? This will clear all your filters and return to the Projects view.",
      )
    )
      return;

    setEditUsername(u.username);
    setEditPassword("");
    setEditProfilePic(u.profilePicture || "");
    setCurrentView("projects");
    alert("Dashboard reset successfully!");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const assignedTasks = allTasks.filter((t) => t.status !== "done");
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress");
  const completedTasks = allTasks.filter((t) => t.status === "done");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-900/40 text-gray-400 border-gray-800";
      case "in_progress":
        return "bg-blue-900/40 text-blue-400 border-blue-800";
      case "done":
        return "bg-green-900/40 text-green-400 border-green-800";
      default:
        return "bg-gray-900/40 text-gray-400 border-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Low":
        return "text-green-400";
      case "Mid":
        return "text-yellow-400";
      case "High":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getProgressPercentage = () => {
    const total = allTasks.length;
    if (total === 0) return 0;
    return Math.round((completedTasks.length / total) * 100);
  };

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
            onClick={() => setCurrentView("projects")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentView === "projects" ? "bg-[#2a2a2a] text-white" : "text-gray-400 hover:text-white hover:bg-[#222]"}`}
          >
            Active Projects (
            {projects.filter((p) => p.status === "active").length})
          </button>
          <button
            onClick={() => setCurrentView("assigned")}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentView === "assigned" ? "bg-[#2a2a2a] text-white" : "text-gray-400 hover:text-white hover:bg-[#222]"}`}
          >
            Assigned Tasks ({assignedTasks.length})
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
        <header className="p-6 sticky top-0 bg-[#121212]/90 backdrop-blur-md z-10 border-b border-transparent shrink-0">
          <h2 className="text-2xl font-semibold text-white capitalize">
            {currentView === "projects" && "Active Projects"}
            {currentView === "assigned" && "Assigned Tasks"}
            {currentView === "trash" && "Trash"}
            {currentView === "profile" && "My Profile"}
          </h2>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading...</div>
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
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Save Profile Updates
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDashboard}
                        className="px-6 py-2 bg-[#222] text-white font-semibold rounded-lg hover:bg-[#2a2a2a] border border-[#333] transition-colors"
                      >
                        Reset Dashboard
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Task Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">
                    Total Tasks
                  </h3>
                  <p className="text-4xl font-bold text-white">
                    {allTasks.length}
                  </p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">
                    Completed
                  </h3>
                  <p className="text-4xl font-bold text-green-400">
                    {completedTasks.length}
                  </p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">
                    In Progress
                  </h3>
                  <p className="text-4xl font-bold text-blue-400">
                    {inProgressTasks.length}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Overall Progress
                </h3>
                <div className="w-full bg-[#121212] rounded-full h-3 border border-[#333]">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  {getProgressPercentage()}% Complete
                </p>
              </div>
            </div>
          ) : currentView === "projects" ? (
            <>
              {projects.filter((p) => p.status === "active").length === 0 ? (
                <div className="text-center py-16 bg-[#1a1a1a] rounded-xl border border-[#333]">
                  <h3 className="text-lg text-white mb-2">
                    No active projects
                  </h3>
                  <p className="text-gray-400 text-sm">
                    No active projects available.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects
                    .filter((p) => p.status === "active")
                    .map((project) => (
                      <Link
                        to={`/project/${project._id}`}
                        key={project._id}
                        className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-6 hover:border-gray-500 transition-all duration-300 flex flex-col h-full group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-bold text-white truncate pr-4 group-hover:text-blue-400 transition-colors">
                            {project.name}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded-full font-semibold border bg-[#121212] text-white border-[#333]">
                            {project.status.toUpperCase()}
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
                      </Link>
                    ))}
                </div>
              )}
            </>
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
                        className="bg-red-900/10 border border-red-900/30 rounded-xl p-6"
                      >
                        <h3 className="text-lg font-bold text-red-400 line-through mb-2">
                          {p.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {p.description}
                        </p>
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
                        className="bg-red-900/10 border border-red-900/30 rounded-xl p-6"
                      >
                        <h3 className="text-base font-bold text-red-400 line-through mb-1">
                          {t.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          From project: {t.project?.name}
                        </p>
                        <div className="text-xs text-gray-500 mt-2">
                          <span
                            className={`px-2 py-1 rounded-full font-semibold border ${getStatusColor(t.status)}`}
                          >
                            {t.status === "in_progress"
                              ? "In Progress"
                              : t.status.charAt(0).toUpperCase() +
                                t.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {(currentView === "assigned"
                ? assignedTasks
                : currentView === "progress"
                  ? inProgressTasks
                  : completedTasks
              ).length === 0 ? (
                <div className="text-center py-16 bg-[#1a1a1a] rounded-xl border border-[#333]">
                  <h3 className="text-lg text-white mb-2">No tasks found</h3>
                  <p className="text-gray-400 text-sm">Nothing to see here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(currentView === "assigned"
                    ? assignedTasks
                    : currentView === "progress"
                      ? inProgressTasks
                      : completedTasks
                  ).map((task) => (
                    <Link
                      to={`/project/${task.project?._id}`}
                      key={task._id}
                      className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-6 hover:border-gray-500 transition-all duration-300 flex flex-col h-full group"
                    >
                      <div className="flex justify-between items-start mb-4 gap-3">
                        <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-400 transition-colors flex-1">
                          {task.title}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-semibold border whitespace-nowrap ${getStatusColor(task.status)}`}
                        >
                          {task.status === "in_progress"
                            ? "In Progress"
                            : task.status.charAt(0).toUpperCase() +
                              task.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-4 flex-1 line-clamp-2 break-words">
                        {task.description || "No description provided."}
                      </p>
                      <div className="flex justify-between items-center pt-4 border-t border-[#333] mb-3">
                        <span
                          className={`text-xs font-semibold ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority} Priority
                        </span>
                        <span className="text-xs text-gray-500">
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString()
                            : "No due date"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>
                          Project:{" "}
                          <span className="text-gray-300">
                            {task.project?.name}
                          </span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default MemberDashboard;
