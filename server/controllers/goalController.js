const Goal = require('../models/Goal');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

/**
 * @desc    Get all user goals
 * @route   GET /api/goals
 * @access  Private
 */
const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(goals);
});

/**
 * @desc    Get a single goal by ID
 * @route   GET /api/goals/:id
 * @access  Private
 */
const getGoalById = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ 
    _id: req.params.id,
    user: req.user._id
  });

  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  res.json(goal);
});

/**
 * @desc    Create a new goal
 * @route   POST /api/goals
 * @access  Private
 */
const createGoal = asyncHandler(async (req, res) => {
  const { name, targetAmount, targetDate } = req.body;

  if (!name || !targetAmount) {
    res.status(400);
    throw new Error('Please provide a name and target amount');
  }

  const goal = await Goal.create({
    name,
    targetAmount: parseFloat(targetAmount),
    targetDate: targetDate || null,
    currentAmount: 0,
    user: req.user._id
  });

  // Update Rivu score
  try {
    await updateRivuScore(req.user._id);
  } catch (error) {
    console.error('Error updating Rivu score:', error);
  }

  res.status(201).json(goal);
});

/**
 * @desc    Update a goal
 * @route   PUT /api/goals/:id
 * @access  Private
 */
const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  // Update basic properties
  if (req.body.name) goal.name = req.body.name;
  if (req.body.targetAmount) goal.targetAmount = parseFloat(req.body.targetAmount);
  if (req.body.targetDate) goal.targetDate = req.body.targetDate;

  // If a savings amount update is included
  if (req.body.amountToAdd !== undefined) {
    const amountToAdd = parseFloat(req.body.amountToAdd);
    
    // Update the total saved amount
    goal.currentAmount += amountToAdd;
    
    // Update monthly tracking
    goal.updateMonthlySavings(amountToAdd);
  }

  await goal.save();

  // Update Rivu score
  try {
    await updateRivuScore(req.user._id);
  } catch (error) {
    console.error('Error updating Rivu score:', error);
  }

  res.json(goal);
});

/**
 * @desc    Delete a goal
 * @route   DELETE /api/goals/:id
 * @access  Private
 */
const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  await goal.deleteOne();

  // Update Rivu score
  try {
    await updateRivuScore(req.user._id);
  } catch (error) {
    console.error('Error updating Rivu score:', error);
  }

  res.status(200).json({ message: 'Goal removed' });
});

/**
 * @desc    Update Rivu Score for a user considering savings goals
 * @access  Private (internal function)
 */
const updateRivuScore = async (userId) => {
  const { default: calculateRivuScore } = require('./rivuScoreController');
  await calculateRivuScore(userId);
};

module.exports = {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal
};