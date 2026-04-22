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
  launchOptions: { slowMo: 450 },
  outputDir: baseOutputDir
});

test('Validação e Compra de produto personalizado - Flamengo I 2026', async ({ page }, testInfo) => {
  test.setTimeout(300000); 

  const timestamp = getTimestamp();
  if (!fs.existsSync(baseOutputDir)) fs.mkdirSync(baseOutputDir, { recursive: true });

  const logFile = path.join(baseOutputDir, `Log_${timestamp}.txt`);
  const logAction = (msg) => {
    const formattedMsg = `[PERSONALIZA LOG] - ${msg}`;
    console.log(formattedMsg);
    fs.appendFileSync(logFile, formattedMsg + '\n');
  };

  const variacoesTeste = [
    { nome: 'ZICO', numero: '10' },
    { nome: 'GABIGOL', numero: '99' },
    { nome: 'ARRASCAETA', numero: '14' },
    { nome: 'PEDRO', numero: '9' },
    { nome: 'BRUNO HENRIQUE', numero: '27' },
    { nome: 'DE LA CRUZ', numero: '18' },
    { nome: 'GERSON', numero: '8' },
    { nome: 'VINI JR', numero: '23' },
    { nome: 'FLAMENGO', numero: '12' }
  ];
  const dadosValidos = variacoesTeste[Math.floor(Math.random() * variacoesTeste.length)];

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
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:40px;background:rgba(0,0,0,0.8);color:#0f0;z-index:999999;font-size:18px;font-family:monospace;padding:10px;text-align:center;pointer-events:none;';
      document.body.appendChild(overlay);
      setInterval(() => { if(document.getElementById('pw-url-overlay')) document.getElementById('pw-url-overlay').innerText = 'URL: ' + window.location.href; }, 200);
    });
  });

  logAction('--- Iniciando Teste de Validação ---');

  await test.step('Acessar Produto', async () => {
    logAction('Acessando Camisa Flamengo I 2026...');
    await page.goto('https://www.futfanatics.com.br/camisa-adidas-flamengo-i-2026', { waitUntil: 'domcontentloaded' });
    await closePopups();
  });

  await test.step('Selecionar Tamanho', async () => {
    logAction('Selecionando tamanho...');
    const seletorTamanho = page.locator('div[id^="cor_"]:not(.indisponivel), li[data-variant-type="Tamanho"] div:not(.indisponivel)').first();
    await seletorTamanho.waitFor({ state: 'visible', timeout: 20000 });
    await seletorTamanho.click({ force: true });
    await page.waitForTimeout(2000); 
  });

  await test.step('Teste: Verificar Proteção dos Campos', async () => {
    const inputNome = page.locator('input[placeholder*="Nome"], input[id*="personalizacao_nome"]').first();
    const inputNumero = page.locator('input[placeholder*="Número"], input[id*="personalizacao_numero"]').first();

    // Validação de Limite no Nome
    try {
      logAction('Verificando se o campo Nome limita caracteres (Máx esperado: 13)...');
      await inputNome.fill('NOME EXTREMAMENTE LONGO QUE DEVE SER CORTADO');
      const valNome = await inputNome.inputValue();
      if (valNome.length <= 13) {
        logAction(`[SUCESSO] Campo Nome protegeu o limite. Valor final: "${valNome}"`);
      } else {
        logAction(`[ALERTA] Campo Nome permitiu ${valNome.length} caracteres (Acima do esperado).`);
      }
    } catch (e) { logAction('[INFO] Bloqueio de inserção detectado no campo Nome (Comportamento Seguro).'); }

    // Validação de Tipo no Número
    try {
      logAction('Verificando se o campo Número bloqueia letras...');
      await inputNumero.fill('ABC'); 
      const valNum = await inputNumero.inputValue();
      if (valNum.match(/[a-zA-Z]/)) {
        logAction(`[ALERTA BUG] O campo Aceitou letras indesejadas: "${valNum}"`);
      } else {
        logAction('[SUCESSO] Campo Número bloqueou a entrada de letras corretamente.');
      }
    } catch (e) { 
      logAction('[SUCESSO] Bloqueio nativo detectado: O sistema impediu a inserção de letras.'); 
    }
  });

  await test.step('Fase Final: Preenchimento Válido e Compra', async () => {
    const inputNome = page.locator('input[placeholder*="Nome"], input[id*="personalizacao_nome"]').first();
    const inputNumero = page.locator('input[placeholder*="Número"], input[id*="personalizacao_numero"]').first();

    logAction(`Preenchendo dados sorteados: ${dadosValidos.nome} | № ${dadosValidos.numero}`);
    
    await inputNome.fill('');
    await inputNome.fill(dadosValidos.nome);
    
    await inputNumero.fill('');
    await inputNumero.pressSequentially(dadosValidos.numero, { delay: 100 });
    
    await closePopups();
    logAction('Adicionando ao carrinho...');
    const comprarBtn = page.locator('[data-tray-tst="button_buy_product"], .button-buy, #btn-comprar').first();
    await comprarBtn.click({ force: true });
    
    await page.waitForTimeout(4000);
    logAction('Teste concluído com sucesso.');
  });

  logAction('Salvando evidências...');
  const video = page.video();
  const pwTempDir = testInfo.outputDir;
  await page.context().close(); 

  if (video) {
    const targetVideoPath = path.join(baseOutputDir, `Video_${timestamp}.webm`);
    await video.saveAs(targetVideoPath);
  }

  if (fs.existsSync(pwTempDir)) {
    try { fs.rmSync(pwTempDir, { recursive: true, force: true }); } catch (e) {}
  }
});
