const puppeteer = require('puppeteer');
const csvjson = require('csvjson');
const fs = require('fs');
const { start } = require('repl');

const currentYear = '2012';

(async () => {

    const urls = require(`./rffl-urls/${currentYear}-urls.js`);

    for (let i = 0; i < urls.length; i++) {

        const url = urls[i];

        
        // Each URL will start here at the beginning of this loop
        const browser = await puppeteer.launch({
            headless: true
        })

        const page = await browser.newPage();
    
        await page.goto(`${url}`, {
            waitUntil: 'networkidle2',
            timeout: 0
        });

        if (url.includes('2011')) {
            await page.type('[name=username]', 'jimweigandt');
            await page.click('[type=submit]');

            await page.waitForSelector('#login-passwd');
            await page.type('[name=password]', '@Vikings1961');
            await page.click('[type=submit]');
        };
    
        await page.waitForTimeout(1000);
        await page.waitForSelector("#matchups", {
            visible: true
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
        let year = url.slice(41, 45);

        const getTeamNames = await page.evaluate(() => {
            const result = document.querySelector("#matchup-header").innerText;
            const teamNames = result.split("\n");

            return [teamNames[0], teamNames[6]];
        });

        const getMatchupInformation = await page.evaluate(() => {

            const firstTeamPoints = '[class^="Fz-xxl Ta-end Ptop-xxl Pend-lg"]';
            const secondTeamPoints = '[class^="Fz-xxl Ta-start Ptop-xxl Pstart-lg"]';
            const firstTeamProj = '[class^="F-shade Ta-end Pend-lg Fz-med Pbot-xxl Ptop-med"]';
            const secondTeamProj = '[class^="F-shade Ta-start Pstart-lg Fz-med Pbot-xxl Ptop-med"]';

            const result = document.querySelectorAll(
                `${firstTeamPoints},${secondTeamPoints},${firstTeamProj},${secondTeamProj}`
            );

            const array = [];

            for (i = 0; i < result.length; i++) {
                array.push(result[i].innerText);
            }

            return array;
        })

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

        //getPlayerInformation.forEach((element, index) => console.log(`${index} - ${element}`))

        const finalGameData = [];

        const pushMatchupData = () => {
            finalGameData.push(
                // Team 1 Information
                {
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    teamPoints: getMatchupInformation[0],
                    opponentPoints: getMatchupInformation[1],
                    teamProj: getMatchupInformation[2],
                    oppProj: getMatchupInformation[3],
                    url: url
                },
                // Team 2 Information
                {
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    teamPoints: getMatchupInformation[1],
                    opponentPoints: getMatchupInformation[0],
                    teamProj: getMatchupInformation[3],
                    oppProj: getMatchupInformation[2],
                    url: url
                }
            )
        };

        pushMatchupData();
        
        const finalPlayerData = [];

        const pushPlayerData = () => {
            finalPlayerData.push(
                // Team 1 / Player 1 / Starting Lineup
                {
                    playerId: getPlayerInformation[0],
                    playerName: getPlayerInformation[1],
                    position: getPlayerInformation[4],
                    projection: getPlayerInformation[2],
                    points: getPlayerInformation[3],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 2 / Starting Lineup
                {
                    playerId: getPlayerInformation[9],
                    playerName: getPlayerInformation[10],
                    position: getPlayerInformation[13],
                    projection: getPlayerInformation[11],
                    points: getPlayerInformation[12],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 3 / Starting Lineup
                {
                    playerId: getPlayerInformation[18],
                    playerName: getPlayerInformation[19],
                    position: getPlayerInformation[22],
                    projection: getPlayerInformation[20],
                    points: getPlayerInformation[21],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 4 / Starting Lineup
                {
                    playerId: getPlayerInformation[27],
                    playerName: getPlayerInformation[28],
                    position: getPlayerInformation[31],
                    projection: getPlayerInformation[29],
                    points: getPlayerInformation[30],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 5 / Starting Lineup
                {
                    playerId: getPlayerInformation[36],
                    playerName: getPlayerInformation[37],
                    position: getPlayerInformation[40],
                    projection: getPlayerInformation[38],
                    points: getPlayerInformation[39],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 6 / Starting Lineup
                {
                    playerId: getPlayerInformation[45],
                    playerName: getPlayerInformation[46],
                    position: getPlayerInformation[49],
                    projection: getPlayerInformation[47],
                    points: getPlayerInformation[48],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 7 / Starting Lineup
                {
                    playerId: getPlayerInformation[54],
                    playerName: getPlayerInformation[55],
                    position: getPlayerInformation[58],
                    projection: getPlayerInformation[56],
                    points: getPlayerInformation[57],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 8 / Starting Lineup
                {
                    playerId: getPlayerInformation[63],
                    playerName: getPlayerInformation[64],
                    position: getPlayerInformation[67],
                    projection: getPlayerInformation[65],
                    points: getPlayerInformation[66],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 9 / Starting Lineup
                {
                    playerId: getPlayerInformation[72],
                    playerName: getPlayerInformation[73],
                    position: getPlayerInformation[76],
                    projection: getPlayerInformation[74],
                    points: getPlayerInformation[75],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 10 / Bench Lineup
                {
                    playerId: getPlayerInformation[83],
                    playerName: getPlayerInformation[84],
                    position: getPlayerInformation[87],
                    projection: getPlayerInformation[85],
                    points: getPlayerInformation[86],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 11 / Bench Lineup
                {
                    playerId: getPlayerInformation[92],
                    playerName: getPlayerInformation[93],
                    position: getPlayerInformation[96],
                    projection: getPlayerInformation[94],
                    points: getPlayerInformation[95],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 12 / Bench Lineup
                {
                    playerId: getPlayerInformation[101],
                    playerName: getPlayerInformation[102],
                    position: getPlayerInformation[105],
                    projection: getPlayerInformation[103],
                    points: getPlayerInformation[104],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 13 / Bench Lineup
                {
                    playerId: getPlayerInformation[110],
                    playerName: getPlayerInformation[111],
                    position: getPlayerInformation[114],
                    projection: getPlayerInformation[112],
                    points: getPlayerInformation[113],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 14 / Bench Lineup
                {
                    playerId: getPlayerInformation[119],
                    playerName: getPlayerInformation[120],
                    position: getPlayerInformation[123],
                    projection: getPlayerInformation[121],
                    points: getPlayerInformation[122],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 15 / Bench Lineup
                {
                    playerId: getPlayerInformation[128],
                    playerName: getPlayerInformation[129],
                    position: getPlayerInformation[132],
                    projection: getPlayerInformation[130],
                    points: getPlayerInformation[131],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 1 / Player 16 / IR Spot
                {
                    playerId: getPlayerInformation[137],
                    playerName: getPlayerInformation[138],
                    position: getPlayerInformation[141],
                    projection: getPlayerInformation[139],
                    points: getPlayerInformation[140],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[0],
                    rfflOpponent: getTeamNames[1],
                    url: url
                },
                // Team 2 / Player 1 / Starting Lineup
                {
                    playerId: getPlayerInformation[7],
                    playerName: getPlayerInformation[8],
                    position: getPlayerInformation[4],
                    projection: getPlayerInformation[6],
                    points: getPlayerInformation[5],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 2 / Starting Lineup
                {
                    playerId: getPlayerInformation[16],
                    playerName: getPlayerInformation[17],
                    position: getPlayerInformation[13],
                    projection: getPlayerInformation[15],
                    points: getPlayerInformation[14],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 3 / Starting Lineup
                {
                    playerId: getPlayerInformation[25],
                    playerName: getPlayerInformation[26],
                    position: getPlayerInformation[22],
                    projection: getPlayerInformation[24],
                    points: getPlayerInformation[23],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 4 / Starting Lineup
                {
                    playerId: getPlayerInformation[34],
                    playerName: getPlayerInformation[35],
                    position: getPlayerInformation[31],
                    projection: getPlayerInformation[33],
                    points: getPlayerInformation[32],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 5 / Starting Lineup
                {
                    playerId: getPlayerInformation[43],
                    playerName: getPlayerInformation[44],
                    position: getPlayerInformation[40],
                    projection: getPlayerInformation[42],
                    points: getPlayerInformation[41],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 6 / Starting Lineup
                {
                    playerId: getPlayerInformation[52],
                    playerName: getPlayerInformation[53],
                    position: getPlayerInformation[49],
                    projection: getPlayerInformation[51],
                    points: getPlayerInformation[50],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 7 / Starting Lineup
                {
                    playerId: getPlayerInformation[61],
                    playerName: getPlayerInformation[62],
                    position: getPlayerInformation[58],
                    projection: getPlayerInformation[60],
                    points: getPlayerInformation[59],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                }, 
                // Team 2 / Player 8 / Starting Lineup
                {
                    playerId: getPlayerInformation[70],
                    playerName: getPlayerInformation[71],
                    position: getPlayerInformation[67],
                    projection: getPlayerInformation[69],
                    points: getPlayerInformation[68],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 9 / Starting Lineup
                {
                    playerId: getPlayerInformation[79],
                    playerName: getPlayerInformation[80],
                    position: getPlayerInformation[76],
                    projection: getPlayerInformation[78],
                    points: getPlayerInformation[77],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 10 / Bench Lineup
                {
                    playerId: getPlayerInformation[90],
                    playerName: getPlayerInformation[91],
                    position: getPlayerInformation[87],
                    projection: getPlayerInformation[89],
                    points: getPlayerInformation[88],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 11 / Bench Lineup
                {
                    playerId: getPlayerInformation[99],
                    playerName: getPlayerInformation[101],
                    position: getPlayerInformation[96],
                    projection: getPlayerInformation[98],
                    points: getPlayerInformation[97],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 12 / Bench Lineup
                {
                    playerId: getPlayerInformation[108],
                    playerName: getPlayerInformation[109],
                    position: getPlayerInformation[105],
                    projection: getPlayerInformation[107],
                    points: getPlayerInformation[106],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 13 / Bench Lineup
                {
                    playerId: getPlayerInformation[117],
                    playerName: getPlayerInformation[118],
                    position: getPlayerInformation[114],
                    projection: getPlayerInformation[116],
                    points: getPlayerInformation[115],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 14 / Bench Lineup
                {
                    playerId: getPlayerInformation[126],
                    playerName: getPlayerInformation[127],
                    position: getPlayerInformation[123],
                    projection: getPlayerInformation[125],
                    points: getPlayerInformation[124],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 15 / Bench Lineup
                {
                    playerId: getPlayerInformation[135],
                    playerName: getPlayerInformation[136],
                    position: getPlayerInformation[132],
                    projection: getPlayerInformation[134],
                    points: getPlayerInformation[133],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                },
                // Team 2 / Player 16 / IR Spot
                {
                    playerId: getPlayerInformation[144],
                    playerName: getPlayerInformation[145],
                    position: getPlayerInformation[141],
                    projection: getPlayerInformation[143],
                    points: getPlayerInformation[142],
                    week: weekNumber,
                    startDate: startDate,
                    endDate: endDate,
                    year: year,
                    rfflTeam: getTeamNames[1],
                    rfflOpponent: getTeamNames[0],
                    url: url
                }
            )
        };

        pushPlayerData();
    
        await browser.close();

        let numberGamesWritten = 1 + i;

        const csvGameData = csvjson.toCSV(finalGameData, {
            headers: 'key'
        });

        fs.appendFile(`./csv/${currentYear}-game-data.csv`, csvGameData, (err) => {
            if (err) {
                console.log(err);

                throw new Error(err);
            }
            console.log(`${numberGamesWritten} Game Data Written to ${currentYear}-game-data.csv`);
        });

        const csvPlayerData = csvjson.toCSV(finalPlayerData, {
            headers: 'key'
        });

        fs.appendFile(`./csv/${currentYear}-player-data.csv`, csvPlayerData, (err) => {
            if (err) {
                console.log(err);

                throw new Error(err);
            }
            console.log(`${numberGamesWritten} Player Data Written to ${currentYear}-player-data.csv`);
        });

    }

})();