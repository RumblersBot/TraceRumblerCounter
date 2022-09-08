//RumbleBot
const Discord = require("discord.js")
const { addLog } = require('../functions/logs')
const { resolveMember } = require('../functions/parameters');
const debug = false

const checkChannels = ["976585766195064922", "976586083057950801", "976586123914641509", "983827504534011954"]
const specialChannels = ["976535610976268368", "976535722192404541", "976535893328404510", "981239346256560148"]

module.exports = {
    run: async ({ client, message }) => {
        if (message.guild.id !== '968176372944109709') return
        try {
            await checkRumbleGame(client, message)
        } catch (error) {
            addLog(`counter: ${error}`, error.stack)
        }
    }
}

async function checkRumbleGame(client, message) {

    if (!client.channelData) client.channelData = new Discord.Collection()
    let channelStatus = client.channelData.get(message.channel.id)
    if (!channelStatus) {
        channelStatus = {
            "lastWinner": null,
            "battleStarted": false,
            "ptsModifier": 0,
            "prevPityInfo": [],
            "pityInfo": [],
            "killedUsers": [],
            "revivedUsers": []
        }
    }

    let embeds = message.embeds
    let msg = ""
    let title = ""
    let roundKilledUsers = []

    if (!embeds) return
    if (!message.embeds[0]) return

    let embedFound = message.embeds[0]
    if (embedFound.title === null) return

    if (embedFound.title.includes("Started a new Rumble Royale session") || embedFound.title === "Rumble Royale") {
        let data = embedFound.description.split('\n')
        data = data.filter(e => e.includes("Number of participants:"))
        if (!!data && data.length !== 0) {
            let userCount = data[0].split(':')[1].split(' ')[1]
            if (!!userCount && userCount > 2) {
                channelStatus.battleStarted = checkChannels.includes(message.channel.id) || specialChannels.includes(message.channel.id)
                channelStatus.ptsModifier = 1
                if (userCount < 5) channelStatus.ptsModifier = 0.5
                if (debug) console.log(`Battle started in #${message.channel.name}. ${userCount} participants`)
            }
        }
    }

    if (channelStatus.battleStarted) {

        if (!embedFound.title.includes("Round")) {
            if (message.mentions.members.size !== 0) {
                const member = await message.guild.members.fetch(message.mentions.members.first())
                title += `#${message.channel.name} - `
                title += `WINNER\n`

                channelStatus.battleStarted = false

                if (checkChannels.includes(message.channel.id)) {

                    if (channelStatus.revivedUsers.includes(member.id)) {
                        // RULE: WIN STEAL
                        msg += `**\`WIN STEAL:\`** <@${member.id}>: ${2 * channelStatus.ptsModifier} pts - _Revive and win the game_\n`
                    }

                    let winnerKills = channelStatus.killedUsers.filter(e => e.killer === member.id)
                    if (!winnerKills || winnerKills.length === 0) {
                        // RULE: PACIFIST
                        msg += `**\`PACIFIST:\`** <@${member.id}>: ${2 * channelStatus.ptsModifier} pts - _Win without killing_\n`
                    }
                }

                if (["976535610976268368", "981239346256560148"].includes(message.channel.id)) {
                    // RULE: HOURLY / PLAYER
                    msg += `**\`HOURLY/PLAYER:\`** <@${member.id}>: ${2 * channelStatus.ptsModifier} pts - _Win an Hourly / Player Battle_\n`
                }

                if (["976535722192404541", "976535893328404510"].includes(message.channel.id)) {
                    // RULE: DAILY / WEEKLY
                    msg += `**\`DAILY/WEEKLY:\`** <@${member.id}>: ${5 * channelStatus.ptsModifier} pts - _Win a Daily / Weekly Battle_\n`
                }

                channelStatus.revivedUsers = []
                channelStatus.killedUsers = []

                if (checkChannels.includes(message.channel.id)) {
                    if (channelStatus.lastWinner === member.id && channelStatus.ptsModifier === 1) {
                        // RULE: DOUBLE WIN
                        msg += `**\`DOUBLE WIN:\`** <@${member.id}>: ${1 * channelStatus.ptsModifier} pts - _Win 2 games in the same channel in a row_\n`
                    }

                    let pityWinner = channelStatus.pityInfo.filter(e => channelStatus.prevPityInfo.includes(e))
                    for (let index = 0; index < pityWinner.length; index++) {
                        const win = pityWinner[index];
                        // RULE: PITY
                        msg += `**\`PITY:\`** <@${win}>: ${2 * channelStatus.ptsModifier} pts - _Die first 2 games in a row (without reviving)_\n`
                    }
                }

                channelStatus.prevPityInfo = channelStatus.pityInfo
                channelStatus.pityInfo = []

                channelStatus.lastWinner = member.id
            }
        } else
            if (checkChannels.includes(message.channel.id)) {
                let round = embedFound.title.split(' ')[1].split('*')[0].split('_')[0]
                title += `#${message.channel.name} - `
                title += `Round ${round}\n`

                let data = embedFound.description.split('\n')
                for (let index = 0; index < data.length; index++) {
                    let entry = data[index]
                    let user1 = await parseUser(message, entry, 1)
                    let user2 = await parseUser(message, entry, 2)
                    if (entry.includes('~')) {
                        let killedUserData = entry.split('~')[2]
                        let killedUser = await parseUser(message, killedUserData, 1)
                        if (!!killedUser) {
                            if (debug) console.log(`Killed user in #${message.channel.name}. ${killedUser.displayName}`)
                            roundKilledUsers.push(killedUser.id)
                            let killer
                            if (!!user1 && user1.id !== killedUser.id)
                                killer = user1
                            if (!!user2 && user2.id !== killedUser.id)
                                killer = user2

                            if (debug && !!killer) console.log(`Killed by ${killer.displayName}`)

                            if (round === '1') {
                                if (channelStatus.pityInfo.length === 0)
                                    channelStatus.pityInfo.push(killedUser.id)
                            }

                            if (killer) {
                                let killedBefore = channelStatus.killedUsers.filter(e => e.killedUser === killedUser.id && e.killer === killer.id)
                                if (killedBefore.length !== 0) {
                                    // RULE: STAY DOWN
                                    msg += `**\`STAY DOWN:\`** <@${user1.id}>: ${2 * channelStatus.ptsModifier} pts - _Kill the same player twice in 1 game_\n`
                                }

                                let killKiller = channelStatus.killedUsers.filter(e => e.killedUser === killer.id && e.killer === killedUser.id)
                                if (killKiller.length !== 0) {
                                    // RULE: REVENGE
                                    msg += `**\`REVENGE:\`** <@${user1.id}>: ${Math.floor(3 * channelStatus.ptsModifier)} pts - _Revive and kill your killer_\n`
                                }
                                channelStatus.killedUsers.push({
                                    "killedUser": killedUser.id,
                                    "killer": killer.id
                                })
                            }
                        }
                    }
                    if (entry.includes(':re:')) {
                        if (!user1 || user1 === undefined || user1 === null) console.log(entry)
                        channelStatus.revivedUsers.push(user1.id)
                        if (debug) console.log(`Revive: ${user1.displayName}`)

                        if (roundKilledUsers.includes(user1.id)) {
                            // RULE: UNKILLABLE                        
                            msg += `**\`UNKILLABLE:\`** <@${user1.id}>: ${2 * channelStatus.ptsModifier} pts - _Be killed and revive in the same round_\n`
                        }

                        channelStatus.pityInfo = channelStatus.pityInfo.filter(e => e !== user1.id)
                    }
                }
            }
    }

    client.channelData.set(message.channel.id, channelStatus)

    if (!!msg) {
        let parsedEmbed = new Discord.MessageEmbed().setTitle("Parsed Battle: " + title).setDescription(msg).setColor("RED").setURL(message.url).setFooter({ text: `Points modifier: ${channelStatus.ptsModifier}` }).setTimestamp()
        return await message.guild.channels.cache.get("1016635880364060733").send({ embeds: [parsedEmbed] })
    }
}

async function parseUser(message, data, userIndex) {
    let startIndex = (2 * userIndex) + (2 * (userIndex - 1))
    let userName = data.split('*')[startIndex]
    if (userName !== undefined) {
        userName = stripRumbleTitle(userName)
        return await resolveMember(message, userName, false)
    }
}

function stripRumbleTitle(data) {
    let knownTitles = [
        " the Only",
        " the Duck",
        " the Bard",
        " the Guard",
        " the Duke",
        " I",
        " the Innovator",
        " the One",
        " the Emperor",
        " the Bounty Hunter",
        " VI",
        " the Warrior",
        " IX",
        " the Knight",
        " VIII",
        " IV",
        " the First",
        " the Holy",
        " the King",
        " the Duchess",
        " III",
        " X",
        " II",
        " V",
        " the Tech Master",
        " the Nub",
        " VII",
        " the Queen",
        " the Zombie",
        " the Cannibal",
        " the Rumbler",
        " the Slasher",
        " the Alien",
        " the God"
    ]

    for (let index = 0; index < knownTitles.length; index++) {
        const e = knownTitles[index];
        if (data.toLowerCase().endsWith(e.toLowerCase()))
            return data.slice(0, data.length - e.length)
    }

    return data
}


/*
min users: 3
users 3/4 => half points

[X] Pity = Die 2 games in a row round 1 => 2pts
[X] Double Win = Win two games in a row in same channel => 1pt
[X] Win Steal = Revive and win => 2pts
[ ] Intimidation = Get weapon and never use => 1pt (hard to check)
[X] Stay Down = Kill the same player twice => 2pts
[X] Unkillable = Kill and revive in the same round => 2pts
[X] Killless = Win without killing => 2pts
[X] Revenge = Revive and kill your killer => 3pts

[X] Win Hourly/Player => 2pts
[X] Win Daily/Weekly => 5pts
*/