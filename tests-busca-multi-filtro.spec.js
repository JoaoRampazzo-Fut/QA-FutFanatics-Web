const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const getTimestamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = now.toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-');
  return `${date}_${time}`;
};

const baseOutputDir = 'test-results/Busca_MultiFiltro';

test.use({ 
  video: 'on',
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 450 },
  outputDir: baseOutputDir // Define onde as pastas temporárias do PW vão cair
});

// Adicionamos o parâmetro testInfo para descobrir os caminhos internos do Playwright
test('Fluxo de Multi-Filtragem (Combo de 4 filtros) na Busca', async ({ page }, testInfo) => {
  test.setTimeout(600000); 

  const timestamp = getTimestamp();
  if (!fs.existsSync(baseOutputDir)) fs.mkdirSync(baseOutputDir, { recursive: true });

  const logFile = path.join(baseOutputDir, `Log_${timestamp}.txt`);
  const logAction = (msg) => {
    const formattedMsg = `[MULTI-FILTER LOG] - ${msg}`;
    console.log(formattedMsg);
    fs.appendFileSync(logFile, formattedMsg + '\n');
  };

  logAction('Iniciando Teste...');

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
      '.banner-app .btn-fechar', '.fancybox-close', '.smarthint-floating-widget-close'
    ];
    for (const sel of popupSelectors) {
      if (await page.locator(sel).first().isVisible().catch(() => false)) {
        await page.locator(sel).first().click({ force: true }).catch(() => null);
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

  logAction(`Busca por: ${termo}`);
  const searchInput = page.locator('#search-field, input[name="q"]').first();
  await searchInput.fill(termo);
  await page.locator('.busca form button[type="submit"]').first().click();
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);

  const categoriasDisponiveis = ['Gênero', 'Tamanho', 'Tipo de Produto', 'Cor', 'Marca', 'Material'];

  for (let cycle = 1; cycle <= 2; cycle++) {
    await test.step(`Ciclo de Multi-Filtros #${cycle}`, async () => {
      logAction(`--- Ciclo #${cycle} ---`);
      const categoriasCiclo = [...categoriasDisponiveis].sort(() => 0.5 - Math.random()).slice(0, 4);
      let filtrosAplicados = [];

      for (const categoriaNome of categoriasCiclo) {
        await closePopups();
        const header = page.locator('.smarthint-search-filter-item-title, .filter-top').filter({ hasText: new RegExp(categoriaNome, 'i') }).first();
        if (await header.isVisible().catch(() => false)) {
          await header.scrollIntoViewIfNeeded();
          const isActive = await header.evaluate(n => n.classList.contains('active') || n.classList.contains('aberta')).catch(() => false);
          if (!isActive) { await header.click({ force: true }); await page.waitForTimeout(1000); }

          const section = page.locator('.smarthint-search-filter-item, .filter-item').filter({ has: header }).first();
          const options = section.locator('.smarthint-search-filter-item-value, label').filter({ hasText: /[A-Za-z0-9]+/ });
          const count = await options.count();
          if (count > 0) {
            const opt = options.nth(Math.floor(Math.random() * Math.min(count, 5)));
            const text = (await opt.innerText()).trim();
            const forId = await opt.getAttribute('for').catch(() => null);
            logAction(`Filtro [${categoriaNome}]: ${text}`);
            await opt.click({ force: true });
            filtrosAplicados.push({ categoriaNome, text, forId });
            await page.waitForTimeout(1500); 
          }
        }
      }

      logAction(`URL dps do combo: ${page.url()}`);
      expect(page.url()).toContain('search-term');

      for (const filtro of filtrosAplicados.reverse()) {
        await closePopups();
        logAction(`Desmarcando: ${filtro.text}`);
        let labelToUncheck;
        if (filtro.forId) { labelToUncheck = page.locator(`label[for="${filtro.forId}"]`).first(); } 
        else {
          const header = page.locator('.smarthint-search-filter-item-title, .filter-top').filter({ hasText: new RegExp(filtro.categoriaNome, 'i') }).first();
          const section = page.locator('.smarthint-search-filter-item, .filter-item').filter({ has: header }).first();
          labelToUncheck = section.locator('label, .smarthint-search-filter-item-value').filter({ hasText: filtro.text }).first();
        }
        if (await labelToUncheck.isVisible().catch(() => false)) {
          await labelToUncheck.scrollIntoViewIfNeeded();
          await labelToUncheck.click({ force: true });
          await page.waitForTimeout(1000); 
        }
      }
      logAction(`Ciclo #${cycle} finalizado.`);
    });
  }

  logAction('Fim das ações. Finalizando vídeo...');
  
  const pwTempDir = testInfo.outputDir; // Caminho da pasta que o Playwright cria automaticamente
  const video = page.video();
  
  await page.close();

  // Salva nossa cópia limpa
  const targetVideoPath = path.join(baseOutputDir, `Video_${timestamp}.webm`);
  if (video) {
    await video.saveAs(targetVideoPath);
    logAction(`Vídeo final salvo em: Video_${timestamp}.webm`);
  }
  
  // LIMPEZA FINAL: Removemos a pasta que o Playwright criou automaticamente
  // (Esperamos um pouco para o PW liberar os arquivos se necessário)
  if (fs.existsSync(pwTempDir)) {
    try {
      // Removemos a pasta temporária do Playwright para ficar apenas o nosso resultado limpo
      fs.rmSync(pwTempDir, { recursive: true, force: true });
      logAction('Limpeza de pastas temporárias concluída.');
    } catch (e) {
      logAction('Nota: Não foi possível remover a pasta temporária agora (ela será ignorada).');
    }
  }

  logAction(`Concluído! Resultados em: ${baseOutputDir}`);
});
