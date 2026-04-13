const { test, expect } = require('@playwright/test');

/**
 * Script de teste: Busca + Filtro Isolado
 * 1. Acessa a home e realiza UMA busca
 * 2. Realiza um loop 3 vezes:
 *    a. Aplica 1 filtro aleatório (não repetido)
 *    b. Limpa o filtro (retornando a busca original)
 */

test.use({ 
  video: {
    mode: 'on',
    size: { width: 1920, height: 1080 }
  },
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 700 } 
});

test('Fluxo de Busca com Ciclos Independentes de Filtro', async ({ page }) => {
  test.setTimeout(180000); 

  const termosBusca = [
    // Clubes e Seleções
    'camisa flamengo', 'camisa corinthians', 'camisa palmeiras', 'selecao brasileira',
    // Artigos gerais para ter muitos filtros
    'chuteira', 'luva de goleiro', 'bone', 'bola', 'mochila'
  ];
  const termo = termosBusca[Math.floor(Math.random() * termosBusca.length)];

  const logAction = (msg) => console.log(`[TEST LOG] - ${msg}`);

  const closePopups = async () => {
    const popupSelectors = [
      '#IS_widget_close', 
      '.IS_widget_close', 
      '.cookie-banner button',
      '.banner-app .btn-fechar',
      '.brinde_produto .fechar',
      '.fancybox-close',
      '.close-modal',
      '.smarthint-floating-widget-close'
    ];
    
    for (const sel of popupSelectors) {
      const closeBtn = page.locator(sel).first();
      // Verificação estrita rápida
      if (await closeBtn.isVisible().catch(() => false)) {
        logAction(`Fechando popup detectado: ${sel}`);
        await closeBtn.click({ force: true }).catch(() => null);
      }
    }
  };

  await test.step('Acessar a Home', async () => {
    // Injeta overlay com URL para aparecer no vídeo
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        const overlay = document.createElement('div');
        overlay.id = 'pw-url-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:rgba(0,0,0,0.8);color:#0f0;z-index:999999;font-size:18px;font-family:monospace;padding:10px;text-align:center;pointer-events:none;';
        document.body.appendChild(overlay);
        setInterval(() => { if(document.getElementById('pw-url-overlay')) document.getElementById('pw-url-overlay').innerText = 'URL: ' + window.location.href; }, 200);
      });
    });

    logAction('Navegando para https://www.futfanatics.com.br/');
    await page.goto('https://www.futfanatics.com.br/', { waitUntil: 'domcontentloaded' });
    await closePopups();
  });

  await test.step(`Realizar busca raiz pelo termo: "${termo}"`, async () => {
    await closePopups();
    logAction(`Digitando "${termo}" no campo de busca inicial`);
    const searchInput = page.locator('#search-field, input[name="q"]').first();
    await searchInput.fill(termo);
    
    logAction('Clicando no botão de busca');
    const searchBtn = page.locator('.busca form button[type="submit"]').first();
    await searchBtn.click();
    
    logAction('Aguardando carregamento inicial da página de resultados...');
    await page.waitForLoadState('load');
    await page.waitForTimeout(4000); // Wait visuais para loading da grid
  });

  const searchBaseUrl = page.url();
  logAction(`A busca primária carregou na URL: ${searchBaseUrl}`);

  // Como o objetivo é não repetir categorias de filtros, manteremos um array de exclusão
  const categoriasDisponiveis = ['Gênero', 'Tamanho', 'Tipo de Produto', 'Idade', 'Material', 'Cor'];
  let categoriasUtilizadas = [];

  for (let i = 1; i <= 3; i++) {
    // Isola as opções pra não repetir contexto na mesma rodada
    const pool = categoriasDisponiveis.filter(c => !categoriasUtilizadas.includes(c));
    if(pool.length === 0) break;
    
    const categoriaNome = pool[Math.floor(Math.random() * pool.length)];
    categoriasUtilizadas.push(categoriaNome);
    
    await test.step(`Filtragem #${i} usando categoria exclusiva: "${categoriaNome}"`, async () => {
      await closePopups();
      logAction(`Buscando elemento da categoria: ${categoriaNome}...`);

      // O Smarthint na busca usa .smarthint-search-filter-item-title, enquanto a Tray nas categorias usa .filter-top
      const header = page.locator('.smarthint-search-filter-item-title, .filter-top').filter({ hasText: new RegExp(categoriaNome, 'i') }).first();
      
      if (await header.isVisible().catch(() => false)) {
        await header.scrollIntoViewIfNeeded();
        
        // Verifica se o acordeão já está aberto (Smarthint usa 'active', Tray aberta pode variar)
        const isActive = await header.evaluate(n => n.classList.contains('active') || n.classList.contains('aberta')).catch(() => false);
        if (!isActive) {
          await header.click({ force: true }); 
          await page.waitForTimeout(2000); // Tempo para o acordeão expandir
        }
        
        // Pega o container pai do filtro
        const section = page.locator('.smarthint-search-filter-item, .filter-item').filter({ has: header }).first();
        
        // Pega o container de valores e suas opções (Smarthint vs Tray)
        const valuesContainer = section.locator('.smarthint-search-filter-item-values, .varCont, ul, form').first();
        const options = valuesContainer.locator('.smarthint-search-filter-item-value, label, li:visible').filter({ hasText: /[A-Za-z0-9]+/ });
        
        const count = await options.count();
        if (count > 0) {
          // Limita pros primeiros resultados pra não quebrar view
          const randomIndex = Math.floor(Math.random() * Math.min(count, 8)); 
          const optionLabel = options.nth(randomIndex);
          const optionText = (await optionLabel.innerText()).trim();
          const optionFor = await optionLabel.getAttribute('for').catch(() => null);

          logAction(`Adicionando o filtro: [${optionText}]`);
          await optionLabel.click({ force: true });
          
          // VALIDAÇÃO CHAVE: Prevenir o silent-redirect da home e testar se filtros romperam a interface de busca.
          logAction(`URL após aplicar filtro: ${page.url()}`);
          expect(page.url()).not.toBe('https://www.futfanatics.com.br/');
          expect(page.url()).toContain('search-term');

          // LIMPAR O FILTRO CLICANDO DE VOLTA
          logAction(`Limpando o filtro desmarcando a opção: [${optionText}]`);
          await closePopups();

          // Como a página pode ter recarregado via AJAX ou navegação, reconectar com o DOM
          const headerReloaded = page.locator('.smarthint-search-filter-item-title, .filter-top').filter({ hasText: new RegExp(categoriaNome, 'i') }).first();
          if (await headerReloaded.isVisible().catch(() => false)) {
             await headerReloaded.scrollIntoViewIfNeeded();
             const isReloadedActive = await headerReloaded.evaluate(n => n.classList.contains('active') || n.classList.contains('aberta')).catch(() => false);
             if (!isReloadedActive) {
                await headerReloaded.click({ force: true }); 
                await page.waitForTimeout(2000);
             }
          }

          // Re-localiza a label idêntica baseada no atributo FOR guardado ou texto exato
          let clearLabel;
          if (optionFor) {
            clearLabel = page.locator(`label[for="${optionFor}"]`).first();
          } else {
            const sectionReloaded = page.locator('.smarthint-search-filter-item, .filter-item').filter({ has: headerReloaded }).first();
            const valuesContainerReloaded = sectionReloaded.locator('.smarthint-search-filter-item-values, .varCont, ul, form').first();
            clearLabel = valuesContainerReloaded.locator('.smarthint-search-filter-item-value, label, li:visible').filter({ hasText: optionText }).first();
          }

          await clearLabel.click({ force: true });

          // Espera o UI reagir e a URL ser limpa para a próxima iteração
          await page.waitForLoadState('load');
          await page.waitForTimeout(4000);

        } else {
          logAction(`Nenhuma opção viável dentro de "${categoriaNome}" nesta busca.`);
        }
      } else {
        logAction(`O filtro de categoria "${categoriaNome}" não apareceu para essa lista de produtos.`);
      }
    });
  }

  // Espera final para garantir que o vídeo capture o encerramento do teste com clareza
  logAction('Fim do teste. Aguardando 5 segundos para conclusão do vídeo...');
  await page.waitForTimeout(5000);
});
