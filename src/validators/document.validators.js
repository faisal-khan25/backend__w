const { body, query } = require('express-validator');
const { validate } = require('./_validateShared');
const Document = require('../models/document.model');

const uploadDocumentValidators = [
  body('title').optional({ checkFalsy: true }).isString().isLength({ max: 150 }),
  body('category').optional({ checkFalsy: true }).isIn(Document.CATEGORIES),
  validate,
];

const listMyDocumentsValidators = [
  query('category').optional({ checkFalsy: true }).isIn(Document.CATEGORIES),
  validate,
];

module.exports = { uploadDocumentValidators, listMyDocumentsValidators };
