const User = require('../modules/user/model');
const Lead = require('../modules/lead/model');
const Student = require('../modules/student/model');

const ROLE_PREFIXES = {
  ADMIN: 'AD',
  AGENT_MANAGER: 'AM',
  AGENT: 'AG',
  COUNSELLOR: 'CO',
  TELECALLER: 'TC',
  STUDENT: 'ST',
  VISA_AGENT: 'VA',
  VISA_CLIENT: 'VC',
  ALUMNI_MANAGER: 'ALM',
  ALUMNI: 'AL',
  LEAD: 'LD',
};

/**
 * Generates a unique GX ID based on the role.
 * Format: GX{PREFIX}{RANDOM_6_8_DIGITS}
 * @param {string} role - The role of the user.
 * @returns {Promise<string>} - The unique GX ID.
 */
async function generateGxId(role) {
  const prefix = ROLE_PREFIXES[role];
  if (!prefix) {
    throw new Error('Invalid role for GX ID generation');
  }

  let gxId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    const randomDigits = Math.floor(100000 + Math.random() * 99999999);
    gxId = `GX${prefix}${randomDigits}`;

    const existingUser = await User.findOne({ gxId });
    const existingLead = await Lead.findOne({ gxId });
    const existingStudent = await Student.findOne({ gxId });
    
    if (!existingUser && !existingLead && !existingStudent) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Could not generate a unique GX ID after several attempts');
  }

  return gxId;
}

module.exports = {
  generateGxId,
};
