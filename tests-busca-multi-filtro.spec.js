const { test, expect } = require('@playwright/test');
const fs = require('fs');

/**
 * Script de teste: Busca + Multi-Filtros (Até 4 simultâneos)
 * 1. Realiza busca por um termo aleatório.
 * 2. Ciclo (2 vezes):
 *    a. Seleciona até 4 filtros de categorias diferentes.
 *    b. Valida a aplicação.
 *    c. Desmarca todos os filtros selecionados clicando neles novamente.
 */

test.use({ 
  video: {
    mode: 'on',
    size: { width: 1920, height: 1080 }
  },
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 800 } 
});

test('Fluxo de Multi-Filtragem (Combo de 4 filtros) na Busca', async ({ page }) => {
  test.setTimeout(240000); 

  const termosBusca = ['chuteira', 'camisa flamengo', 'mochila', 'bola de futebol', 'luva de goleiro'];
  const termo = termosBusca[Math.floor(Math.random() * termosBusca.length)];

  const logFile = 'results-multi-filtro.txt';
  fs.writeFileSync(logFile, ''); // Limpa o arquivo no início

  const logAction = (msg) => {
    const formattedMsg = `[MULTI-FILTER LOG] - ${msg}`;
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

  // Injeção de URL no vídeo
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

  logAction(`Iniciando busca por: ${termo}`);
  const searchInput = page.locator('#search-field, input[name="q"]').first();
  await searchInput.fill(termo);
  await page.locator('.busca form button[type="submit"]').first().click();
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000);

  const categoriasDisponiveis = ['Gênero', 'Tamanho', 'Tipo de Produto', 'Cor', 'Marca', 'Material'];

  for (let cycle = 1; cycle <= 2; cycle++) {
    await test.step(`Ciclo de Multi-Filtros #${cycle}`, async () => {
      logAction(`--- Iniciando Ciclo #${cycle} ---`);
      
      // Sorteia 4 categorias únicas para este ciclo
      const categoriasCiclo = [...categoriasDisponiveis]
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);

      let filtrosAplicados = []; // { categoria, texto, forId }

      for (const categoriaNome of categoriasCiclo) {
        await closePopups();
        const header = page.locator('.smarthint-search-filter-item-title, .filter-top').filter({ hasText: new RegExp(categoriaNome, 'i') }).first();
        
        if (await header.isVisible().catch(() => false)) {
          await header.scrollIntoViewIfNeeded();
          
          // Abre o acordeão se estiver fechado
          const isActive = await header.evaluate(n => n.classList.contains('active') || n.classList.contains('aberta')).catch(() => false);
          if (!isActive) {
            await header.click({ force: true });
            await page.waitForTimeout(1000);
          }

          const section = page.locator('.smarthint-search-filter-item, .filter-item').filter({ has: header }).first();
          const options = section.locator('.smarthint-search-filter-item-value, label').filter({ hasText: /[A-Za-z0-9]+/ });

          const count = await options.count();
          if (count > 0) {
            // Seleciona uma opção aleatória que NÃO esteja selecionada (se possível)
            const opt = options.nth(Math.floor(Math.random() * Math.min(count, 5)));
            const text = (await opt.innerText()).trim();
            const forId = await opt.getAttribute('for').catch(() => null);

            logAction(`Selecionando filtro [${categoriaNome}]: ${text}`);
            await opt.click({ force: true });
            filtrosAplicados.push({ categoriaNome, text, forId });
            
            // Espera a página processar o filtro (o Smarthint geralmente aplica no click)
            await page.waitForTimeout(2000);
          }
        }
      }

      // Verificação de URL
      logAction(`URL dps de aplicar combo de filtros: ${page.url()}`);
      expect(page.url()).toContain('search-term');

      // AGORA: Desmarcar todos os filtros aplicados neste ciclo
      logAction(`Iniciando desmarcação de ${filtrosAplicados.length} filtros...`);
      
      // Inverte a ordem para desmarcar do último para o primeiro (opcional, mas evita quebras de layout)
      for (const filtro of filtrosAplicados.reverse()) {
        await closePopups();
        logAction(`Desmarcando: ${filtro.text} (${filtro.categoriaNome})`);

        let labelToUncheck;
        if (filtro.forId) {
          labelToUncheck = page.locator(`label[for="${filtro.forId}"]`).first();
        } else {
          // Fallback pelo texto dentro da categoria
          const header = page.locator('.smarthint-search-filter-item-title, .filter-top').filter({ hasText: new RegExp(filtro.categoriaNome, 'i') }).first();
          const section = page.locator('.smarthint-search-filter-item, .filter-item').filter({ has: header }).first();
          labelToUncheck = section.locator('label, .smarthint-search-filter-item-value').filter({ hasText: filtro.text }).first();
        }

        if (await labelToUncheck.isVisible().catch(() => false)) {
          await labelToUncheck.scrollIntoViewIfNeeded();
          await labelToUncheck.click({ force: true });
          await page.waitForTimeout(1500); // Aguarda feedback da limpeza
        }
      }

      logAction(`Ciclo #${cycle} finalizado e filtros limpos.`);
      await page.waitForTimeout(2000);
    });
  }

  logAction('Fim do teste de multi-filtros. Aguardando finalização do vídeo...');
  await page.waitForTimeout(5000);
});
