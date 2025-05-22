const Budget = require('../models/Budget');

// @desc    Get all budgets for a user
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id });
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new budget
// @route   POST /api/budgets
// @access  Private
const createBudget = async (req, res) => {
  try {
    const { category, amount, color, icon } = req.body;

    if (!category || !amount) {
      return res.status(400).json({ message: 'Please provide category and amount' });
    }

    // Check if budget for this category already exists
    const existingBudget = await Budget.findOne({ 
      userId: req.user._id, 
      category 
    });
    
    if (existingBudget) {
      return res.status(400).json({ message: 'Budget for this category already exists' });
    }

    const budget = await Budget.create({
      userId: req.user._id,
      category,
      amount,
      currentSpent: 0,
      color: color || '#00C2A8', // Default color
      icon: icon || 'ri-money-dollar-circle-line', // Default icon
    });

    res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a budget
// @route   PUT /api/budgets/:id
// @access  Private
const updateBudget = async (req, res) => {
  try {
    const { category, amount, currentSpent, color, icon } = req.body;

    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Check if budget belongs to user
    if (budget.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // If changing category, ensure new category doesn't already exist
    if (category && category !== budget.category) {
      const existingBudget = await Budget.findOne({ 
        userId: req.user._id, 
        category 
      });
      
      if (existingBudget) {
        return res.status(400).json({ message: 'Budget for this category already exists' });
      }
    }

    // Update fields
    if (category !== undefined) budget.category = category;
    if (amount !== undefined) budget.amount = amount;
    if (currentSpent !== undefined) budget.currentSpent = currentSpent;
    if (color !== undefined) budget.color = color;
    if (icon !== undefined) budget.icon = icon;

    const updatedBudget = await budget.save();
    res.json(updatedBudget);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
// @access  Private
const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Check if budget belongs to user
    if (budget.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await budget.remove();
    res.json({ message: 'Budget removed' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};