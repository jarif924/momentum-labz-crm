const http = require('http');

const payload = JSON.stringify({
  contact: {
    full_name: "Tim Cook",
    email: "tim@apple.com",
    phone: "+1 800 555 9999",
    company_name: "Apple Inc",
    website_url: "https://apple.com"
  },
  project_details: {
    service_interest: "web_development",
    budget_tier: "10k_plus",
    timeline: "within_1_month",
    message: "We need a new landing page for the Vision Pro 2."
  },
  attribution: {
    utm_source: "google",
    utm_medium: "organic",
    landing_page: "https://www.momentumlabzz.com/services",
    submission_url: "https://www.momentumlabzz.com/contact",
    client_ip: "10.0.0.1"
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/leads/ingest',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length,
    'x-crm-api-key': 'development_key'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });
});

req.write(payload);
req.end();
