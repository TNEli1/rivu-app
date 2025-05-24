const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GoalSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Goal name is required']
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required']
  },
  currentAmount: {
    type: Number,
    default: 0
  },
  targetDate: {
    type: Date,
    required: false
  },
  progressPercentage: {
    type: Number,
    default: 0
  },
  monthlySavings: [{
    month: String, // Format: "YYYY-MM"
    amount: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to calculate progress percentage
GoalSchema.pre('save', function(next) {
  if (this.targetAmount > 0) {
    this.progressPercentage = (this.currentAmount / this.targetAmount) * 100;
  } else {
    this.progressPercentage = 0;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Method to update monthly savings
GoalSchema.methods.updateMonthlySavings = function(amount) {
  const currentDate = new Date();
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Check if we already have an entry for this month
  const monthIndex = this.monthlySavings.findIndex(item => item.month === monthKey);
  
  if (monthIndex >= 0) {
    // Update existing month's amount
    this.monthlySavings[monthIndex].amount += amount;
  } else {
    // Add a new month
    this.monthlySavings.push({ month: monthKey, amount });
  }
};

module.exports = mongoose.model('Goal', GoalSchema);