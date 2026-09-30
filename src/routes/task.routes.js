const express = require('express');
const controller = require('../controllers/task.controller');
const { requireAuth } = require('../middleware/requireAuth');
const {
  createTaskValidators,
  updateTaskValidators,
  listMyTasksValidators,
  updateStatusValidators,
  addCommentValidators,
} = require('../validators/task.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/my', listMyTasksValidators, controller.listMyTasks);
router.post('/', createTaskValidators, controller.createTask);
router.get('/:id', controller.getMyTask);
router.patch('/:id', updateTaskValidators, controller.updateTask);
router.patch('/:id/status', updateStatusValidators, controller.updateStatus);
router.post('/:id/comments', addCommentValidators, controller.addComment);
router.delete('/:id', controller.deleteTask);

module.exports = router;