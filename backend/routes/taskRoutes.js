const express = require('express');
const router = express.Router({ mergeParams: true }); // Allows access to projectId from parent router if nested, but here we pass it directly or in body
const taskController = require('../controller/taskController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);

// Get trash tasks
router.get('/trash', taskController.getTrashTasks);
router.delete('/trash/empty', authorize('admin'), taskController.emptyTrashTasks);
router.delete('/trash/:id', authorize('admin'), taskController.permanentDeleteTask);

// Get assigned tasks
router.get('/assigned', taskController.getAssignedTasks);

// Get tasks for a specific project
router.get('/project/:projectId', taskController.getTasksByProject);

// Create task in a project (Admin only)
router.post('/project/:projectId', authorize('admin'), taskController.createTask);

// Update task status (Admin or Assigned Member)
router.patch('/:id/status', taskController.updateTaskStatus);

// Update task details (Admin only)
router.put('/:id', authorize('admin'), taskController.updateTask);

// Delete task (Admin only)
router.delete('/:id', authorize('admin'), taskController.deleteTask);

module.exports = router;
