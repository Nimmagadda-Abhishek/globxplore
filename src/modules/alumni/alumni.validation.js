const Joi = require('joi');

const updateProfileSchema = Joi.object({
  currentWorkingRole: Joi.string().allow('', null),
  livingLocation: Joi.string().allow('', null),
  workLocation: Joi.string().allow('', null),
  availability: Joi.string().allow('', null),
  shortBio: Joi.string().allow('', null),
});

const updateBankDetailsSchema = Joi.object({
  accountName: Joi.string().required(),
  accountNumber: Joi.string().required(),
  bankName: Joi.string().required(),
  branchName: Joi.string().required(),
  ifscCode: Joi.string().required(),
  swiftCode: Joi.string().allow('', null),
});

const createServiceSchema = Joi.object({
  serviceType: Joi.string().required(),
  price: Joi.number().required(),
  description: Joi.string().allow('', null),
});

const createJobSchema = Joi.object({
  title: Joi.string().required(),
  location: Joi.string().required(),
  salaryRange: Joi.string().allow('', null),
});

const ambassadorApplySchema = Joi.object({
  roleType: Joi.string().valid('College Representative', 'Country Representative', 'University Ambassador').required(),
  applicationDetails: Joi.string().allow('', null),
});

module.exports = {
  updateProfileSchema,
  updateBankDetailsSchema,
  createServiceSchema,
  createJobSchema,
  ambassadorApplySchema
};
