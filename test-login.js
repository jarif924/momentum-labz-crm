const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  await page.goto('https://momentum-labz-crm.pages.dev/login', { waitUntil: 'networkidle0' });
  
  await page.type('input[type="email"]', 'sajidhasan.hr@gmail.com');
  await page.type('input[type="password"]', 'Momentum123!');
  
  await page.click('button[type="submit"]');
  
  // Wait a bit to see the result
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
