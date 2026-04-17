const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const getTimestamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = now.toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-');
  return `${date}_${time}`;
};

const baseOutputDir = 'test-results/Busca_Simples';

test.use({ 
  video: 'on',
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 600 },
  outputDir: baseOutputDir
});

test('Fluxo de Busca de Produtos Aleatório', async ({ page }) => {
  test.setTimeout(180000); 

  const timestamp = getTimestamp();
  if (!fs.existsSync(baseOutputDir)) fs.mkdirSync(baseOutputDir, { recursive: true });

  const logFile = path.join(baseOutputDir, `Log_${timestamp}.txt`);
  const logAction = (msg) => {
    const formattedMsg = `[TEST LOG] - ${msg}`;
    console.log(formattedMsg);
    fs.appendFileSync(logFile, formattedMsg + '\n');
  };

  const termosBusca = [
    'camisa flamengo', 'camisa corinthians', 'camisa palmeiras', 'camisa sao paulo',
    'camisa santos', 'camisa vasco da gama', 'camisa fluminense', 'camisa botafogo',
    'camisa cruzeiro', 'camisa atletico mineiro', 'camisa gremio', 'camisa internacional',
    'camisa bahia', 'camisa vitoria', 'camisa sport recife', 'camisa ceara',
    'camisa fortaleza', 'camisa athletico paranaense', 'camisa coritiba',
    'chuteira campo', 'chuteira society', 'chuteira futsal nike', 'bola de futebol',
    'luva de goleiro', 'caneleira', 'meiao', 'jaqueta corta vento',
    'moletom', 'camisa de treino', 'regata esportiva', 'bermuda termica',
    'calca de treino', 'tenis de corrida', 'mochila esportiva', 'bolsa de academia',
    'bone', 'squeeze', 'garrafa termica', 'agasalho', 'camisa real madrid'
  ];

  const closePopups = async () => {
    const popupSelectors = [
      '#IS_widget_close', '.IS_widget_close', '.cookie-banner button',
      '.banner-app .btn-fechar', '.brinde_produto .fechar', '.fancybox-close',
      '.close-modal', '.smarthint-floating-widget-close'
    ];
    for (const sel of popupSelectors) {
      const closeBtn = page.locator(sel).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        logAction(`Fechando popup detectado: ${sel}`);
        await closeBtn.click({ force: true }).catch(() => null);
      }
    }
  };

  await page.addInitScript(() => {
    window.addEventListener('load', () => {
      const overlay = document.createElement('div');
      overlay.id = 'pw-url-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:rgba(0,0,0,0.8);color:#0f0;z-index:999999;font-size:18px;font-family:monospace;padding:10px;text-align:center;pointer-events:none;';
      document.body.appendChild(overlay);
      setInterval(() => { if(document.getElementById('pw-url-overlay')) document.getElementById('pw-url-overlay').innerText = 'URL: ' + window.location.href; }, 200);
    });
  });

  await page.goto('https://www.futfanatics.com.br/', { waitUntil: 'domcontentloaded' });
  await closePopups();

  for (let i = 1; i <= 3; i++) {
    const termo = termosBusca[Math.floor(Math.random() * termosBusca.length)];
    await test.step(`Busca #${i} pelo termo: "${termo}"`, async () => {
      await closePopups();
      logAction(`Digitando "${termo}"`);
      const searchInput = page.locator('#search-field, input[name="q"]').first();
      await searchInput.fill(termo);
      const searchBtn = page.locator('.busca form button[type="submit"]').first();
      await searchBtn.click();
      await page.waitForLoadState('load');
      await closePopups();
      await page.waitForTimeout(3000);
      logAction(`URL Final #${i}: ${page.url()}`);
      expect(page.url()).toContain('search-term=');
    });
  }

  logAction('Finalizando...');
  const video = page.video();
  await page.close();
  if (video) await video.saveAs(path.join(baseOutputDir, `Video_${timestamp}.webm`));
});
