// const fetch = require('node-fetch'); // Or native fetch in Node 18+

async function testSalespersonEndpoint() {
  try {
    // 1. Login
    console.log('Logging in as jbyerlytest...');
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'jbyerlytest',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    console.log('Login successful. Token received.');
    console.log('User stores:', loginData.user.stores);

    // 2. Call Salesperson Details Endpoint
    const name = 'JACOB%20BYERLY';
    const url = `http://localhost:3001/api/v1/invoices/reports/salespeople/${name}?year=2025`;
    
    console.log(`Calling endpoint: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Endpoint call failed:', data);
    } else {
      console.log('Response data keys:', Object.keys(data));
      if (data.salesperson) {
        console.log('Salesperson Name:', data.salesperson);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSalespersonEndpoint();
