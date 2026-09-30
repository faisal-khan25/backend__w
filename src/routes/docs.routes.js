const express = require('express');
const controller = require('../controllers/docs.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.listDocs);

router.post('/', controller.createDoc);

router.get('/:id',          controller.getDoc);
router.put('/:id/content',  controller.updateDocContent);
router.patch('/:id/content', controller.updateDocContent);
router.put('/:id/rename',   controller.renameDoc);
router.delete('/:id',       controller.deleteDoc);

module.exports = router;
