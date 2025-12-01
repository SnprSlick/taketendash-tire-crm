
const fetch = require('node-fetch');

async function testLogin() {
  try {
    // Login
    const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'jbyerlytest', password: 'password123' }) // Assuming password was reset or is known
    });

    if (!loginRes.ok) {
      console.log('Login failed:', await loginRes.text());
      return;
    }

    const loginData = await loginRes.json();
    console.log('Login Response User:', JSON.stringify(loginData.user, null, 2));

    const token = loginData.access_token;

    // Validate
    const validateRes = await fetch('http://localhost:3001/api/v1/auth/validate', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!validateRes.ok) {
      console.log('Validate failed:', await validateRes.text());
      return;
    }

    const validateData = await validateRes.json();
    console.log('Validate Response User:', JSON.stringify(validateData.user, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
