const mongoose = require('mongoose');

const RivuScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  budgetAdherence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  savingsProgress: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  weeklyActivity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for factor data
RivuScoreSchema.virtual('factors').get(function() {
  return [
    { 
      name: "Budget Adherence", 
      percentage: this.budgetAdherence, 
      rating: getRating(this.budgetAdherence), 
      color: "bg-[#00C2A8]" 
    },
    { 
      name: "Savings Goal Progress", 
      percentage: this.savingsProgress, 
      rating: getRating(this.savingsProgress), 
      color: "bg-[#2F80ED]" 
    },
    { 
      name: "Weekly Activity", 
      percentage: this.weeklyActivity, 
      rating: getRating(this.weeklyActivity), 
      color: "bg-[#D0F500]" 
    }
  ];
});

// Include virtuals when converting to JSON
RivuScoreSchema.set('toJSON', { virtuals: true });

// Helper function to get rating text
function getRating(percentage) {
  if (percentage >= 90) return "Excellent";
  if (percentage >= 70) return "Good";
  if (percentage >= 50) return "Fair";
  if (percentage >= 30) return "Poor";
  return "Needs Improvement";
}

const RivuScore = mongoose.model('RivuScore', RivuScoreSchema);

module.exports = RivuScore;