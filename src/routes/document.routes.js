const express = require('express');
const controller = require('../controllers/document.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { documentUpload } = require('../config/upload');
const {
  uploadDocumentValidators,
  listMyDocumentsValidators,
} = require('../validators/document.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/my', listMyDocumentsValidators, controller.listMyDocuments);
router.post('/', documentUpload.single('file'), uploadDocumentValidators, controller.uploadDocument);
router.get('/:id/download', controller.downloadDocument);
router.delete('/:id', controller.deleteDocument);

module.exports = router;
