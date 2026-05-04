const Task = require('../model/Task');
const Project = require('../model/Project');

// Create a task inside a project (Admin only)
exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority } = req.body;
    const projectId = req.params.projectId;

    // Verify project exists and is owned by admin
    const project = await Project.findOne({ _id: projectId, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    const newTask = new Task({
      title,
      description,
      project: projectId,
      assignedTo: assignedTo || null,
      dueDate,
      priority: priority || 'Low'
    });

    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
};

// Get tasks for a specific project
exports.getTasksByProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId);
    
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Everyone can view active tasks
    const tasks = await Task.find({ project: projectId, isDeleted: false }).populate('assignedTo', 'username');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

// Update task status (Admin or Assigned Member)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id).populate('project');
    
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isOwner = req.user.role === 'admin' && task.project.owner.toString() === req.user.id;
    const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.id;

    if (!isOwner && !isAssigned) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    task.status = status;
    await task.save();
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

// Update task details (Admin only)
exports.updateTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, status } = req.body;
    const task = await Task.findById(req.params.id).populate('project');
    
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (status) task.status = status;

    await task.save();
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};


// Delete a task (Admin only) (Soft delete)
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    task.isDeleted = true;
    await task.save();
    
    res.json({ message: 'Task moved to trash' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Get Trash Tasks
exports.getTrashTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ isDeleted: true }).populate('project', 'name').populate('assignedTo', 'username');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trash tasks', error: error.message });
  }
};

// Permanently delete task (Admin only)
exports.permanentDeleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, isDeleted: true });
    if (!task) return res.status(404).json({ message: 'Task not found in trash' });
    res.json({ message: 'Task permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

// Empty trash tasks (Admin only)
exports.emptyTrashTasks = async (req, res) => {
  try {
    await Task.deleteMany({ isDeleted: true });
    res.json({ message: 'Task trash emptied' });
  } catch (error) {
    res.status(500).json({ message: 'Error emptying trash', error: error.message });
  }
};

// Get tasks assigned to the current user
exports.getAssignedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id, isDeleted: false })
      .populate('project', 'name');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned tasks', error: error.message });
  }
};
