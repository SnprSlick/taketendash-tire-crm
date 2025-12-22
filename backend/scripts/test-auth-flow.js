
const http = require('http');

function postRequest(path, data, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
      options.method = 'GET'; // Validate is usually GET
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(`Request failed with status ${res.statusCode}: ${body}`);
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) req.write(data);
    req.end();
  });
}

async function testAuth() {
  try {
    console.log('Logging in...');
    const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });
    const loginRes = await postRequest('/api/v1/auth/login', loginData);
    console.log('Login successful. Token received.');
    
    const token = loginRes.access_token;
    
    console.log('Validating token...');
    // Assuming validate is GET /api/v1/auth/validate or similar. 
    // Based on the user's error "GET /api/v1/auth/validate", it is a GET request.
    const validateRes = await postRequest('/api/v1/auth/validate', null, token);
    console.log('Validation successful:', validateRes);
    
  } catch (error) {
    console.error('Auth test failed:', error);
  }
}

testAuth();
