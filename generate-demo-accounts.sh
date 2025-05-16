#!/bin/bash

echo "===== Rivu Demo Account Generator ====="
echo "This script will create 5 demo accounts with sample financial data."
echo ""

# Make a POST request to the admin endpoint to create demo accounts
echo "Generating demo accounts..."
curl -X POST http://localhost:5000/api/admin/create-demo-accounts

echo ""
echo "===== Demo Accounts Created ====="
echo "You can now log in with any of these accounts:"
echo "Username: ava | Password: Password123! | Profile: Good financial habits"
echo "Username: liam | Password: Password123! | Profile: Average financial habits"
echo "Username: nina | Password: Password123! | Profile: Poor spending habits"
echo "Username: jacob | Password: Password123! | Profile: Disciplined with low income"
echo "Username: maya | Password: Password123! | Profile: High income but unfocused"
echo "======================================"