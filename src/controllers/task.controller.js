const asyncHandler = require('../utils/asyncHandler');
const taskService = require('../services/task.service');

const listMyTasks = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const result = await taskService.listMyTasks(req.user, { status });
  res.status(200).json(result);
});

const getMyTask = asyncHandler(async (req, res) => {
  const result = await taskService.getMyTask(req.user, req.params.id);
  res.status(200).json(result);
});

const createTask = asyncHandler(async (req, res) => {
  const result = await taskService.createTask(req.user, req.body);
  res.status(201).json(result);
});

const updateTask = asyncHandler(async (req, res) => {
  const result = await taskService.updateTask(req.user, req.params.id, req.body);
  res.status(200).json(result);
});

const updateStatus = asyncHandler(async (req, res) => {
  const result = await taskService.updateStatus(req.user, req.params.id, req.body.status);
  res.status(200).json(result);
});

const addComment = asyncHandler(async (req, res) => {
  const result = await taskService.addMyComment(req.user, req.params.id, req.body.message);
  res.status(201).json(result);
});

const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.user, req.params.id);
  res.status(204).send();
});

module.exports = { listMyTasks, getMyTask, createTask, updateTask, updateStatus, addComment, deleteTask };