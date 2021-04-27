const puppeteer = require('puppeteer');
const csvjson = require('csvjson');
const fs = require('fs');

const { convertArrayToCSV } = require('convert-array-to-csv');

(async () => {
    const urls = [
        //"https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=1&mid2=10",
        //"https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=2&mid2=4",
        //"https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=3&mid2=5",
        //"https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=6&mid2=7",
        //"https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=1&mid1=8&mid2=9",
        //'https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?mid1=4&mid2=2&week=15'
        //"https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=3&mid1=1&mid2=5"
        //"https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?week=11&mid1=1&mid2=2"
        "https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?mid1=8&mid2=2&week=16"
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
            headless: true
        });
    
        const page = await browser.newPage();
    
        await page.goto(`${i}`, {
            waitUntil: 'networkidle2',
            timeout: 0
        });
    
        await page.waitForTimeout(1000);
        await page.waitForSelector("#matchups", {
            visible: false
        });
    
        await page.click("#bench-toggle");
        await page.waitForTimeout(1000);

        // Saves the Week and dates for specified matchup
        const getWeek = await page.evaluate(() => {
            const result = document.querySelector("#fantasy").innerText;
            const weekData = result.split("\n");

            return weekData[0];
        });

        let weekNumber = getWeek.substr(0, getWeek.indexOf(":"));

        let week;

        if (weekNumber.length === 8) {
            week = weekNumber.slice(6,8);
        } else if (weekNumber.length === 7) {
            week = weekNumber.slice(6,7);
        } else {
            week = weekNumber.slice(5,6);
        }

        console.log(week);

        // for (let i = 0; i < getWeek.length; i++) {
        //     if (i === 0) {
        //         weekNumber.push(getWeek[i]);
        //     }
        // }

        const getTeamNames = await page.evaluate(() => {
            const result = document.querySelector("#matchup-header").innerText;
            const teamNames = result.split("\n");

            return [teamNames[0], teamNames[6]];
        });

        const getPlayerInformation = await page.evaluate((i) => {
            
            // Selectors
            const playerName = '[href^="https://sports.yahoo.com/nfl/players/"][class^="Nowrap"]'
            const defenseName = '[href^="https://sports.yahoo.com/nfl/teams/"][class^="Nowrap"]'
            const projectedPoints = '[class^="Alt Ta-end F-shade"]'
            const totalPoints = '[class^="pps Fw-b has-stat-note"]'
            const position = '[class^="Va-top Bg-shade F-shade Ta-c"]'

            const result = document.querySelectorAll(
                `${playerName},${defenseName},${projectedPoints},${totalPoints},${position}`
                // `[href^="https://sports.yahoo.com/nfl/players/"][class^="Nowrap"],[class^="Alt Ta-end F-shade"],[class^="pps Fw-b has-stat-note"],[class^="Va-top Bg-shade F-shade Ta-c"]`
            );
            // const startingData = result.split("\n");
            
            const array = [];

            for (i = 0; i < result.length; i++) {
                array.push(result[i].innerText);
                
                if (result[i].getAttribute("href") != null) {
                    array.push(result[i].getAttribute("href"));
                }
            };

            return array;
        })

        //console.log(getPlayerInformation);


        const finalPlayerData = [];

        const pushPlayerData = () => {
            finalPlayerData.push(
                // Team 1 / Player 1 / QB
                {
                    playerUrl: getPlayerInformation[2],
                    playerId: getPlayerInformation[5],
                    playerName: getPlayerInformation[1],
                    position: getPlayerInformation[6],
                    projection: getPlayerInformation[3],
                    points: getPlayerInformation[4],
                    week: week,
                    date: "placeholder",
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                }
            )
        };

        pushPlayerData();

        console.log(finalPlayerData);
    
        await browser.close();

        // const csvPlayerData = convertArrayToCSV(getPlayerInformation, {
        //     separator: ';'
        // });

        // fs.appendFile('test.csv', csvPlayerData, (err) => {
        //     if (err) {
        //         console.log(err);

        //         throw new Error(err);
        //     }
        //     console.log("Go look!")
        // })



    });

})();