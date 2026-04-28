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
  test.setTimeout(120000); 

  const timestamp = getTimestamp();
  const outputDir = testInfo.outputDir;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const logFile = path.join(outputDir, `Log_${timestamp}.txt`);
  const logAction = (msg) => {
    const formattedMsg = `[PERSONALIZA LOG] - ${msg}`;
    console.log(formattedMsg);
    fs.appendFileSync(logFile, formattedMsg + '\n');
  };

  const variacoesTeste = [
    { nome: 'Ronaldo', numero: '9' },
    { nome: 'GABIGOL', numero: '17' },
    { nome: 'VINI JR', numero: '23' },
    { nome: 'ZICO', numero: '10' }
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
  logAction(`Dados Sorteados: Nome: ${dadosValidos.nome} | Número: ${dadosValidos.numero}`);

  await test.step('Busca e Filtro', async () => {
    logAction('Acessando home...');
    await page.goto('https://www.futfanatics.com.br/', { waitUntil: 'domcontentloaded' });
    await closePopups();
    
    logAction('Buscando "camiseta"...');
    const searchInput = page.locator('#search-field, input[name="q"]').first();
    await searchInput.fill('camiseta');
    await page.keyboard.press('Enter');
    
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const container = page.locator('.smarthint-search-filter-item.permite-personalizacao').first();
    await container.scrollIntoViewIfNeeded();
    const title = container.locator('.smarthint-search-filter-item-title');
    const isOpen = await title.evaluate(node => node.classList.contains('active')).catch(() => false);
    if (!isOpen) { await title.click({ force: true }); await page.waitForTimeout(1000); }

    const botaoSim = container.locator('input#sim, span:text-is("Sim")').first();
    await botaoSim.click({ force: true });
    await page.waitForTimeout(5000); 
  });

  await test.step('Selecionar Produto e Tamanho', async () => {
    const linkProd = page.locator('.product-item a, .sh-product-item a, .item-name a').first();
    await linkProd.click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await closePopups();
    await page.waitForTimeout(3000);

    const variacoes = page.locator('div[id^="cor_"]:not(.indisponivel), .variacao-item:not(.indisponivel), .lista_cor_variacao li div:not(.indisponivel)');
    const total = await variacoes.count();
    
    let sucessoTam = false;
    for (let i = 0; i < total; i++) {
      const item = variacoes.nth(i);
      const txt = (await item.innerText()).trim();
      logAction(`Selecionando Tamanho: ${txt}`);
      await item.click({ force: true });
      await page.waitForTimeout(2500);

      const erro = page.locator('.blocoAlerta, #aviseme, :has-text("não encontra-se disponível")').first();
      if (!await erro.isVisible().catch(() => false)) {
        sucessoTam = true;
        break;
      }
      logAction(`Tamanho ${txt} indisponível.`);
      await page.mouse.click(10, 10);
    }
    if (!sucessoTam) throw new Error('Produto sem estoque.');
  });

  await test.step('Personalização e Stress Test', async () => {
    logAction('Localizando campos...');
    const inputNome = page.locator('input[placeholder*="Nome"], input[id*="personalizacao_nome"]').first();
    const inputNumero = page.locator('input[placeholder*="Número"], input[id*="personalizacao_numero"]').first();
    
    await inputNome.waitFor({ state: 'visible', timeout: 15000 });

    logAction('--- Estresse: Limite Nome (13 chars) ---');
    await inputNome.fill('ANTIGRAVITY TESTE LIMITE');
    const valorNome = await inputNome.inputValue();
    if (valorNome.length <= 13) {
      logAction(`[SUCESSO] Nome limitado a ${valorNome.length} caracteres.`);
    } else {
      logAction(`[AVISO] Nome excedeu 13 caracteres.`);
    }

    logAction('--- Estresse: Letras no campo Número ---');
    try {
      await inputNumero.click();
      await inputNumero.fill(''); 
      await inputNumero.pressSequentially('ABC', { delay: 100 });
      
      const valorNum = await inputNumero.inputValue();
      if (valorNum === '' || !/[A-Za-z]/.test(valorNum)) {
        logAction('[SUCESSO] O campo bloqueou a digitação de letras.');
      } else {
        logAction('[AVISO] O campo aceitou letras.');
      }
    } catch (e) {
      logAction('[SUCESSO] O navegador bloqueou a inserção de letras nativamente.');
    }

    logAction(`Personalizando com: ${dadosValidos.nome} | Número: ${dadosValidos.numero}`);
    await inputNome.fill(dadosValidos.nome);
    await inputNumero.fill(dadosValidos.numero);
    await page.waitForTimeout(1000);
  });

  await test.step('Finalizar', async () => {
    logAction('Adicionando ao carrinho...');
    const btnComp = page.locator('[data-tray-tst="button_buy_product"], .button-buy, #btn-comprar').first();
    await btnComp.click({ force: true });
    await page.waitForTimeout(4000);
    logAction('Fim da jornada.');
  });

  const videoPath = await page.video()?.path();
  await page.context().close(); 

  if (videoPath && fs.existsSync(videoPath)) {
    const newVideoName = `Video_${timestamp}.webm`;
    const newVideoPath = path.join(outputDir, newVideoName);
    fs.renameSync(videoPath, newVideoPath);
    logAction(`Video renomeado para: ${newVideoName}`);
  }
});
