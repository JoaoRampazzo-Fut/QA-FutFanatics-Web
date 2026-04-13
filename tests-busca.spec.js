const { test, expect } = require('@playwright/test');

/**
 * Script de teste: Busca de Produtos
 * 1. Acessar a home da FutFanatics
 * 2. Preencher o campo de busca com termos comuns
 * 3. Clicar no botão buscar e validar se foi redirecionado para a página de resultados da busca
 */

test.use({ 
  video: {
    mode: 'on',
    size: { width: 1920, height: 1080 }
  },
  viewport: { width: 1920, height: 1080 },
  launchOptions: { slowMo: 700 } 
});

test('Fluxo de Busca de Produtos Aleatório', async ({ page }) => {
  test.setTimeout(120000); 

  const termosBusca = [
    // Clubes Brasileiros Populares
    'camisa flamengo', 'camisa corinthians', 'camisa palmeiras', 'camisa sao paulo',
    'camisa santos', 'camisa vasco da gama', 'camisa fluminense', 'camisa botafogo',
    'camisa cruzeiro', 'camisa atletico mineiro', 'camisa gremio', 'camisa internacional',
    'camisa bahia', 'camisa vitoria', 'camisa sport recife', 'camisa ceara',
    'camisa fortaleza', 'camisa athletico paranaense', 'camisa coritiba',
    
    // Artigos Esportivos e de Treino
    'chuteira campo', 'chuteira society', 'chuteira futsal nike', 'bola de futebol',
    'luva de goleiro', 'caneleira', 'meiao', 'jaqueta corta vento',
    'moletom', 'camisa de treino', 'regata esportiva', 'bermuda termica',
    'calca de treino', 'tenis de corrida', 'mochila esportiva', 'bolsa de academia',
    'bone', 'squeeze', 'garrafa termica', 'agasalho', 'camisa real madrid'
  ];
  const logAction = (msg) => console.log(`[TEST LOG] - ${msg}`);

  const closePopups = async () => {
    // Array de seletores comuns de popups (newsletter, cookies, flutuantes)
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
      // Usamos uma verificação estrita rápida sem quebrar o timeout geral
      if (await closeBtn.isVisible().catch(() => false)) {
        logAction(`Fechando popup detectado: ${sel}`);
        await closeBtn.click({ force: true }).catch(() => null);
      }
    }
  };

  await test.step('Acessar a Home', async () => {
    // Injeta na página um banner fixo mostrando a URL atual para gravação no vídeo
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

  for (let i = 1; i <= 3; i++) {
    const termo = termosBusca[Math.floor(Math.random() * termosBusca.length)];
    
    await test.step(`Busca #${i} pelo termo: "${termo}"`, async () => {
      await closePopups(); // Limpa popups antes de interagir com o form
      
      logAction(`Digitando "${termo}" no campo de busca`);
      
      const searchInput = page.locator('#search-field, input[name="q"]').first();
      // Usar fill no playwright substitui o texto atual, ideal para iterações sequenciais.
      await searchInput.fill(termo);
      
      logAction('Clicando no botão de busca');
      const searchBtn = page.locator('.busca form button[type="submit"]').first();
      await searchBtn.click();
    });

    await test.step(`Validar redirecionamento de busca #${i}`, async () => {
      logAction('Aguardando carregamento da página de resultados...');
      await page.waitForLoadState('load');

      await closePopups(); // Limpa possíveis popups que renderizem na nova view

      // O result step agora deve esperar os produtos aparecerem ou demonstrar a tela carregada
      await page.waitForTimeout(4000); // Aguarda visualmente para o video mostrar a tela
      
      // Valida se a URL da página contem a query da busca
      logAction(`URL Final após busca #${i}: ${page.url()}`);
      expect(page.url()).toContain('search-term=');
    });
  }
});
