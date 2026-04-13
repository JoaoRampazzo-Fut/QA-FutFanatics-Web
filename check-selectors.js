const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('https://www.futfanatics.com.br/clubes-brasileiros', { waitUntil: 'domcontentloaded' });
        
        // Find all titles in sidebar
        const titles = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.filter-top, .filter-block-title, h3, h4'));
            return elements.map(el => ({
                tag: el.tagName,
                text: el.innerText.trim(),
                classes: el.className
            }));
        });
        
        console.log('--- FOUND TITLES ---');
        console.log(JSON.stringify(titles.filter(t => t.text.length > 2), null, 2));
        
        // Check for Adidas specifically
        const hasAdidas = await page.evaluate(() => {
            return document.body.innerText.includes('Adidas');
        });
        console.log('Has "Adidas":', hasAdidas);
        
        const adidasCheckboxes = await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('label, input, span')).filter(el => el.innerText.includes('Adidas') || (el.id && el.id.includes('adidas')));
            return els.map(el => ({
                tag: el.tagName,
                id: el.id,
                text: el.innerText.trim(),
                classes: el.className,
                visible: el.offsetWidth > 0
            }));
        });
        console.log('--- ADIDAS ELEMENTS ---');
        console.log(JSON.stringify(adidasCheckboxes, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
