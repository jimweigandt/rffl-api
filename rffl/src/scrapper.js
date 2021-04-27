const puppeteer = require('puppeteer');

(async () => {
    const url = "https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=1&mid2=10";

    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page.goto(`${url}`, {
        waitUntil: 'networkidle2',
        timeout: 0
    });

    await page.waitForTimeout(5000);
    await page.waitForSelector("#matchups", {
        visible: false
    });

    await page.click("#bench-toggle");
    await page.waitForTimeout(5000);

    await browser.close();
})();