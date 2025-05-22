// Test script for account management features
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:8080/api';

// Test functions
async function testRegisterWithPasswordConfirmation() {
  console.log('\n🔍 Testing registration with password confirmation...');
  
  // Test case 1: Passwords match
  const userData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    passwordConfirmation: 'Password123!',
    firstName: 'Test',
    lastName: 'User'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    console.log(`✅ Registration with matching passwords: ${response.status === 201 ? 'SUCCESS' : 'FAILED'}`);
    console.log('Response:', data);
    
    return { success: response.status === 201, userData };
  } catch (error) {
    console.error('❌ Error during registration test:', error);
    return { success: false };
  }
}

async function testRegisterWithMismatchedPasswords() {
  console.log('\n🔍 Testing registration with mismatched passwords...');
  
  const userData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    passwordConfirmation: 'DifferentPassword!',
    firstName: 'Test',
    lastName: 'User'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    console.log(`✅ Registration with mismatched passwords properly rejected: ${response.status === 400 ? 'SUCCESS' : 'FAILED'}`);
    console.log('Response:', data);
  } catch (error) {
    console.error('❌ Error during mismatched password test:', error);
  }
}

async function testDeleteAccount(userData, token) {
  console.log('\n🔍 Testing account deletion...');
  
  if (!userData || !token) {
    console.log('❌ Cannot test deletion without user data and token');
    return;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/user/account`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        password: userData.password // Confirm with original password
      })
    });
    
    const data = await response.json();
    console.log(`✅ Account deletion: ${response.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    console.log('Response:', data);
  } catch (error) {
    console.error('❌ Error during account deletion test:', error);
  }
}

// Run tests
async function runTests() {
  console.log('Starting account management feature tests...');
  
  // Test password confirmation during registration
  await testRegisterWithMismatchedPasswords();
  
  // Test successful registration with password confirmation
  const { success, userData } = await testRegisterWithPasswordConfirmation();
  
  if (success) {
    console.log('✅ Registration tests completed successfully');
    // Additional tests could be implemented here
  } else {
    console.log('❌ Registration tests failed');
  }
  
  console.log('\nAccount management feature tests completed');
}

runTests();