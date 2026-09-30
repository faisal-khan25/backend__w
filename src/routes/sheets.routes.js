const express = require('express');
const controller = require('../controllers/sheets.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/',              controller.listSheets);
router.post('/',             controller.createSheet);
router.get('/:id',           controller.getSheet);
router.put('/:id/content',   controller.updateSheetContent);
router.patch('/:id/content', controller.updateSheetContent);
router.put('/:id/rename',    controller.renameSheet);
router.delete('/:id',        controller.deleteSheet);

module.exports = router;
