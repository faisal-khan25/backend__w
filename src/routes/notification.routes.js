const express = require('express');
const controller = require('../controllers/notification.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  listMyValidators,
  idParamValidator,
  broadcastValidators,
} = require('../validators/notification.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/', listMyValidators, controller.listMy);
router.post('/:id/read', idParamValidator, controller.markAsRead);
router.post('/read-all', controller.markAllAsRead);
router.delete('/:id', idParamValidator, controller.remove);

router.post('/broadcast', requireRole('ADMIN', 'HR'), broadcastValidators, controller.broadcast);

module.exports = router;
