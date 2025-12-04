import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/results/rider/150437?days=30',
  method: 'GET',
  timeout: 5000
};

console.log('Testing:', `http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Response:', {
        success: json.success,
        count: json.count,
        rider_id: json.rider_id
      });
    } catch (e) {
      console.log('Response:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.on('timeout', () => {
  console.error('⏱️  Request timeout after 5 seconds');
  req.destroy();
});

req.end();
