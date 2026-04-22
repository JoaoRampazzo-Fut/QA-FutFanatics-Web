const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const getTimestamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = now.toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-');
  return `${date}_${time}`;
};

const baseOutputDir = 'test-results/Personalizacao';

test.use({ 
  video: 'on',
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 500 },
  outputDir: baseOutputDir
});

test('Fluxo Dinâmico: Busca e Personalização (SmartHint Pattern)', async ({ page }, testInfo) => {
  test.setTimeout(100000); // Conforme sua alteração

  const timestamp = getTimestamp();
  if (!fs.existsSync(baseOutputDir)) fs.mkdirSync(baseOutputDir, { recursive: true });

  const logFile = path.join(baseOutputDir, `Log_${timestamp}.txt`);
  const logAction = (msg) => {
    const formattedMsg = `[PERSONALIZA LOG] - ${msg}`;
    console.log(formattedMsg);
    fs.appendFileSync(logFile, formattedMsg + '\n');
  };

  const variacoesTeste = [
    { nome: 'ARRASCAETA', numero: '14' },
    { nome: 'GABIGOL', numero: '99' },
    { nome: 'VINI JR', numero: '23' },
    { nome: 'FLAMENGO', numero: '10' }
  ];
  const dadosValidos = variacoesTeste[Math.floor(Math.random() * variacoesTeste.length)];

  const closePopups = async () => {
    const popupSelectors = [
      '#IS_widget_close', '.IS_widget_close', '.cookie-banner button',
      '.banner-app .btn-fechar', '.fancybox-close', '.smarthint-floating-widget-close',
      '.sh-widget-close', '.linx-impulse-close', 'button[aria-label="Close"]'
    ];
    for (const sel of popupSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click({ force: true, timeout: 1500 }).catch(() => null);
        }
      } catch (e) {}
    }
  };

  await page.addInitScript(() => {
    window.addEventListener('load', () => {
      const overlay = document.createElement('div');
      overlay.id = 'pw-url-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:40px;background:rgba(0,0,0,0.8);color:#0f0;z-index:999999;font-size:18px;font-family:monospace;padding:10px;text-align:center;pointer-events:none;';
      document.body.appendChild(overlay);
      setInterval(() => { if(document.getElementById('pw-url-overlay')) document.getElementById('pw-url-overlay').innerText = 'URL: ' + window.location.href; }, 200);
    });
  });

  logAction('--- Iniciando Jornada ---');

  await test.step('Busca', async () => {
    logAction('Acessando home...');
    await page.goto('https://www.futfanatics.com.br/', { waitUntil: 'domcontentloaded' });
    await closePopups();
    
    logAction('Buscando "camiseta"...');
    const searchInput = page.locator('#search-field, input[name="q"]').first();
    await searchInput.fill('camiseta');
    await page.keyboard.press('Enter');
    
    await page.waitForLoadState('load');
    await page.waitForTimeout(4000);
  });

  await test.step('Filtro "Sim"', async () => {
    await closePopups();

    // Seletor cirúrgico baseado no seu print do inspetor
    const container = page.locator('.smarthint-search-filter-item.permite-personalizacao').first();
    await container.scrollIntoViewIfNeeded();

    // Verifica se já está aberto (classe 'active' no título)
    const title = container.locator('.smarthint-search-filter-item-title');
    const isOpen = await title.evaluate(node => node.classList.contains('active')).catch(() => false);
    
    if (!isOpen) {
      logAction('Abrindo categoria de filtro...');
      await title.click({ force: true });
      await page.waitForTimeout(1000);
    }

    logAction('Selecionando filtro Permite Personalização');
    // Clica no ID exato 'sim' ou no span que o acompanha
    const botaoSim = container.locator('input#sim, span:text-is("Sim")').first();
    await botaoSim.click({ force: true });
    
    logAction('Filtro aplicado. Aguardando recarregamento...');
    await page.waitForTimeout(5000); 
  });

  await test.step('Escolher Produto e Comprar', async () => {
    logAction('Selecionando produto...');
    const linkProd = page.locator('.product-item a, .sh-product-item a, .item-name a').first();
    await linkProd.waitFor({ state: 'visible', timeout: 15000 });
    await linkProd.click({ force: true });
    
    await page.waitForLoadState('domcontentloaded');
    await closePopups();
    await page.waitForTimeout(2000);

    logAction('Validando tamanhos...');
    const variacoes = page.locator('div[id^="cor_"]:not(.indisponivel), .variacao-item:not(.indisponivel), .lista_cor_variacao li div:not(.indisponivel)');
    const total = await variacoes.count();
    
    let sucessoTam = false;
    for (let i = 0; i < total; i++) {
      const item = variacoes.nth(i);
      const txt = (await item.innerText()).trim();
      logAction(`Tentando: ${txt}`);
      await item.click({ force: true });
      await page.waitForTimeout(2000);

      const erro = page.locator('.blocoAlerta, #aviseme, :has-text("não encontra-se disponível")').first();
      if (!await erro.isVisible().catch(() => false)) {
        sucessoTam = true;
        break;
      }
      logAction(`Tamanho ${txt} esgotado.`);
      await page.mouse.click(10, 10);
    }

    const inputNome = page.locator('input[placeholder*="Nome"], input[id*="personalizacao_nome"]').first();
    const inputNumero = page.locator('input[placeholder*="Número"], input[id*="personalizacao_numero"]').first();
    await inputNome.fill(dadosValidos.nome);
    await inputNumero.fill(dadosValidos.numero);
    
    logAction('Comprando...');
    const btnComp = page.locator('[data-tray-tst="button_buy_product"], .button-buy, #btn-comprar').first();
    await btnComp.click({ force: true });
    await page.waitForTimeout(4000);
  });

  logAction('Fim.');
  await page.context().close(); 
});
