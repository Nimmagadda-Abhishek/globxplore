const Joi = require('joi');

const documentSchema = Joi.object({
  name: Joi.string().optional().allow('', null),
  type: Joi.string().optional().allow('', null),
  visibility: Joi.string().valid('Public', 'Office', 'Student').optional().allow('', null),
  url: Joi.string().optional().allow('', null)
}).unknown(true);

module.exports = {
  documentSchema
};
