const axios = require('axios');

async function testSearch() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      username: 'admin',
      password: 'admin'
    });
    
    const token = loginResponse.data.access_token;
    console.log('Login successful, token:', token.substring(0, 20) + '...');

    // 2. Search
    console.log('Searching for "Justin"...');
    const searchResponse = await axios.get('http://localhost:3001/api/v1/users/search-employees?q=Justin', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Search response status:', searchResponse.status);
    console.log('Search results:', JSON.stringify(searchResponse.data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSearch();
