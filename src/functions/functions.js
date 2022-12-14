const fs = require("fs")

const getFiles = (path, ending) => {
    return fs.readdirSync(path).filter(f => f.endsWith(ending))
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const fetch = (url) => import('node-fetch').then(({ default: fetch }) => fetch(url));

function setEmbedFooter(embed, client) {
    let devStr = ""
    if (isDevMode()) {
        devStr = " (DEV)"
    }
    embed.setTimestamp()
        .setFooter({ text: `${client.user.username}${devStr}`, iconURL: client.user.displayAvatarURL() })

    return embed
}

/**
 * Automatic Alignment
 * @param {Array} align left and right fields to be aligned in size 2 arrays
 * @param {String} char optional character to use for alignment
 * @param {number} lock spaces to add inbetween
 * @returns {String} properly aligned message
 */
function autoAlign(align, char, lock) {
    let str = "";
    char = !char ? " " : char;

    let max = lock ? lock : align[0][0].length;
    for (arr of align) max = max < arr[0].length ? arr[0].length : max;
    max += 2;

    for (arr of align) str += `${arr[0]}${char.repeat(max - arr[0].length)}${arr[1]}\n`;
    return str;
}

async function getGuildSettings(guildID) {
    let guildSettings
    let newSettings
    try {
        newSettings = await new Guild({
            _id: mongoose.Types.ObjectId(),
            guildID: guildID
        })
        guildSettings = await Guild.findOne({ guildID: guildID })
    } catch (error) {
        addLog(error, error.stack)
        return newSettings
    }
    if (!guildSettings) {
        guildSettings = newSettings
        await guildSettings.save().catch(error => {
            addLog(error, error.stack)
        })
    }

    return guildSettings    
}

async function getUser(guildID, memberID) {
    let newUser
    let userObj
    try {
        newUser = await new User({
            _id: mongoose.Types.ObjectId(),
            guildID: guildID,
            userID: memberID
        })
        userObj = await User.findOne({ 
            guildID: guildID, 
            userID: memberID 
        })
    } catch (error) {
        addLog(error, error.stack)
        return newUser
    }
    if (!userObj) {
        userObj = newUser
        await userObj.save().catch(error => {
            addLog(error, error.stack)
        })
    }

    return userObj
}

/**
 * Returns a rounded time value as a string 
 * @param {number} time in ms
 * @returns {string} rounded time value as string
 */
function formatTime(time) {
    //time is in ms, this function changes time to a rounded time
    //returns string time
    const sec = 1000;
    const min = sec * 60;
    const hour = min * 60;
    const day = hour * 24;
    const year = day * 365; //screw the leap year days
    var retval = "";
    if (time / year > 1) return t("year", year);
    else if (time / day > 1) return t("day", day);
    else if (time / hour > 1) return t("hour", hour);
    else if (time / min > 1) return t("minute", min);
    else if (time / sec > 1) return t("second", sec);
    else return "Ended";

    function t(unitName, unitTime) {
        return Math.round(time / unitTime) + ` ${Math.round(time / unitTime) == 1 ? unitName : unitName + "s"}`;
    }
}

function isDevMode() {
    return fs.existsSync(".dev")
}

async function getPrefix(guildID) {

    return "="
    
    if (isDevMode()) {
        return fs.readFileSync('.dev').toString()
    }

    let guildSettings = await getGuildSettings(guildID)
    return guildSettings.prefix
}

const mongoose = require('mongoose')
const Guild = require('../_database/models/guildSchema')
const User = require('../_database/models/userSchema')
const { addLog } = require('./logs')

module.exports = {
    name: "functions",
    getFiles,
    delay,
    fetch,
    autoAlign,
    formatTime,
    getPrefix,
    setEmbedFooter,
    isDevMode,
    getGuildSettings,
    getUser
}