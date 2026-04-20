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

test('Compra de produto personalizado - Flamengo I 2026', async ({ page }, testInfo) => {
  test.setTimeout(300000); 

  const timestamp = getTimestamp();
  if (!fs.existsSync(baseOutputDir)) fs.mkdirSync(baseOutputDir, { recursive: true });

  const logFile = path.join(baseOutputDir, `Log_${timestamp}.txt`);
  const logAction = (msg) => {
    const formattedMsg = `[PERSONALIZA LOG] - ${msg}`;
    console.log(formattedMsg);
    fs.appendFileSync(logFile, formattedMsg + '\n');
  };

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

  logAction('Iniciando jornada de personalização...');

  await test.step('Acessar Produto', async () => {
    logAction('Acessando Camisa Flamengo I 2026...');
    await page.goto('https://www.futfanatics.com.br/camisa-adidas-flamengo-i-2026', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    await closePopups();
  });

  await test.step('Selecionar Tamanho', async () => {
    logAction('Buscando tamanho disponível...');
    const seletorTamanho = page.locator('div[id^="cor_"]:not(.indisponivel), li[data-variant-type="Tamanho"] div:not(.indisponivel)').first();
    await seletorTamanho.waitFor({ state: 'visible', timeout: 20000 });
    
    const labelTamanho = await seletorTamanho.innerText();
    logAction(`Selecionando tamanho: ${labelTamanho.trim()}`);
    
    await seletorTamanho.click({ force: true });
    await page.waitForTimeout(2000); 
  });

  await test.step('Preencher Personalização', async () => {
    const inputNome = page.locator('input[placeholder*="Nome"], input[id*="personalizacao_nome"]').first();
    const inputNumero = page.locator('input[placeholder*="Número"], input[id*="personalizacao_numero"]').first();

    await inputNome.waitFor({ state: 'visible', timeout: 20000 });
    
    logAction('Digitando Nome...');
    await inputNome.click();
    await inputNome.fill('JOAO RAMPAZZO');
    
    logAction('Digitando Número...');
    await inputNumero.click();
    await inputNumero.fill('23');
    
    await page.waitForTimeout(1500);
    await closePopups();
  });

  await test.step('Comprar e Adicionar', async () => {
    logAction('Clicando em Comprar...');
    const comprarBtn = page.locator('[data-tray-tst="button_buy_product"], .button-buy, #btn-comprar').first();
    await expect(comprarBtn).toBeEnabled({ timeout: 20000 });
    await comprarBtn.click({ force: true });
    
    // Pequeno aguarde apenas para o vídeo registrar o clique
    await page.waitForTimeout(3000);
    logAction('Ação de compra executada.');
  });

  logAction('Finalizando processamento do vídeo...');
  
  const video = page.video();
  const pwTempDir = testInfo.outputDir;

  // FECHAMENTO EXPLICITO DO CONTEXTO:
  // Isso força o navegador a encerrar o arquivo .webm e liberar para movimentação
  await page.context().close(); 

  if (video) {
    try {
      const targetVideoPath = path.join(baseOutputDir, `Video_${timestamp}.webm`);
      await video.saveAs(targetVideoPath);
      logAction(`Sucesso! Vídeo salvo em: Video_${timestamp}.webm`);
    } catch (err) {
      logAction('Erro ao mover vídeo, mas o teste funcional passou.');
    }
  }

  // Limpa pastas temporárias automáticas
  if (fs.existsSync(pwTempDir)) {
    try { fs.rmSync(pwTempDir, { recursive: true, force: true }); } catch (e) {}
  }
  
  logAction('Teste finalizado com sucesso.');
});
