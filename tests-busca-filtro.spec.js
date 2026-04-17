const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const getTimestamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = now.toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-');
  return `${date}_${time}`;
};

const baseOutputDir = 'test-results/Busca_Filtro';

test.use({ 
  video: 'on',
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 600 },
  outputDir: baseOutputDir
});

test('Fluxo de Busca com Ciclos Independentes de Filtro', async ({ page }) => {
  test.setTimeout(300000); 

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
  const termo = termosBusca[Math.floor(Math.random() * termosBusca.length)];

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

  logAction('Acessando Home...');
  await page.goto('https://www.futfanatics.com.br/', { waitUntil: 'domcontentloaded' });
  await closePopups();

  logAction(`Busca raiz por: ${termo}`);
  const searchInput = page.locator('#search-field, input[name="q"]').first();
  await searchInput.fill(termo);
  const searchBtn = page.locator('.busca form button[type="submit"]').first();
  await searchBtn.click();
  await page.waitForLoadState('load');
  await page.waitForTimeout(4000);

  const categoriasDisponiveis = ['Gênero', 'Tamanho', 'Tipo de Produto', 'Idade', 'Material', 'Cor'];
  let categoriasUtilizadas = [];

  for (let i = 1; i <= 3; i++) {
    const pool = categoriasDisponiveis.filter(c => !categoriasUtilizadas.includes(c));
    if(pool.length === 0) break;
    const categoriaNome = pool[Math.floor(Math.random() * pool.length)];
    categoriasUtilizadas.push(categoriaNome);

    await test.step(`Filtragem #${i}: "${categoriaNome}"`, async () => {
      await closePopups();
      const header = page.locator('.smarthint-search-filter-item-title, .filter-top').filter({ hasText: new RegExp(categoriaNome, 'i') }).first();
      if (await header.isVisible().catch(() => false)) {
        await header.scrollIntoViewIfNeeded();
        const isActive = await header.evaluate(n => n.classList.contains('active') || n.classList.contains('aberta')).catch(() => false);
        if (!isActive) { await header.click({ force: true }); await page.waitForTimeout(1000); }

        const section = page.locator('.smarthint-search-filter-item, .filter-item').filter({ has: header }).first();
        const options = section.locator('.smarthint-search-filter-item-value, label, li:visible').filter({ hasText: /[A-Za-z0-9]+/ });
        const count = await options.count();
        if (count > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(count, 8)); 
          const optionLabel = options.nth(randomIndex);
          const optionText = (await optionLabel.innerText()).trim();
          const optionFor = await optionLabel.getAttribute('for').catch(() => null);

          logAction(`Aplicando filtro: [${optionText}]`);
          await optionLabel.click({ force: true });
          await page.waitForLoadState('load');
          await page.waitForTimeout(3000); 

          logAction(`URL após filtro: ${page.url()}`);
          expect(page.url()).not.toBe('https://www.futfanatics.com.br/');
          expect(page.url()).toContain('search-term');

          logAction(`Limpando filtro desmarcando: [${optionText}]`);
          await closePopups();
          const headerReloaded = page.locator('.smarthint-search-filter-item-title, .filter-top').filter({ hasText: new RegExp(categoriaNome, 'i') }).first();
          if (await headerReloaded.isVisible().catch(() => false)) {
             await headerReloaded.scrollIntoViewIfNeeded();
             const isReloadedActive = await headerReloaded.evaluate(n => n.classList.contains('active') || n.classList.contains('aberta')).catch(() => false);
             if (!isReloadedActive) { await headerReloaded.click({ force: true }); await page.waitForTimeout(1000); }
          }

          let clearLabel;
          if (optionFor) { clearLabel = page.locator(`label[for="${optionFor}"]`).first(); } 
          else {
            const sectionReloaded = page.locator('.smarthint-search-filter-item, .filter-item').filter({ has: headerReloaded }).first();
            const valuesContainerReloaded = sectionReloaded.locator('.smarthint-search-filter-item-values, .varCont, ul, form').first();
            clearLabel = valuesContainerReloaded.locator('.smarthint-search-filter-item-value, label, li:visible').filter({ hasText: optionText }).first();
          }

          await clearLabel.click({ force: true });
          await page.waitForLoadState('load');
          await page.waitForTimeout(3000);
        }
      }
    });
  }

  logAction('Finalizando...');
  const video = page.video();
  await page.close();
  if (video) await video.saveAs(path.join(baseOutputDir, `Video_${timestamp}.webm`));
});
