const express = require('express');
const controller = require('../controllers/drive.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { driveUpload } = require('../middleware/upload');

const router = express.Router();
router.use(requireAuth);

function normalizeViewParams(req, res, next) {
  const { view } = req.query;
  if (view === 'starred') {
    req.query.starred = 'true';
  } else if (view === 'trash' || view === 'trashed') {
    req.query.trashed = 'true';
  }
  delete req.query.view;
  next();
}

router.get('/',            normalizeViewParams, controller.listItems);
router.get('/items',       normalizeViewParams, controller.listItems);

router.get('/shared-with-me',        controller.listSharedWithMe);
router.get('/items/shared-with-me',  controller.listSharedWithMe);

router.post('/folder',        controller.createFolder);
router.post('/folders',       controller.createFolder);
router.post('/items/folder',  controller.createFolder);

router.post('/upload',        driveUpload.single('file'), controller.uploadFile);
router.post('/files',         driveUpload.single('file'), controller.uploadFile);
router.post('/items/file',    driveUpload.single('file'), controller.uploadFile);

router.get('/:id',          controller.getItem);
router.get('/:id/download', controller.downloadItem);

router.put('/:id/rename',   controller.renameItem);
router.put('/:id/move',     controller.moveItem);

router.post('/:id/star',    controller.starItem);
router.delete('/:id/star',  controller.unstarItem);

router.post('/:id/trash',   controller.trashItem);
router.post('/:id/restore', controller.restoreItem);
router.delete('/:id',       controller.deleteItemPermanently);

router.get('/:id/shares',                   controller.listShares);
router.post('/:id/shares',                  controller.shareItem);
router.put('/:id/shares/:shareId',          controller.updateSharePermission);
router.delete('/:id/shares/:shareId',       controller.removeShare);

router.get('/items/:id',              controller.getItem);
router.get('/items/:id/download',     controller.downloadItem);
router.put('/items/:id/rename',       controller.renameItem);
router.put('/items/:id/move',         controller.moveItem);
router.post('/items/:id/star',        controller.starItem);
router.delete('/items/:id/star',      controller.unstarItem);
router.post('/items/:id/trash',       controller.trashItem);
router.post('/items/:id/restore',     controller.restoreItem);
router.delete('/items/:id',           controller.deleteItemPermanently);
router.get('/items/:id/shares',               controller.listShares);
router.post('/items/:id/shares',              controller.shareItem);
router.put('/items/:id/shares/:shareId',      controller.updateSharePermission);
router.delete('/items/:id/shares/:shareId',   controller.removeShare);

module.exports = router;
