const puppeteer = require('puppeteer-core');
const path = require('path');

const FIREFOX_PATH = 'C:\\Program Files\\Mozilla Firefox\\firefox.exe';
const APP_URL = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const OUT_DIR = path.resolve(__dirname, 'docs/screenshots');

const mockState = {
  months: [
    { year: 2025, month: 8,  credits: 3820, debits: 2650, cats: { food: 480, fuel: 180, night: 320, travel: 0,   shop: 650, transport: 120, other: 900 } },
    { year: 2025, month: 9,  credits: 3820, debits: 2430, cats: { food: 420, fuel: 160, night: 280, travel: 0,   shop: 580, transport: 110, other: 880 } },
    { year: 2025, month: 10, credits: 3820, debits: 2890, cats: { food: 510, fuel: 200, night: 450, travel: 200, shop: 680, transport: 130, other: 720 } },
    { year: 2025, month: 11, credits: 3820, debits: 3200, cats: { food: 620, fuel: 190, night: 580, travel: 400, shop: 750, transport: 140, other: 520 } },
    { year: 2026, month: 0,  credits: 3820, debits: 2560, cats: { food: 460, fuel: 175, night: 310, travel: 0,   shop: 620, transport: 115, other: 880 } },
    { year: 2026, month: 1,  credits: 3820, debits: 2480, cats: { food: 440, fuel: 165, night: 290, travel: 0,   shop: 600, transport: 105, other: 880 } },
    { year: 2026, month: 2,  credits: 3820, debits: 2630, cats: { food: 490, fuel: 180, night: 350, travel: 0,   shop: 640, transport: 120, other: 850 } },
  ],
  repayments: [
    { date: '2025-09-01', amount: 300,  note: 'Virement mensuel' },
    { date: '2025-10-01', amount: 300,  note: 'Virement mensuel' },
    { date: '2025-11-01', amount: 300,  note: 'Virement mensuel' },
    { date: '2025-12-01', amount: 500,  note: 'Remboursement exceptionnel' },
    { date: '2026-01-01', amount: 300,  note: 'Virement mensuel' },
    { date: '2026-02-01', amount: 300,  note: 'Virement mensuel' },
    { date: '2026-03-01', amount: 300,  note: 'Virement mensuel' },
  ],
  debt: { total: 8000, rate: 0 }
};

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('Lancement Firefox...');
  const browser = await puppeteer.launch({
    browser: 'firefox',
    executablePath: FIREFOX_PATH,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860 });

  // 1. Charger la page une première fois pour initialiser l'origine file://
  await page.goto(APP_URL, { waitUntil: 'load' });

  // 2. Injecter les données dans localStorage
  await page.evaluate((key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, 'budget_tracker_v1', mockState);

  // 3. Recharger pour que l'app lise le localStorage
  await page.goto(APP_URL, { waitUntil: 'load', timeout: 60000 });
  await delay(3500); // attendre Chart.js + fonts CDN + rendu

  // --- Screenshot 1 : Dashboard ---
  console.log('Dashboard...');
  await page.screenshot({ path: path.join(OUT_DIR, '01-dashboard.png') });

  // --- Screenshot 2 : Import ---
  console.log('Import...');
  await page.evaluate(() => goTab('import'));
  await delay(600);
  await page.screenshot({ path: path.join(OUT_DIR, '02-import.png') });

  // --- Screenshot 3 : Dette ---
  console.log('Dette...');
  await page.evaluate(() => goTab('dette'));
  await delay(1200);
  await page.screenshot({ path: path.join(OUT_DIR, '03-dette.png') });

  // --- Screenshot 4 : Insights ---
  console.log('Conseils...');
  await page.evaluate(() => goTab('insights'));
  await delay(600);
  await page.screenshot({ path: path.join(OUT_DIR, '04-insights.png') });

  await browser.close();
  console.log('Captures sauvegardées dans docs/screenshots/');
}

main().catch(err => { console.error(err); process.exit(1); });
