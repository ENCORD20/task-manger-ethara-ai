const express = require('express');
const router = express.Router();
const projectController = require('../controller/projectController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All project routes require authentication
router.use(authenticate);

// Get projects (Admin gets owned, Member gets assigned)
router.get('/', projectController.getProjects);

// Get trash projects
router.get('/trash', projectController.getTrashProjects);
router.delete('/trash/empty', authorize('admin'), projectController.emptyTrashProjects);
router.delete('/trash/:id', authorize('admin'), projectController.permanentDeleteProject);

// Get single project
router.get('/:id', projectController.getProjectById);

// Admin only routes
router.post('/', authorize('admin'), projectController.createProject);
router.put('/:id', authorize('admin'), projectController.updateProject);
router.delete('/:id', authorize('admin'), projectController.deleteProject);

module.exports = router;
