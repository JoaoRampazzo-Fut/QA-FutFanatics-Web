const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const getTimestamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = now.toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-');
  return `${date}_${time}`;
};

const baseOutputDir = 'test-results/Filtro_Repro';

test.use({ 
  video: 'on',
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 600 },
  outputDir: baseOutputDir
});

test('Fluxo Sequencial de Filtros Aleatórios: Selecionar -> Filtrar (repetido)', async ({ page }) => {
  test.setTimeout(180000); 

  const timestamp = getTimestamp();
  if (!fs.existsSync(baseOutputDir)) fs.mkdirSync(baseOutputDir, { recursive: true });

  const logFile = path.join(baseOutputDir, `Log_${timestamp}.txt`);
  const logAction = (msg) => {
    const formattedMsg = `[TEST LOG] - ${msg}`;
    console.log(formattedMsg);
    fs.appendFileSync(logFile, formattedMsg + '\n');
  };

  const closePopups = async () => {
    const closeBtn = page.locator('#IS_widget_close, .IS_widget_close');
    if (await closeBtn.isVisible().catch(() => false)) {
      logAction('Limpando widget flutuante detectado');
      await closeBtn.click({ force: true }).catch(() => null);
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

  logAction('Acessando Clubes Brasileiros...');
  await page.goto('https://www.futfanatics.com.br/clubes-brasileiros', { waitUntil: 'domcontentloaded' });
  await closePopups();

  const categoriasDisponiveis = ['Marca', 'Gênero', 'Tipo de Produto'];
  let categoriasUtilizadas = [];

  for (let i = 1; i <= 2; i++) {
    const pool = categoriasDisponiveis.filter(c => !categoriasUtilizadas.includes(c));
    const categoriaNome = pool[Math.floor(Math.random() * pool.length)];
    categoriasUtilizadas.push(categoriaNome);

    await test.step(`Filtragem Aleatória #${i}: ${categoriaNome}`, async () => {
      const header = page.locator('.filter-top').filter({ hasText: new RegExp(categoriaNome, 'i') }).first();
      await header.scrollIntoViewIfNeeded();
      await header.click({ force: true }); 
      await page.waitForTimeout(2000);
      
      const section = page.locator('.filter-item').filter({ has: header }).first();
      const options = section.locator('label').filter({ hasText: /.+/ });
      const count = await options.count();
      
      if (count > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(count, 10));
        const optionLabel = options.nth(randomIndex);
        const optionText = (await optionLabel.innerText()).trim();

        logAction(`Selecionando: "${optionText}"`);
        await optionLabel.click({ force: true });

        logAction(`Clicando em Filtrar...`);
        const filterBtn = page.locator('button.filter-button:visible').first();
        await filterBtn.click({ force: true });

        await page.waitForLoadState('load');
        await page.waitForTimeout(3000);
        await closePopups();
        logAction(`URL dps do filtro: ${page.url()}`);
        expect(page.url()).toContain('?');
      }
    });
  }

  logAction('Finalizando...');
  const video = page.video();
  await page.close();
  if (video) await video.saveAs(path.join(baseOutputDir, `Video_${timestamp}.webm`));
});
