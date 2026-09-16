const http = require('http');

const payload = JSON.stringify({
  contact: {
    full_name: "Elon Musk",
    email: "elon@tesla.com",
    phone: "+1 800 555 1234",
    company_name: "Tesla Inc",
    website_url: "https://tesla.com"
  },
  project_details: {
    service_interest: "full_funnel_growth",
    budget_tier: "10k_plus",
    timeline: "immediate",
    message: "Need help scaling our growth engine across multiple channels to reach new audiences. We have a lot of data but need better orchestration."
  },
  attribution: {
    utm_source: "facebook",
    utm_medium: "cpc",
    utm_campaign: "q3_scale_growth",
    landing_page: "https://www.momentumlabzz.com/growth",
    submission_url: "https://www.momentumlabzz.com/contact",
    client_ip: "192.168.1.1"
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

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(payload);
req.end();
