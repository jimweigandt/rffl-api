const puppeteer = require('puppeteer');

(async () => {
    const urls = [
        "https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=1&mid2=10",
        "https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=2&mid2=4",
        "https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=3&mid2=5",
        "https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=6&mid2=7",
        "https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=8&mid2=9"
    ];

    // Function to be able to forEach on async functions
    async function asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    };
    
    // Each URL will start here at the beginning of this loop
    asyncForEach(urls, async (i) => {
        const browser = await puppeteer.launch({
            headless: false
        });
    
        const page = await browser.newPage();
    
        await page.goto(`${i}`, {
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
    });

})();