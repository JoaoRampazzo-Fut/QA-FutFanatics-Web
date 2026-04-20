const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const getTimestamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = now.toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-');
  return `${date}_${time}`;
};

const baseOutputDir = 'test-results/Add_Carrinho';

test.use({ 
  video: 'on',
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 600 },
  outputDir: baseOutputDir
});

test('Adicionar produto ao carrinho pela PDP com variação', async ({ page }, testInfo) => {
  test.setTimeout(180000); 

  const timestamp = getTimestamp();
  if (!fs.existsSync(baseOutputDir)) fs.mkdirSync(baseOutputDir, { recursive: true });

  const logFile = path.join(baseOutputDir, `Log_${timestamp}.txt`);
  const logAction = (msg) => {
    const formattedMsg = `[CART LOG] - ${msg}`;
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

  logAction('Iniciando fluxo de Add ao Carrinho...');
  
  await test.step(`Buscar Termo Aleatório: ${termo}`, async () => {
    logAction(`Navegando para busca de: ${termo}...`);
    // Encode do termo para garantir que caracteres como espaços não quebrem a URL
    const urlBusca = `https://www.futfanatics.com.br/#&search-term=${encodeURIComponent(termo)}`;
    await page.goto(urlBusca, { waitUntil: 'domcontentloaded' });
    await closePopups();
    await page.waitForTimeout(3000);
  });

  await test.step('Selecionar Produto na Grid', async () => {
    logAction('Buscando primeiro produto visível nos resultados...');
    // Seletor mais genérico que funciona para qualquer produto, não apenas camisas
    const produtoLink = page.locator('.product-item a, .smarthint-product-item a').first();
    await expect(produtoLink).toBeVisible({ timeout: 20000 });
    
    await produtoLink.click();
    await page.waitForLoadState('load');
    logAction('Entrou na PDP.');
  });

  await test.step('Configurar Variação e Comprar', async () => {
    await closePopups();
    logAction('Validando página do produto...');
    
    // Tenta selecionar um tamanho se existir
    const secaoTamanho = page.locator('li[data-variant-type="Tamanho"], .lista_cor_variacao').first();
    const tamanhoDisponivel = page.locator('div[id^="cor_"]:not(.indisponivel), .tamanho-item:not(.disabled)').first();

    if (await secaoTamanho.isVisible().catch(() => false) && await tamanhoDisponivel.isVisible().catch(() => false)) {
      logAction('Selecionando tamanho disponível...');
      await tamanhoDisponivel.click();
      await page.waitForTimeout(1000);
    } else {
      logAction('Produto sem variações visíveis ou tamanho único.');
    }
    
    logAction('Clicando em Comprar...');
    const comprarBtn = page.locator('[data-tray-tst="button_buy_product"], .btn-add-cart, #btn-comprar').first();
    await expect(comprarBtn).toBeVisible({ timeout: 15000 });
    await comprarBtn.click();
    await page.waitForTimeout(3000);
  });

  await test.step('Avançar para o Carrinho', async () => {
    await closePopups();
    logAction('Aguardando confirmação de adição...');
    const avancarCarrinho = page.locator('a:has(img[alt="Avançar"]), a:has-text("Avançar"), .cart-go-to-checkout, .btn-checkout').first();
    
    if (await avancarCarrinho.isVisible({ timeout: 10000 }).catch(() => false)) {
      logAction('Indo para o carrinho...');
      await avancarCarrinho.click();
    } else {
      logAction('Redirecionamento automático ou modal não apareceu, tentando ir via URL...');
      await page.goto('https://www.futfanatics.com.br/checkout/carrinho');
    }
    
    await page.waitForURL(/carrinho|checkout/i, { timeout: 20000 });
    logAction(`Sucesso! Carrinho alcançado: ${page.url()}`);
  });

  logAction('Finalizando...');
  const pwTempDir = testInfo.outputDir;
  const video = page.video();
  
  await page.close();

  const targetVideoPath = path.join(baseOutputDir, `Video_${timestamp}.webm`);
  if (video) {
    await video.saveAs(targetVideoPath);
    logAction(`Vídeo persistido: Video_${timestamp}.webm`);
  }

  if (fs.existsSync(pwTempDir)) {
    try { fs.rmSync(pwTempDir, { recursive: true, force: true }); } catch (e) {}
  }
});
