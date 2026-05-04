const Project = require('../model/Project');

// Create a new project (Admin only)
exports.createProject = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    
    const newProject = new Project({
      name,
      description,
      owner: req.user.id,
      members: members || []
    });

    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ message: 'Error creating project', error: error.message });
  }
};

// Get all projects for a user
exports.getProjects = async (req, res) => {
  try {
    // Both Admins and Members can see all active projects in the system
    const projects = await Project.find({ isDeleted: false })
      .populate('owner', 'username')
      .populate('members', 'username');
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
};

// Get a single project
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, isDeleted: false })
      .populate('owner', 'username')
      .populate('members', 'username');
      
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    // Everyone (Admins and Members) can view any project details
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project', error: error.message });
  }
};

// Update project (Admin only)
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      req.body,
      { new: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found or unauthorized' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error updating project', error: error.message });
  }
};

// Delete project (Admin only) (Soft Delete)
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { isDeleted: true },
      { new: true }
    );
    if (!project) return res.status(404).json({ message: 'Project not found or unauthorized' });
    
    // Soft delete associated tasks as well
    const Task = require('../model/Task');
    await Task.updateMany({ project: req.params.id }, { isDeleted: true });
    
    res.json({ message: 'Project moved to trash' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project', error: error.message });
  }
};

// Get Trash Projects
exports.getTrashProjects = async (req, res) => {
  try {
    const projects = await Project.find({ isDeleted: true })
      .populate('owner', 'username')
      .populate('members', 'username');
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching trash projects', error: error.message });
  }
};

// Permanently delete project (Admin only)
exports.permanentDeleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, isDeleted: true });
    if (!project) return res.status(404).json({ message: 'Project not found in trash' });
    
    // Also hard delete associated tasks
    const Task = require('../model/Task');
    await Task.deleteMany({ project: req.params.id });

    res.json({ message: 'Project permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project', error: error.message });
  }
};

// Empty trash projects (Admin only)
exports.emptyTrashProjects = async (req, res) => {
  try {
    // Find all soft deleted projects
    const projects = await Project.find({ isDeleted: true });
    const projectIds = projects.map(p => p._id);
    
    await Project.deleteMany({ isDeleted: true });
    
    // Hard delete associated tasks
    const Task = require('../model/Task');
    await Task.deleteMany({ project: { $in: projectIds } });

    res.json({ message: 'Project trash emptied' });
  } catch (error) {
    res.status(500).json({ message: 'Error emptying trash', error: error.message });
  }
};
