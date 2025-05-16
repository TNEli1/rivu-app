const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const RivuScore = require('../models/RivuScore');

// Common password for all demo accounts
const DEFAULT_PASSWORD = 'Password123!';

// Category data with associated icons and colors
const CATEGORIES = {
  'Housing': { icon: 'ri-home-4-line', color: '#4299E1' },
  'Utilities': { icon: 'ri-plug-line', color: '#F6AD55' },
  'Groceries': { icon: 'ri-shopping-basket-2-line', color: '#68D391' },
  'Transportation': { icon: 'ri-car-line', color: '#FC8181' },
  'Entertainment': { icon: 'ri-movie-2-line', color: '#B794F4' },
  'Dining': { icon: 'ri-restaurant-line', color: '#F687B3' },
  'Health': { icon: 'ri-heart-pulse-line', color: '#63B3ED' },
  'Shopping': { icon: 'ri-shopping-bag-line', color: '#F6E05E' },
  'Travel': { icon: 'ri-plane-line', color: '#4FD1C5' },
  'Savings': { icon: 'ri-coin-line', color: '#D0F500' },
  'Income': { icon: 'ri-money-dollar-circle-line', color: '#00C2A8' },
  'Debt': { icon: 'ri-bank-card-line', color: '#E53E3E' },
  'Misc': { icon: 'ri-more-2-fill', color: '#A0AEC0' }
};

// Subcategories organized by parent category
const SUBCATEGORIES = {
  'Housing': ['Rent', 'Mortgage', 'Property Tax', 'HOA Fees', 'Home Insurance', 'Repairs'],
  'Utilities': ['Electric', 'Water', 'Gas', 'Internet', 'Trash', 'Cell Phone'],
  'Groceries': ['Produce', 'Meat & Seafood', 'Snacks', 'Beverages', 'Household Items'],
  'Transportation': ['Gas', 'Car Payment', 'Insurance', 'Rideshare', 'Public Transit', 'Maintenance'],
  'Entertainment': ['Streaming', 'Dining Out', 'Movies', 'Events', 'Subscriptions', 'Games'],
  'Health': ['Doctor', 'Dentist', 'Pharmacy', 'Insurance', 'Gym', 'Wellness'],
  'Shopping': ['Clothing', 'Electronics', 'Home Goods', 'Gifts', 'Online Shopping'],
  'Travel': ['Flights', 'Hotels', 'Car Rental', 'Activities', 'Souvenirs'],
  'Savings': ['Emergency Fund', 'Vacation', 'Investments', 'Down Payment', 'Major Purchase'],
  'Income': ['Primary Job', 'Side Hustle', 'Freelance', 'Investments', 'Gifts', 'Refunds'],
  'Debt': ['Credit Card', 'Student Loans', 'Personal Loans', 'Medical Debt'],
  'Misc': ['Donations', 'Education', 'Pet Care', 'Personal Care']
};

// Common accounts for all users
const ACCOUNTS = ['Checking', 'Savings', 'Credit Card', 'Cash', 'Venmo', 'PayPal'];

// Helper functions
function randomDateBetween(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomAmount(min, max, decimals = 2) {
  const random = Math.random() * (max - min) + min;
  return Number(random.toFixed(decimals));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Generate realistic merchant names based on category
function generateMerchantName(category, subcategory) {
  const merchants = {
    'Groceries': ['Whole Foods', 'Trader Joe\'s', 'Safeway', 'Kroger', 'Albertsons', 'Target', 'Walmart', 'Costco'],
    'Dining': ['Chipotle', 'Starbucks', 'Panera Bread', 'Local Restaurant', 'DoorDash', 'Uber Eats', 'Grubhub', 'McDonald\'s', 'Subway'],
    'Entertainment': ['Netflix', 'Spotify', 'AMC Theaters', 'Ticketmaster', 'Steam', 'Disney+', 'Hulu', 'Amazon Prime'],
    'Shopping': ['Amazon', 'Target', 'Walmart', 'Best Buy', 'Nordstrom', 'Macy\'s', 'Home Depot', 'Etsy', 'eBay'],
    'Transportation': ['Uber', 'Lyft', 'Shell', 'Chevron', 'BP', 'Transit Authority', 'Parking Garage', 'EV Charging'],
    'Health': ['CVS Pharmacy', 'Walgreens', 'Doctor\'s Office', 'Dental Care', 'Gym Membership', 'Vitamin Shop'],
    'Travel': ['Airbnb', 'Marriott', 'Southwest Airlines', 'Expedia', 'Delta', 'Uber', 'Rental Car'],
    'Utilities': ['Electric Company', 'Water Utility', 'Gas Provider', 'Internet Provider', 'Waste Management'],
    'Housing': ['Rent Payment', 'Mortgage Company', 'Home Insurance', 'HOA Fees', 'Property Management'],
    'Misc': ['Post Office', 'Amazon', 'Donation', 'Local Business', 'Service Provider']
  };
  
  return randomChoice(merchants[category] || ['Payment']);
}

// Core functions

// Calculate budget adherence based on budgets and transactions
async function calculateBudgetAdherence(userId) {
  try {
    // Get all the user's budgets
    const budgets = await Budget.find({ userId });
    
    if (budgets.length === 0) return 0;
    
    let adherenceSum = 0;
    
    for (const budget of budgets) {
      // Calculate budget adherence percentage for this category
      const adherence = budget.currentSpent <= budget.amount 
        ? 100 // If spent less than budget, perfect adherence
        : 100 - Math.min(100, ((budget.currentSpent - budget.amount) / budget.amount) * 100);
      
      adherenceSum += adherence;
    }
    
    // Return average adherence across all budget categories
    return Math.round(adherenceSum / budgets.length);
  } catch (error) {
    console.error('Error calculating budget adherence:', error);
    return 0;
  }
}

// Calculate savings progress based on goals
async function calculateSavingsProgress(userId) {
  try {
    const goals = await Goal.find({ user: userId });
    
    if (goals.length === 0) return 0;
    
    let progressSum = 0;
    
    for (const goal of goals) {
      progressSum += goal.progressPercentage;
    }
    
    // Return average progress across all goals
    return Math.round(progressSum / goals.length);
  } catch (error) {
    console.error('Error calculating savings progress:', error);
    return 0;
  }
}

// Simulate weekly activity score
function simulateWeeklyActivity(consistency) {
  // consistency is a value between 0-100 representing how active the user is
  // Higher consistency means more regular logins and engagement
  const baseScore = consistency;
  const randomVariation = Math.random() * 20 - 10; // +/- 10 points of variation
  return Math.min(100, Math.max(0, Math.round(baseScore + randomVariation)));
}

// Calculate Rivu Score based on all factors
async function calculateRivuScore(userId, simulatedActivity) {
  const budgetAdherence = await calculateBudgetAdherence(userId);
  const savingsProgress = await calculateSavingsProgress(userId);
  const weeklyActivity = simulateWeeklyActivity(simulatedActivity);
  
  // Weights for each factor (as percentages)
  const BUDGET_WEIGHT = 0.5;    // 50%
  const SAVINGS_WEIGHT = 0.3;   // 30%
  const ACTIVITY_WEIGHT = 0.2;  // 20%
  
  // Weighted score calculation
  const score = Math.round(
    (budgetAdherence * BUDGET_WEIGHT) +
    (savingsProgress * SAVINGS_WEIGHT) +
    (weeklyActivity * ACTIVITY_WEIGHT)
  );
  
  return {
    score,
    factors: {
      budgetAdherence,
      savingsProgress,
      weeklyActivity
    }
  };
}

// Create transactions for a user
async function createTransactions(userId, profile) {
  const transactions = [];
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-03-31');
  
  // Create income transactions (monthly)
  for (let month = 0; month < 3; month++) {
    const incomeDate = new Date(2025, month, randomChoice([1, 2, 3, 4, 5]));
    
    transactions.push({
      userId,
      amount: profile.income,
      merchant: randomChoice([
        'Employer Payroll', 
        `${profile.employer} Salary`, 
        'Direct Deposit', 
        'Paycheck'
      ]),
      category: 'Income',
      subcategory: 'Primary Job',
      account: 'Checking',
      type: 'income',
      date: formatDate(incomeDate),
      notes: 'Monthly salary'
    });
    
    // Add any side income if applicable
    if (profile.sideIncome && Math.random() < 0.8) { // 80% chance of side income each month
      const sideIncomeDate = new Date(2025, month, randomChoice([15, 16, 17, 18, 19, 20]));
      
      transactions.push({
        userId,
        amount: profile.sideIncome,
        merchant: randomChoice([
          'Freelance Client', 
          'Side Gig', 
          'Extra Work', 
          'Part-time Job'
        ]),
        category: 'Income',
        subcategory: randomChoice(['Side Hustle', 'Freelance']),
        account: randomChoice(['Checking', 'PayPal', 'Venmo']),
        type: 'income',
        date: formatDate(sideIncomeDate),
        notes: 'Side income'
      });
    }
  }
  
  // Create recurring expense transactions
  for (let month = 0; month < 3; month++) {
    // Rent/Mortgage (beginning of month)
    transactions.push({
      userId,
      amount: profile.expenses.housing,
      merchant: profile.expenses.housingName || 'Rent Payment',
      category: 'Housing',
      subcategory: profile.expenses.housingType || 'Rent',
      account: 'Checking',
      type: 'expense',
      date: formatDate(new Date(2025, month, randomChoice([1, 2, 3, 4, 5]))),
      notes: `Monthly ${profile.expenses.housingType || 'rent'}`
    });
    
    // Utilities
    ['Electric', 'Water', 'Gas', 'Internet'].forEach((utility, index) => {
      if (profile.expenses[utility.toLowerCase()]) {
        transactions.push({
          userId,
          amount: profile.expenses[utility.toLowerCase()],
          merchant: `${utility} Company`,
          category: 'Utilities',
          subcategory: utility,
          account: 'Checking',
          type: 'expense',
          date: formatDate(new Date(2025, month, 5 + index * 2)),
          notes: `Monthly ${utility.toLowerCase()}`
        });
      }
    });
    
    // Phone bill
    if (profile.expenses.phone) {
      transactions.push({
        userId,
        amount: profile.expenses.phone,
        merchant: randomChoice(['Verizon', 'AT&T', 'T-Mobile', 'Sprint']),
        category: 'Utilities',
        subcategory: 'Cell Phone',
        account: 'Credit Card',
        type: 'expense',
        date: formatDate(new Date(2025, month, randomChoice([15, 16, 17]))),
        notes: 'Monthly phone bill'
      });
    }
    
    // Car payment/Transportation
    if (profile.expenses.transportation) {
      transactions.push({
        userId,
        amount: profile.expenses.transportation,
        merchant: profile.expenses.transportationName || 'Auto Loan',
        category: 'Transportation',
        subcategory: profile.expenses.transportationType || 'Car Payment',
        account: 'Checking',
        type: 'expense',
        date: formatDate(new Date(2025, month, randomChoice([10, 11, 12]))),
        notes: 'Monthly car payment'
      });
    }
    
    // Insurance payments
    if (profile.expenses.insurance) {
      transactions.push({
        userId,
        amount: profile.expenses.insurance,
        merchant: randomChoice(['State Farm', 'Geico', 'Progressive', 'Allstate']),
        category: randomChoice(['Transportation', 'Health']),
        subcategory: 'Insurance',
        account: 'Credit Card',
        type: 'expense',
        date: formatDate(new Date(2025, month, randomChoice([18, 19, 20]))),
        notes: 'Monthly insurance premium'
      });
    }
    
    // Subscriptions
    if (profile.expenses.subscriptions) {
      profile.expenses.subscriptionsList.forEach((subscription, index) => {
        transactions.push({
          userId,
          amount: subscription.amount,
          merchant: subscription.name,
          category: 'Entertainment',
          subcategory: 'Subscriptions',
          account: 'Credit Card',
          type: 'expense',
          date: formatDate(new Date(2025, month, 5 + index)),
          notes: `Monthly subscription to ${subscription.name}`
        });
      });
    }
    
    // Health/Medical
    if (profile.expenses.health && Math.random() < 0.4) { // 40% chance each month
      transactions.push({
        userId,
        amount: randomAmount(profile.expenses.health * 0.5, profile.expenses.health * 1.5),
        merchant: randomChoice(['Pharmacy', 'Doctor Visit', 'Health Clinic', 'Dental Care']),
        category: 'Health',
        subcategory: randomChoice(['Doctor', 'Pharmacy', 'Dentist']),
        account: randomChoice(['Credit Card', 'Checking']),
        type: 'expense',
        date: formatDate(randomDateBetween(new Date(2025, month, 1), new Date(2025, month + 1, 0))),
        notes: 'Healthcare expense'
      });
    }
  }
  
  // Generate variable/discretionary expenses throughout the period
  const totalDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  const transactionsPerWeek = Math.round(profile.variableExpenseFrequency || 5);
  const totalVariableTransactions = Math.round(totalDays / 7 * transactionsPerWeek);
  
  for (let i = 0; i < totalVariableTransactions; i++) {
    const transactionDate = randomDateBetween(startDate, endDate);
    const category = randomChoice([
      'Groceries', 'Dining', 'Entertainment', 'Shopping', 
      'Transportation', 'Misc', 'Health', 'Travel'
    ]);
    const subcategory = randomChoice(SUBCATEGORIES[category]);
    
    // Determine spending amount based on user profile and category
    let amount;
    
    switch (category) {
      case 'Groceries':
        amount = randomAmount(30, 150);
        break;
      case 'Dining':
        amount = randomAmount(15, 100);
        break;
      case 'Entertainment':
        amount = randomAmount(10, 80);
        break;
      case 'Shopping':
        amount = randomAmount(20, 200);
        break;
      case 'Transportation':
        amount = randomAmount(5, 50);
        break;
      case 'Health':
        amount = randomAmount(20, 150);
        break;
      case 'Travel':
        amount = randomAmount(100, 500);
        break;
      default:
        amount = randomAmount(10, 100);
    }
    
    // Adjust amount based on spending habits
    if (profile.spendingHabit === 'low') {
      amount *= 0.7;
    } else if (profile.spendingHabit === 'high') {
      amount *= 1.3;
    }
    
    const transaction = {
      userId,
      amount: Number(amount.toFixed(2)),
      merchant: generateMerchantName(category, subcategory),
      category,
      subcategory,
      account: randomChoice(ACCOUNTS),
      type: 'expense',
      date: formatDate(transactionDate),
      notes: ''
    };
    
    transactions.push(transaction);
  }
  
  // If the user has goals, create savings transactions
  if (profile.goals && profile.goals.length > 0) {
    for (let month = 0; month < 3; month++) {
      if (profile.savingsRate > 0) {
        const savingsAmount = profile.income * (profile.savingsRate / 100);
        
        transactions.push({
          userId,
          amount: Number(savingsAmount.toFixed(2)),
          merchant: 'Transfer to Savings',
          category: 'Savings',
          subcategory: profile.goals[0].name,
          account: 'Savings',
          type: 'expense',
          date: formatDate(new Date(2025, month, randomChoice([26, 27, 28]))),
          notes: `Monthly savings for ${profile.goals[0].name}`
        });
      }
    }
  }
  
  // Sort transactions by date
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Save all transactions
  await Transaction.insertMany(transactions);
  console.log(`Created ${transactions.length} transactions for ${profile.name}`);
  
  return transactions;
}

// Create budgets for a user based on their profile
async function createBudgets(userId, profile) {
  const budgets = [];
  
  // Calculate budget amounts based on income and user profile
  const housingBudget = profile.expenses.housing;
  const utilitiesBudget = (profile.expenses.electric || 0) + 
                         (profile.expenses.water || 0) + 
                         (profile.expenses.gas || 0) + 
                         (profile.expenses.internet || 0) + 
                         (profile.expenses.phone || 0);
  
  const transportationBudget = profile.expenses.transportation || (profile.income * 0.1);
  const groceriesBudget = profile.income * 0.1;
  const diningBudget = profile.income * 0.08;
  const entertainmentBudget = profile.income * 0.07;
  const healthBudget = profile.income * 0.05;
  const miscBudget = profile.income * 0.05;
  
  // Core budget categories
  const budgetCategories = [
    { category: 'Housing', amount: housingBudget },
    { category: 'Utilities', amount: utilitiesBudget },
    { category: 'Transportation', amount: transportationBudget },
    { category: 'Groceries', amount: groceriesBudget },
    { category: 'Dining', amount: diningBudget },
    { category: 'Entertainment', amount: entertainmentBudget },
    { category: 'Health', amount: healthBudget },
    { category: 'Misc', amount: miscBudget }
  ];
  
  // Add savings budget if the user has a savings rate
  if (profile.savingsRate > 0) {
    const savingsBudget = profile.income * (profile.savingsRate / 100);
    budgetCategories.push({ category: 'Savings', amount: savingsBudget });
  }
  
  // Create budget documents
  for (const budget of budgetCategories) {
    // Adjust budget adherence based on the user's profile
    let spent;
    
    if (profile.budgetAdherence >= 90) {
      // User is good at sticking to budget
      spent = randomAmount(budget.amount * 0.8, budget.amount);
    } else if (profile.budgetAdherence >= 70) {
      // User sometimes exceeds budget
      spent = randomAmount(budget.amount * 0.9, budget.amount * 1.1);
    } else if (profile.budgetAdherence >= 50) {
      // User regularly exceeds budget
      spent = randomAmount(budget.amount * 0.95, budget.amount * 1.2);
    } else {
      // User significantly exceeds budget
      spent = randomAmount(budget.amount, budget.amount * 1.4);
    }
    
    budgets.push({
      userId,
      category: budget.category,
      amount: Math.round(budget.amount),
      currentSpent: Math.round(spent),
      color: CATEGORIES[budget.category]?.color || '#00C2A8',
      icon: CATEGORIES[budget.category]?.icon || 'ri-money-dollar-circle-line',
      month: new Date(2025, 2, 1)  // March 2025
    });
  }
  
  // Save all budgets
  await Budget.insertMany(budgets);
  console.log(`Created ${budgets.length} budgets for ${profile.name}`);
  
  return budgets;
}

// Create goals for a user based on their profile
async function createGoals(userId, profile) {
  if (!profile.goals || profile.goals.length === 0) {
    console.log(`No goals to create for ${profile.name}`);
    return [];
  }
  
  const goals = [];
  
  for (const goalData of profile.goals) {
    // Calculate progress based on user's profile and goal status
    let currentAmount = 0;
    let progressPercentage = 0;
    
    if (goalData.status === 'on-track') {
      // On-track goals have progress aligned with time elapsed
      progressPercentage = randomAmount(25, 35); // We're about 3 months in, so ~30% progress
      currentAmount = goalData.targetAmount * (progressPercentage / 100);
    } else if (goalData.status === 'ahead') {
      // Ahead goals have more progress than time elapsed
      progressPercentage = randomAmount(40, 60);
      currentAmount = goalData.targetAmount * (progressPercentage / 100);
    } else if (goalData.status === 'behind') {
      // Behind goals have less progress than time elapsed
      progressPercentage = randomAmount(10, 20);
      currentAmount = goalData.targetAmount * (progressPercentage / 100);
    } else if (goalData.status === 'abandoned') {
      // Abandoned goals have minimal progress
      progressPercentage = randomAmount(0, 10);
      currentAmount = goalData.targetAmount * (progressPercentage / 100);
    }
    
    // Generate monthly savings data (January to March 2025)
    const monthlySavings = [];
    
    // Function to distribute total savings across 3 months
    const distributeSavings = (total, consistency) => {
      const result = [];
      let remaining = total;
      
      // January
      const janPercentage = consistency === 'consistent' ? randomAmount(0.3, 0.35) : 
                           consistency === 'increasing' ? randomAmount(0.2, 0.25) :
                           consistency === 'decreasing' ? randomAmount(0.4, 0.45) : randomAmount(0.2, 0.4);
      
      const janAmount = total * janPercentage;
      remaining -= janAmount;
      result.push({ month: '2025-01', amount: Math.round(janAmount) });
      
      // February
      const febPercentage = consistency === 'consistent' ? randomAmount(0.3, 0.35) : 
                           consistency === 'increasing' ? randomAmount(0.3, 0.35) :
                           consistency === 'decreasing' ? randomAmount(0.3, 0.35) : randomAmount(0.2, 0.4);
      
      const febAmount = total * febPercentage;
      remaining -= febAmount;
      result.push({ month: '2025-02', amount: Math.round(febAmount) });
      
      // March (use remaining amount to ensure total adds up correctly)
      result.push({ month: '2025-03', amount: Math.round(remaining) });
      
      return result;
    };
    
    // Create the goal document
    const goal = {
      user: userId,
      name: goalData.name,
      targetAmount: goalData.targetAmount,
      currentAmount: Math.round(currentAmount),
      targetDate: goalData.targetDate || new Date(2025, 11, 31), // Default to end of 2025
      progressPercentage: Math.round(progressPercentage),
      monthlySavings: distributeSavings(currentAmount, goalData.savingPattern || 'consistent'),
      createdAt: new Date(2025, 0, randomChoice([1, 2, 3, 4, 5])),
      updatedAt: new Date(2025, 2, randomChoice([25, 26, 27, 28, 29, 30, 31]))
    };
    
    goals.push(goal);
  }
  
  // Save all goals
  const savedGoals = await Goal.insertMany(goals);
  console.log(`Created ${goals.length} goals for ${profile.name}`);
  
  return savedGoals;
}

// Create Rivu Score for a user
async function createRivuScore(userId, profile) {
  const rivuScoreData = await calculateRivuScore(userId, profile.weeklyActivity);
  
  const rivuScore = new RivuScore({
    user: userId,
    score: rivuScoreData.score,
    factors: rivuScoreData.factors
  });
  
  await rivuScore.save();
  console.log(`Created Rivu Score of ${rivuScoreData.score} for ${profile.name}`);
  
  return rivuScore;
}

// Create a user with all related data
async function createUserWithData(profile) {
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);
    
    // Create the user
    const user = new User({
      username: profile.username,
      email: profile.email,
      password: hashedPassword,
      firstName: profile.firstName,
      lastName: profile.lastName,
      demographics: {
        ageRange: profile.ageRange,
        incomeBracket: profile.incomeBracket,
        goals: profile.goals.map(g => g.name),
        riskTolerance: profile.riskTolerance || 'Moderate',
        experienceLevel: profile.experienceLevel || 'Intermediate',
        completed: true,
        updatedAt: new Date(2025, 0, 1)
      },
      accounts: ACCOUNTS,
      lastLogin: new Date(2025, 2, 31), // March 31, 2025
      loginCount: Math.floor(profile.weeklyActivity / 10), // Roughly estimate login count based on activity
      themePreference: 'dark'
    });
    
    await user.save();
    console.log(`Created user: ${profile.name}`);
    
    // Create budgets, transactions, goals, and Rivu Score
    await createBudgets(user._id, profile);
    await createTransactions(user._id, profile);
    await createGoals(user._id, profile);
    await createRivuScore(user._id, profile);
    
    return user;
  } catch (error) {
    console.error(`Error creating user ${profile.name}:`, error);
    throw error;
  }
}

/**
 * @desc    Create demo accounts with sample data
 * @route   POST /api/admin/create-demo-accounts
 * @access  Private/Admin
 */
const createDemoAccounts = async (req, res) => {
  try {
    // Clear existing demo data first
    await clearExistingDemoData();
    
    // Define user profiles
    const userProfiles = [
      {
        name: 'Ava Budgetmaster',
        username: 'ava',
        email: 'ava@rivudemo.com',
        firstName: 'Ava',
        lastName: 'Budgetmaster',
        ageRange: '25-34',
        incomeBracket: '$50,000-$74,999',
        income: 5500,
        budgetAdherence: 90,
        savingsRate: 20,
        weeklyActivity: 85,
        spendingHabit: 'low',
        employer: 'TechCorp',
        variableExpenseFrequency: 4, // Lower frequency, more controlled spending
        expenses: {
          housing: 1650,
          housingType: 'Rent',
          electric: 120,
          water: 60,
          gas: 80,
          internet: 70,
          phone: 90,
          transportation: 250,
          transportationType: 'Car Payment',
          health: 150,
          insurance: 200,
          subscriptions: true,
          subscriptionsList: [
            { name: 'Netflix', amount: 15.99 },
            { name: 'Spotify', amount: 9.99 }
          ]
        },
        goals: [
          {
            name: 'Emergency Fund',
            targetAmount: 3000,
            targetDate: new Date(2025, 11, 31),
            status: 'on-track',
            savingPattern: 'consistent'
          },
          {
            name: 'Travel',
            targetAmount: 2000,
            targetDate: new Date(2025, 8, 30),
            status: 'ahead',
            savingPattern: 'increasing'
          }
        ],
        riskTolerance: 'Moderate',
        experienceLevel: 'Intermediate'
      },
      {
        name: 'Liam Learner',
        username: 'liam',
        email: 'liam@rivudemo.com',
        firstName: 'Liam',
        lastName: 'Learner',
        ageRange: '18-24',
        incomeBracket: '$35,000-$49,999',
        income: 4200,
        budgetAdherence: 70,
        savingsRate: 10,
        weeklyActivity: 65,
        spendingHabit: 'medium',
        employer: 'Marketing Agency',
        sideIncome: 600,
        variableExpenseFrequency: 6,
        expenses: {
          housing: 1400,
          housingType: 'Rent',
          electric: 110,
          water: 50,
          internet: 80,
          phone: 95,
          transportation: 300,
          transportationType: 'Car Payment',
          health: 120,
          insurance: 180,
          subscriptions: true,
          subscriptionsList: [
            { name: 'Netflix', amount: 15.99 },
            { name: 'Spotify', amount: 9.99 },
            { name: 'Disney+', amount: 7.99 },
            { name: 'Gym Membership', amount: 39.99 }
          ]
        },
        goals: [
          {
            name: 'Credit Card Payoff',
            targetAmount: 1500,
            targetDate: new Date(2025, 5, 30),
            status: 'behind',
            savingPattern: 'inconsistent'
          },
          {
            name: 'Laptop Purchase',
            targetAmount: 1200,
            targetDate: new Date(2025, 7, 31),
            status: 'on-track',
            savingPattern: 'consistent'
          }
        ],
        riskTolerance: 'Moderate',
        experienceLevel: 'Beginner'
      },
      {
        name: 'Nina Overspender',
        username: 'nina',
        email: 'nina@rivudemo.com',
        firstName: 'Nina',
        lastName: 'Overspender',
        ageRange: '25-34',
        incomeBracket: '$35,000-$49,999',
        income: 3800,
        budgetAdherence: 40,
        savingsRate: 3,
        weeklyActivity: 45,
        spendingHabit: 'high',
        employer: 'Creative Studio',
        variableExpenseFrequency: 10, // High frequency, impulsive spending
        expenses: {
          housing: 1500,
          housingType: 'Rent',
          electric: 130,
          water: 70,
          internet: 90,
          phone: 110,
          transportation: 200,
          transportationType: 'Car Payment',
          health: 100,
          insurance: 160,
          subscriptions: true,
          subscriptionsList: [
            { name: 'Netflix', amount: 15.99 },
            { name: 'Hulu', amount: 12.99 },
            { name: 'Disney+', amount: 7.99 },
            { name: 'HBO Max', amount: 14.99 },
            { name: 'Spotify', amount: 9.99 },
            { name: 'Amazon Prime', amount: 14.99 },
            { name: 'Gym Membership', amount: 59.99 }
          ]
        },
        goals: [
          {
            name: 'Rent Deposit',
            targetAmount: 1000,
            targetDate: new Date(2025, 5, 30),
            status: 'abandoned',
            savingPattern: 'decreasing'
          }
        ],
        riskTolerance: 'High',
        experienceLevel: 'Beginner'
      },
      {
        name: 'Jacob Steady',
        username: 'jacob',
        email: 'jacob@rivudemo.com',
        firstName: 'Jacob',
        lastName: 'Steady',
        ageRange: '35-44',
        incomeBracket: '$25,000-$34,999',
        income: 2500,
        budgetAdherence: 85,
        savingsRate: 15,
        weeklyActivity: 75,
        spendingHabit: 'low',
        employer: 'Retail Store',
        sideIncome: 300,
        variableExpenseFrequency: 3, // Very careful with spending
        expenses: {
          housing: 950,
          housingType: 'Rent',
          electric: 80,
          water: 40,
          gas: 50,
          internet: 60,
          phone: 50,
          transportation: 0, // Uses public transit
          transportationType: 'Public Transit',
          transportationName: 'Monthly Pass',
          health: 90,
          insurance: 120,
          subscriptions: true,
          subscriptionsList: [
            { name: 'Netflix', amount: 15.99 },
            { name: 'Bus Pass', amount: 75.00 }
          ]
        },
        goals: [
          {
            name: 'Debt Payoff',
            targetAmount: 800,
            targetDate: new Date(2025, 6, 31),
            status: 'on-track',
            savingPattern: 'consistent'
          },
          {
            name: 'Car Repair',
            targetAmount: 600,
            targetDate: new Date(2025, 4, 30),
            status: 'ahead',
            savingPattern: 'consistent'
          }
        ],
        riskTolerance: 'Low',
        experienceLevel: 'Intermediate'
      },
      {
        name: 'Maya Hustler',
        username: 'maya',
        email: 'maya@rivudemo.com',
        firstName: 'Maya',
        lastName: 'Hustler',
        ageRange: '35-44',
        incomeBracket: '$100,000+',
        income: 10000,
        budgetAdherence: 50,
        savingsRate: 5,
        weeklyActivity: 55,
        spendingHabit: 'high',
        employer: 'Tech Startup',
        sideIncome: 2000,
        variableExpenseFrequency: 8, // Frequent but inconsistent spending
        expenses: {
          housing: 3200,
          housingType: 'Mortgage',
          housingName: 'Mortgage Payment',
          electric: 200,
          water: 90,
          gas: 120,
          internet: 150,
          phone: 130,
          transportation: 650,
          transportationType: 'Car Payment',
          transportationName: 'Luxury Car Lease',
          health: 250,
          insurance: 350,
          subscriptions: true,
          subscriptionsList: [
            { name: 'Netflix', amount: 19.99 },
            { name: 'HBO Max', amount: 14.99 },
            { name: 'Spotify Family', amount: 14.99 },
            { name: 'Amazon Prime', amount: 14.99 },
            { name: 'Peloton', amount: 39.99 },
            { name: 'Luxury Gym', amount: 199.99 },
            { name: 'Wine Club', amount: 89.99 }
          ]
        },
        goals: [
          {
            name: 'Investment Fund',
            targetAmount: 5000,
            targetDate: new Date(2025, 11, 31),
            status: 'behind',
            savingPattern: 'inconsistent'
          }
        ],
        riskTolerance: 'High',
        experienceLevel: 'Advanced'
      }
    ];
    
    // Create all demo users
    for (const profile of userProfiles) {
      await createUserWithData(profile);
    }
    
    res.status(200).json({
      success: true,
      message: "Demo accounts created successfully",
      count: userProfiles.length
    });
  } catch (error) {
    console.error('Error in createDemoAccounts controller:', error);
    res.status(500).json({
      success: false,
      message: "Error creating demo accounts",
      error: error.message
    });
  }
};

// Clear existing demo data
async function clearExistingDemoData() {
  try {
    // Find demo users first to get their IDs
    const demoUsers = await User.find({
      email: { $regex: /@rivudemo\.com$/ }
    });
    
    const demoUserIds = demoUsers.map(user => user._id);
    
    if (demoUserIds.length > 0) {
      // Delete all related data
      await Transaction.deleteMany({ userId: { $in: demoUserIds } });
      await Budget.deleteMany({ userId: { $in: demoUserIds } });
      await Goal.deleteMany({ user: { $in: demoUserIds } });
      await RivuScore.deleteMany({ user: { $in: demoUserIds } });
      
      // Delete the demo users
      await User.deleteMany({ _id: { $in: demoUserIds } });
      
      console.log(`Cleared ${demoUserIds.length} existing demo accounts and their data`);
    } else {
      console.log('No existing demo accounts found');
    }
  } catch (error) {
    console.error('Error clearing existing demo data:', error);
    throw error;
  }
}

module.exports = {
  createDemoAccounts
};