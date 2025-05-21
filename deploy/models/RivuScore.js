const mongoose = require('mongoose');

const rivuScoreSchema = mongoose.Schema(
  {
    user: {
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
    // Factors stored as an embedded object
    factors: {
      budgetAdherence: {
        type: Number,
        required: true,
        min: [0, 'Budget adherence cannot be negative'],
        max: [100, 'Budget adherence cannot be more than 100'],
        default: 0
      },
      savingsProgress: {
        type: Number,
        required: true,
        min: [0, 'Savings progress cannot be negative'],
        max: [100, 'Savings progress cannot be more than 100'],
        default: 0
      },
      weeklyActivity: {
        type: Number,
        required: true,
        min: [0, 'Weekly activity cannot be negative'],
        max: [100, 'Weekly activity cannot be more than 100'],
        default: 0
      }
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

// Define virtual property for detailed factors with ratings
rivuScoreSchema.virtual('factorsWithRatings').get(function() {
  return [
    { 
      name: "Budget Adherence", 
      percentage: this.factors.budgetAdherence, 
      rating: getRating(this.factors.budgetAdherence), 
      color: "bg-[#00C2A8]" 
    },
    { 
      name: "Savings Goal Progress", 
      percentage: this.factors.savingsProgress, 
      rating: getRating(this.factors.savingsProgress), 
      color: "bg-[#2F80ED]" 
    },
    { 
      name: "Weekly Activity", 
      percentage: this.factors.weeklyActivity, 
      rating: getRating(this.factors.weeklyActivity), 
      color: "bg-[#D0F500]" 
    },
  ];
});

// Ensure virtuals are included when converting to JSON
rivuScoreSchema.set('toJSON', { virtuals: true });
rivuScoreSchema.set('toObject', { virtuals: true });

const RivuScore = mongoose.model('RivuScore', rivuScoreSchema);

module.exports = RivuScore;