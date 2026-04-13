const { test, expect } = require('@playwright/test');

/**
 * Script de teste com FILTROS ALEATÓRIOS:
 * 1. Escolher uma categoria aleatória e uma opção aleatória -> Filtrar
 * 2. Escolher OUTRA categoria aleatória e outra opção aleatória -> Filtrar novamente
 * 
 * Tempo de Execução (SlowMo): 500ms (ajustado para performance)
 */

test.use({ 
  video: 'on',
  launchOptions: { slowMo: 500 } 
});

test('Fluxo Sequencial de Filtros Aleatórios: Selecionar -> Filtrar (repetido)', async ({ page }) => {
  test.setTimeout(180000); 

  const logAction = (msg) => console.log(`[TEST LOG] - ${msg}`);

  const closePopups = async () => {
    const closeBtn = page.locator('#IS_widget_close, .IS_widget_close');
    if (await closeBtn.isVisible()) {
      logAction('Limpando widget flutuante detectado');
      await closeBtn.click({ force: true }).catch(() => null);
    }
  };

  await test.step('Acessar Clubes Brasileiros', async () => {
    logAction('Navegando para https://www.futfanatics.com.br/clubes-brasileiros');
    await page.goto('https://www.futfanatics.com.br/clubes-brasileiros', { waitUntil: 'domcontentloaded' });
    await closePopups();
  });

  const categoriasDisponiveis = ['Marca', 'Gênero', 'Tipo de Produto'];
  let categoriasUtilizadas = [];

  for (let i = 1; i <= 2; i++) {
    await test.step(`Filtragem Aleatória #${i}`, async () => {
      const pool = categoriasDisponiveis.filter(c => !categoriasUtilizadas.includes(c));
      const categoriaNome = pool[Math.floor(Math.random() * pool.length)];
      categoriasUtilizadas.push(categoriaNome);

      logAction(`Iniciando Filtragem #${i} na categoria: ${categoriaNome}`);

      const header = page.locator('.filter-top').filter({ hasText: new RegExp(categoriaNome, 'i') }).first();
      await header.scrollIntoViewIfNeeded();
      await header.click({ force: true }); 
      await page.waitForTimeout(2000);
      
      const section = page.locator('.filter-item').filter({ has: header }).first();
      const options = section.locator('label').filter({ hasText: /.+/ });
      
      const count = await options.count();
      logAction(`Total de opções em ${categoriaNome}: ${count}`);
      
      if (count === 0) {
        throw new Error(`Nenhuma opção encontrada para ${categoriaNome}`);
      }

      const randomIndex = Math.floor(Math.random() * Math.min(count, 10)); // Limita a busca para os primeiros 10 para evitar timeouts
      const optionLabel = options.nth(randomIndex);
      const optionText = (await optionLabel.innerText()).trim();

      logAction(`Selecionando: "${optionText}"`);
      await optionLabel.click({ force: true });

      logAction(`Clicando em Filtrar...`);
      const filterBtn = page.locator('button.filter-button:visible').first();
      await filterBtn.click({ force: true });

      await page.waitForLoadState('load');
      await page.waitForTimeout(2000);
      await closePopups();
    });
  }

  await test.step('Validação Final', async () => {
    logAction(`Fim do teste aleatório. URL Final: ${page.url()}`);
    expect(page.url()).toContain('?');
  });
});
