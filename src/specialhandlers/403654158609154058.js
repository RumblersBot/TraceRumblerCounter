//MagnoBE
const RumbleNotification = require('../_database/models/rumbleNotificationSchema')

module.exports = {
    run: async ({ client, message }) => {
        // if (message.mentions.members.size == 0) return
        // const member = await message.guild.members.fetch(message.mentions.members.first())

        // let notifications = await RumbleNotification.find({
        //     guildID: message.guild.id,
        //     channelID: message.channel.id
        // })

        // await notifications.forEach(async notif => {
        //     if (member.roles.cache.has(notif.roleID)) {
        //         const role = await message.guild.roles.fetch(notif.roleID)
        //         await message.channel.send(`\`${member.displayName}\` is a member of \`${role.name}\`.`)
        //     }
        // })

        if (message.content === "%%SHOWDATA") {
            if (!client.channelData) client.channelData = new Discord.Collection()
            let channelStatus = client.channelData.get(message.channel.id)

            message.reply(require("util").inspect(channelStatus, { depth: 2 }))
        }
    }
}