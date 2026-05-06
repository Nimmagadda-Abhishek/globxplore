const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SubscriptionPlan = require('../src/modules/subscription/model');

dotenv.config();

const plans = [
  {
    name: 'Basic',
    price: 0,
    features: [
      'Universities Shortlisting',
      'SOP Assistance',
      'Application submission - Up to 3 Universities and one country',
      'Scholarship Assistance',
      'Mock Visa Interviews Manual - Limited',
      'Loan Assistance',
      'Entrance test assistance'
    ]
  },
  {
    name: 'Premium',
    price: 1,
    tagline: 'PERSONALIZED SUPPORT',
    features: [
      'Personalized Universities Shortlisting',
      'SOP Story-building sessions',
      'Application submission - Unlimited Universities and two countries',
      'Assured Scholarship guarantee',
      'Early Bird Offer guarantee',
      'Mock Visa Interviews Manual - Unlimited',
      'Mock Visa Interviews AI Based - Unlimited',
      'Loan Assistance and ROI Negotiation',
      'Entrance test training and mock test preparation',
      'Free Forex Card for payments',
      'Country level ROI analysis sessions',
      'Visa Success probability assessment'
    ],
    popular: true
  },
  {
    name: 'Elite',
    price: 1,
    tagline: 'PREMIUM CONCIERGE',
    features: [
      'Personalized Universities Shortlisting',
      'SOP Story-building sessions',
      'Application submission - Unlimited Universities and two countries',
      'Assured Scholarship guarantee',
      'Early Bird Offer guarantee',
      'Mock Visa Interviews Manual - Unlimited',
      'Mock Visa Interviews AI Based - Unlimited',
      'Loan Assistance and ROI Negotiation',
      'Entrance test training and mock test preparation',
      'Free Forex Card for payments',
      'Country level ROI analysis sessions',
      'Visa Success probability assessment',
      'Personalized resume building for job applications',
      'Language training classes',
      'English proficiency communication trainings',
      'Jobs applying and profile advertising in job market sites',
      'PR pathway trainings and alumni support'
    ]
  }
];

async function seedPlans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing plans
    await SubscriptionPlan.deleteMany({});
    console.log('Cleared existing plans');

    // Insert new plans
    await SubscriptionPlan.insertMany(plans);
    console.log('Successfully seeded subscription plans');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
}

seedPlans();
