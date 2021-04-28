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
        //"https://football.fantasysports.yahoo.com/2019/f1/2577/matchup?mid1=8&mid2=2&week=16"
        'https://football.fantasysports.yahoo.com/2020/f1/18281/matchup?week=13&mid1=1'
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

        // Extract week and dates from string
        let week = getWeek.split(': ')[0]; 
        let wholeDate = getWeek.split(': ')[1];
        let weekNumber = week.split(' ')[1];
        let startDate = wholeDate.split(' - ')[0];
        let endDate = wholeDate.split(' - ')[1];


        const getTeamNames = await page.evaluate(() => {
            const result = document.querySelector("#matchup-header").innerText;
            const teamNames = result.split("\n");

            return [teamNames[0], teamNames[6]];
        });

        const getPlayerInformation = await page.evaluate((i) => {
            
            // Selectors
            const id = '[class^="playernote Ta-start yfa-icon Z-1 yfa-rapid-beacon yfa-rapid-module-playernotes"]'
            const playerName = '[href^="https://sports.yahoo.com/nfl/"][class^="Nowrap"]'
            const emptySlot = '[class^="ysf-player-name Nowrap Grid-u Relative"]'
            const projectedPoints = '[class^="Alt Ta-end F-shade Va-top"]'
            const points = '[title^="Show Points Per Stat Breakdown"][class^="pps Fw-b has-stat-note"]'
            const dash = '[class^="Ta-end Fw-b Nowrap Va-top"],[class^="Pend-lg Ta-end Fw-b Nowrap Va-top"]'
            const last = '[class^="Alt Ta-end Fw-b Nowrap Va-top"]'
            const position = '[class^="Va-top Bg-shade F-shade Ta-c"]'
            const ir = '[class^="Alt Va-top Bg-shade F-shade Ta-c"]'


            const result = document.querySelectorAll(
                `${id},${playerName},${emptySlot},${projectedPoints},${points},${dash},${last},${position},${ir}`
            );
            
            const array = [];

            for (i = 0; i < result.length; i++) {

                if (result[i].getAttribute("data-ys-playerid") !== null) {
                    array.push(result[i].getAttribute("data-ys-playerid"));
                }

                if (result[i].getAttribute("class") === 'Nowrap') {
                    array.push(result[i].innerText);
                }

                if (result[i].innerText === "(Empty)") {
                    array.push("00000");
                    array.push("(Empty)");
                }

                if (result[i].getAttribute("class") === 'Alt Ta-end F-shade Va-top' && result[i].innerText !== "Proj") {
                    array.push(result[i].innerText)
                }

                if (result[i].getAttribute("title") === "Show Points Per Stat Breakdown") {
                    array.push(result[i].innerText)
                }

                if (result[i].innerText === "–") {
                    array.push(result[i].innerText)
                }

                if (result[i].getAttribute("class") === 'Alt Ta-end Fw-b Nowrap Va-top') {
                    array.push(result[i].innerText)
                }

                if (result[i].getAttribute("class") === 'Va-top Bg-shade F-shade Ta-c' && result[i].innerText !== 'TOTAL') {
                    array.push(result[i].innerText)
                } 

                if(result[i].innerText === 'IR') {
                    array.push(result[i].innerText)
                }

            };

            return array;
        })

        getPlayerInformation.forEach((element, index) => console.log(`${index} - ${element}`))

        const finalPlayerData = [];

        const pushPlayerData = () => {
            finalPlayerData.push(
                // Team 1 / Player 1 / Starting Lineup
                {
                    playerId: getPlayerInformation[6],
                    playerName: getPlayerInformation[2],
                    position: getPlayerInformation[7],
                    projection: getPlayerInformation[3],
                    points: getPlayerInformation[4],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 2 / Starting Lineup
                {
                    playerId: getPlayerInformation[16],
                    playerName: getPlayerInformation[12],
                    position: getPlayerInformation[17],
                    projection: getPlayerInformation[13],
                    points: getPlayerInformation[14],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 3 / Starting Lineup
                {
                    playerId: getPlayerInformation[26],
                    playerName: getPlayerInformation[22],
                    position: getPlayerInformation[27],
                    projection: getPlayerInformation[23],
                    points: getPlayerInformation[24],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 4 / Starting Lineup
                {
                    playerId: getPlayerInformation[36],
                    playerName: getPlayerInformation[32],
                    position: getPlayerInformation[37],
                    projection: getPlayerInformation[33],
                    points: getPlayerInformation[34],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 5 / Starting Lineup
                {
                    playerId: getPlayerInformation[46],
                    playerName: getPlayerInformation[42],
                    position: getPlayerInformation[47],
                    projection: getPlayerInformation[43],
                    points: getPlayerInformation[44],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 6 / Starting Lineup
                {
                    playerId: getPlayerInformation[56],
                    playerName: getPlayerInformation[52],
                    position: getPlayerInformation[57],
                    projection: getPlayerInformation[53],
                    points: getPlayerInformation[54],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 7 / Starting Lineup
                {
                    playerId: getPlayerInformation[66],
                    playerName: getPlayerInformation[62],
                    position: getPlayerInformation[67],
                    projection: getPlayerInformation[63],
                    points: getPlayerInformation[64],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 8 / Starting Lineup
                {
                    playerId: getPlayerInformation[76],
                    playerName: getPlayerInformation[72],
                    position: getPlayerInformation[77],
                    projection: getPlayerInformation[73],
                    points: getPlayerInformation[74],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 9 / Starting Lineup
                {
                    playerId: getPlayerInformation[88],
                    playerName: getPlayerInformation[83],
                    position: getPlayerInformation[89],
                    projection: getPlayerInformation[85],
                    points: getPlayerInformation[87],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 10 / Bench Lineup
                {
                    playerId: getPlayerInformation[106],
                    playerName: getPlayerInformation[102],
                    position: getPlayerInformation[107],
                    projection: getPlayerInformation[103],
                    points: getPlayerInformation[104],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 11 / Bench Lineup
                {
                    playerId: getPlayerInformation[116],
                    playerName: getPlayerInformation[112],
                    position: getPlayerInformation[117],
                    projection: getPlayerInformation[113],
                    points: getPlayerInformation[114],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 12 / Bench Lineup
                {
                    playerId: getPlayerInformation[126],
                    playerName: getPlayerInformation[122],
                    position: getPlayerInformation[127],
                    projection: getPlayerInformation[123],
                    points: getPlayerInformation[124],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
                // Team 1 / Player 13 / Bench Lineup
                {
                    playerId: getPlayerInformation[136],
                    playerName: getPlayerInformation[132],
                    position: getPlayerInformation[137],
                    projection: getPlayerInformation[133],
                    points: getPlayerInformation[134],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1]
                },
            )
        };

        pushPlayerData();

        //console.log(finalPlayerData);
    
        await browser.close();

        // const csvPlayerData = convertArrayToCSV(getPlayerInformation, {
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