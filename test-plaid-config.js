// Railway Plaid Configuration Test Script
// This script tests the exact configuration issues causing bank selection to be skipped

import https from 'https';
import http from 'http';

console.log('🔍 Testing Railway Plaid Configuration Issues...\n');

// Test 1: Environment Variable Configuration
console.log('1. Environment Variables:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'NOT_SET');
console.log('   PLAID_ENV:', process.env.PLAID_ENV || 'NOT_SET');
console.log('   RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT || 'NOT_SET');
console.log('   PORT:', process.env.PORT || 'NOT_SET');

// Test 2: Determine Production State (this logic should match your server)
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.RAILWAY_ENVIRONMENT === 'production' || 
                    process.env.PLAID_ENV === 'production';

console.log('\n2. Production State Determination:');
console.log('   Resolved as Production:', isProduction);
console.log('   Expected for Railway: true');

// Test 3: Redirect URI Configuration
const baseUrl = isProduction ? 'https://www.tryrivu.com' : 'http://localhost:5000';
const redirectUri = `${baseUrl}/plaid-callback`;
const webhook = `${baseUrl}/api/plaid/webhook`;

console.log('\n3. OAuth URIs:');
console.log('   Base URL:', baseUrl);
console.log('   Redirect URI:', redirectUri);
console.log('   Webhook URL:', webhook);

// Test 4: Test Server Response
console.log('\n4. Testing Server Response...');

const testServer = () => {
  const protocol = baseUrl.startsWith('https') ? https : http;
  const url = new URL('/health', baseUrl);
  
  const req = protocol.request(url, (res) => {
    console.log('   Server Status:', res.statusCode);
    console.log('   Server Headers:');
    Object.entries(res.headers).forEach(([key, value]) => {
      if (key.toLowerCase().includes('cookie') || 
          key.toLowerCase().includes('session') || 
          key.toLowerCase().includes('cors')) {
        console.log(`     ${key}: ${value}`);
      }
    });
    
    res.on('data', (chunk) => {
      console.log('   Response:', chunk.toString());
    });
    
    res.on('end', () => {
      console.log('\n✅ Configuration test complete');
      console.log('\n🎯 Key Issues to Fix on Railway:');
      console.log('   1. Set NODE_ENV=production in Railway environment variables');
      console.log('   2. Ensure session cookies use secure=true and domain=.tryrivu.com');
      console.log('   3. Verify Plaid dashboard has exact redirect URI: https://www.tryrivu.com/plaid-callback');
      console.log('   4. Never pass receivedRedirectUri on initial Plaid Link creation');
      console.log('   5. Only pass receivedRedirectUri when resuming OAuth with oauth_state_id');
    });
  });
  
  req.on('error', (err) => {
    console.log('   Server Error:', err.message);
    console.log('   This is expected if server is not running locally');
  });
  
  req.setTimeout(5000, () => {
    console.log('   Timeout - server may not be available');
    req.destroy();
  });
  
  req.end();
};

testServer();