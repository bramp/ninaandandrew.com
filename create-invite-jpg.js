const puppeteer = require('puppeteer');

const url = require("url");
const path = require("path");

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

(async() => {
    const browser = await puppeteer.launch();

    for (currentUrl of [
        'http://localhost:8000/invite.html',
        'http://localhost:8000/invite-amma.html',
        'http://localhost:8000/invite-appa.html',
    ]) {
        const page = await browser.newPage();
        
        await page.emulateMediaType('print');
        await page.goto(currentUrl);
        await page.waitForSelector('img');

        const filename = path.basename(url.parse(currentUrl).pathname, '.html');

        for (width of [480, 720]) {
            await page.setViewport({
                width: width,
                height: width,
                deviceScaleFactor: 2,
            })

            await page.screenshot({
                path: 'www/invite/' + filename + '-' + width + '.jpg',
                fullPage: true,
                type: 'jpeg',
                quality: 95,
            });

            await page.screenshot({
                path: 'www/invite/' + filename + '-' + width + '.webp',
                fullPage: true,
                type: 'webp',
            });
        }
    }

    await browser.close();
})();