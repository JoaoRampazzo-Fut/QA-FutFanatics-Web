const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const getTimestamp = () => {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const time = now.toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-');
  return `${date}_${time}`;
};

const baseOutputDir = 'test-results/Validador_Precos';

test.use({
  video: 'retain-on-failure',
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 200 },
  outputDir: baseOutputDir
});

const categorias = [
  'https://www.futfanatics.com.br/produtos-de-clubes-brasileiros',
  'https://www.futfanatics.com.br/camisas-e-produtos-de-clubes-internacionais',
  'https://www.futfanatics.com.br/calcados',
  'https://www.futfanatics.com.br/roupas',
  'https://www.futfanatics.com.br/lancamentos',
  'https://www.futfanatics.com.br/outlet',
];

test.describe('Validador de Preços Zerados', () => {

  const timestamp = getTimestamp();
  if (!fs.existsSync(baseOutputDir)) fs.mkdirSync(baseOutputDir, { recursive: true });
  const logFile = path.join(baseOutputDir, `Log_Precos_${timestamp}.txt`);

  const logAction = (msg) => {
    const formattedMsg = `[TEST LOG] - ${msg}`;
    console.log(formattedMsg);
    fs.appendFileSync(logFile, formattedMsg + '\n');
  };

  for (const baseUrl of categorias) {
    test(`Validar preços em: ${baseUrl}`, async ({ page }) => {
      test.setTimeout(120000); // 2 minutos por página

      const url = `${baseUrl}?order=1`; // Adiciona ordenação por Menor Preço
      logAction(`Acessando página: ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Fechar popups
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

      await page.waitForTimeout(3000); // Aguarda o carregamento dos produtos

      const produtosList = page.locator('div.price span');
      const count = await produtosList.count();

      logAction(`Para ${baseUrl}: foram encontrados ${count} produtos com preço renderizado.`);

      if (count === 0) {
        logAction(`AVISO: Nenhum produto foi encontrado em ${baseUrl}`);
      }

      let produtosZerados = 0;

      for (let i = 0; i < count; i++) {
        const precoElement = produtosList.nth(i);
        const precoContent = await precoElement.getAttribute('content');
        const precoText = await precoElement.innerText();

        // Verifica se o valor content é 0, 0.00 ou se o texto indica R$ 0,00
        const isZeradoContent = precoContent === '0' || precoContent === '0.00';
        const isZeradoText = precoText && (precoText.includes('0,00') || precoText.replace(/\D/g, '') === '000' || precoText.replace(/\D/g, '') === '0');

        if (isZeradoContent || isZeradoText) {
          produtosZerados++;
          logAction(`ERRO CRÍTICO: Produto zerado encontrado! Índice ${i}. Content: ${precoContent}, Texto: ${precoText}`);
        }
      }

      if (produtosZerados > 0) {
        const video = page.video();
        await page.close();
        if (video) await video.saveAs(path.join(baseOutputDir, `Video_ERRO_${baseUrl.split('/').pop()}_${timestamp}.webm`));
      } else {
        await page.close();
      }

      expect(produtosZerados, `A página ${baseUrl} não deve ter produtos com valor R$ 0,00`).toBe(0);
    });
  }
});
