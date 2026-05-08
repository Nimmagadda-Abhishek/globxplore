const { CommissionLog } = require('./model');

class CommissionService {
  /**
   * Calculate commission based on country, university type, and agent tier
   */
  static async calculateCommissionForAgent(agentId, country, isPublicUniversity = false) {
    const Student = require('../student/model');
    const baseAmount = this.calculateBaseCommission(country, isPublicUniversity);
    
    // Count total enrolled students for this agent
    const enrollmentCount = await Student.countDocuments({
      $or: [{ assignedAgent: agentId }, { sourceAgent: agentId }, { createdBy: agentId }],
      pipelineStage: 'Enrolled'
    });

    const tier = this.getAgentTier(enrollmentCount);
    let bonus = 0;

    if (tier.name === 'Growth') bonus = 5000;
    if (tier.name === 'Pro') bonus = 7000;
    if (tier.name === 'Elite') bonus = 10000;

    // Special Elite Retroactive Bonus Check
    // If this is the EXACT 31st student, calculate bonus for the previous 30
    let retroactiveBonus = 0;
    if (enrollmentCount === 31) {
      retroactiveBonus = 30 * 10000; // 10K for each previous student
      console.log(`[Commission] Elite Tier Reached! Retroactive bonus of ₹${retroactiveBonus} triggered for agent ${agentId}`);
    }

    return {
      baseAmount,
      bonus,
      retroactiveBonus,
      totalThisStudent: baseAmount + bonus,
      tier: tier.name,
      count: enrollmentCount
    };
  }

  /**
   * Base commission logic (moved from original calculateCommission)
   */
  static calculateBaseCommission(country, isPublicUniversity = false) {
    const c = country.trim().toUpperCase();
    if (c === 'UK' || c === 'UNITED KINGDOM') return 30000;
    if (['AUSTRALIA', 'CANADA', 'USA', 'UNITED STATES'].includes(c)) return 20000;
    
    if (this.isEuropeanCountry(c)) {
      return isPublicUniversity ? 5000 : 15000;
    }

    if (c === 'DUBAI' || c === 'EU' || c === 'EUROPEAN UNION') return 10000;
    return 0;
  }

  /**
   * Get tier info based on count
   */
  static getAgentTier(count) {
    if (count <= 4) return { name: 'Starter', label: 'Bronze - Basic' };
    if (count <= 15) return { name: 'Growth', label: 'Silver - Advanced' };
    if (count <= 30) return { name: 'Pro', label: 'Gold - Professional' };
    return { name: 'Elite', label: 'Platinum - Ultimate' };
  }

  /**
   * Helper to identify European countries
   */
  static isEuropeanCountry(country) {
    const europe = [
      'GERMANY', 'FRANCE', 'ITALY', 'SPAIN', 'POLAND', 'NETHERLANDS', 
      'SWITZERLAND', 'SWEDEN', 'NORWAY', 'FINLAND', 'DENMARK', 'BELGIUM', 
      'AUSTRIA', 'IRELAND', 'PORTUGAL', 'GREECE', 'HUNGARY', 'CZECH REPUBLIC',
      'ROMANIA', 'BULGARIA', 'CROATIA', 'LITHUANIA', 'LATVIA', 'ESTONIA', 'SLOVAKIA', 'SLOVENIA'
    ];
    return europe.includes(country);
  }

  /**
   * Log commission for an agent
   */
  static async logCommission(agentId, studentId, country, amount) {
    return await CommissionLog.create({
      agentId,
      studentId,
      country,
      amountEarned: amount,
      status: 'Pending'
    });
  }
}

module.exports = CommissionService;
