const mongoose = require('mongoose');

const rivuScoreSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true,
    },
    score: {
      type: Number,
      required: true,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot be more than 100'],
    },
    // Score factors with their individual percentages
    budgetAdherence: {
      type: Number,
      required: true,
      min: [0, 'Budget adherence cannot be negative'],
      max: [100, 'Budget adherence cannot be more than 100'],
    },
    savingsProgress: {
      type: Number,
      required: true,
      min: [0, 'Savings progress cannot be negative'],
      max: [100, 'Savings progress cannot be more than 100'],
    },
    weeklyActivity: {
      type: Number,
      required: true,
      min: [0, 'Weekly activity cannot be negative'],
      max: [100, 'Weekly activity cannot be more than 100'],
    },
  },
  {
    timestamps: true,
  }
);

// Helper function to get rating text based on percentage
function getRating(percentage) {
  if (percentage >= 90) return "Excellent";
  if (percentage >= 70) return "Good";
  if (percentage >= 50) return "Fair";
  if (percentage >= 30) return "Poor";
  return "Needs Improvement";
}

// Define virtual property for ratings
rivuScoreSchema.virtual('factors').get(function() {
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
    },
  ];
});

// Ensure virtuals are included when converting to JSON
rivuScoreSchema.set('toJSON', { virtuals: true });
rivuScoreSchema.set('toObject', { virtuals: true });

const RivuScore = mongoose.model('RivuScore', rivuScoreSchema);

module.exports = RivuScore;