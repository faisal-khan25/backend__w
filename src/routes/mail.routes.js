const express = require('express');
const controller = require('../controllers/mail.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { mailAttachmentUpload } = require('../middleware/upload');
const {
  listMailValidators,
  composeMessageValidators,
  updateDraftValidators,
  setFlagsValidators,
} = require('../validators/mail.validators');

const router = express.Router();
router.use(requireAuth);


router.get('/', listMailValidators, controller.listMail);


router.get('/unread-count', controller.getUnreadCount);


router.get('/contacts', controller.getContacts);


router.get('/attachments/:attachmentId/download', controller.downloadAttachment);


router.post('/', mailAttachmentUpload.array('attachments', 10), composeMessageValidators, controller.composeMessage);

 
router.get('/:id', controller.getMessage);
router.post('/:id/reply', mailAttachmentUpload.array('attachments', 10), controller.replyMessage);
router.post('/:id/forward', mailAttachmentUpload.array('attachments', 10), controller.forwardMessage);
router.put('/:id', updateDraftValidators, controller.updateDraft);
router.patch('/:id/flags', setFlagsValidators, controller.setFlags);
router.patch('/:id/spam', controller.markAsSpam);
router.patch('/:id/not-spam', controller.markAsNotSpam);
router.delete('/:id', controller.trashOrDelete);
router.post('/:id/restore', controller.restoreFromTrash);

module.exports = router;
