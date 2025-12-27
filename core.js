const chalk = require('chalk');
const botname = 'ᴛʙᴏᴛ ᴄᴏʀᴇ™';
let coreExists = true; // assume core exists by default
module.exports = function(client, coreExists = false) {
    client.core = {};

    const size = { width: 5, height: 5, length: 5 };
    const pos = { x: 7, y: -49, z: -13 };
    const commands = [];
    let coreIndex = 0;

    // refill only if core does not exist
    client.core.refill = function() {
        if (coreExists) return; // skip refill if already exists
        client.write('chat', { message: `/fill 11 -45 -9 7 -49 -13 minecraft:repeating_command_block{CustomName:'{"text":"ᴛʙᴏᴛ ᴄᴏʀᴇ™","color":"blue"}'} replace` });
        console.log(chalk.blue('refill command sent'));
    }

    client.core.execute = async function() {
        while(commands.length > 0) {
            const posBlock = indexToPoint();
            const command = commands.shift();
            client.write('update_command_block', {
                command,
                location: { x: posBlock.x + posBlock.x, y: posBlock.y + posBlock.y, z: posBlock.z + posBlock.z },
                mode: 1,
                flags: 4
            });
        }
    }

    client.core.run = async function(command) {
        if(command.length >= 32500) {
            console.warn(chalk.yellowBright('[WARNING] Command too long.'));
            return;
        }
        commands.push(command);
        await client.core.execute();
    }

    client.core.runQueued = async function() {
        if(client.core.queueCommand && client.core.queueCommand.length) {
            while(client.core.queueCommand.length) {
                const cmd = client.core.queueCommand.shift();
                await client.core.run(cmd);
            }
        }
    }

    function indexToPoint() {
        const totalBlocks = size.width * size.height * size.length;
        if(coreIndex < 0 || coreIndex >= totalBlocks) coreIndex = 0;
        const z = Math.floor(coreIndex / (size.width * size.height));
        const y = Math.floor((coreIndex % (size.width * size.height)) / size.width);
        const x = coreIndex % size.width;
        coreIndex++;
        return { x, y, z };
    }

    // only send refill if core doesn't exist
    if(!coreExists) client.core.refill();

    console.log(chalk.green('core initialized safely'));
}