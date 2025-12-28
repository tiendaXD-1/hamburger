const chalk = require("chalk");
const botname = "ᴛʙᴏᴛ ᴄᴏʀᴇ™";

core = async function (client) {
  client.core = {};
  const size = {
    width: 5,
    height: 5,
    length: 5,
  };
  const pos = {
    x: 9,
    y: -14,
    z: 59,
  };

  const commands = [];
  let coreIndex = 0;

  client.core.refill = async function () {
    client.chat(
      `/fill ${size.length - 1 + pos.x} ${size.height - 1 + pos.y} ${size.width - 1 + pos.z} ${pos.x} ${pos.y} ${pos.z} minecraft:repeating_command_block{CustomName:'{"text":"${botname}","color":"blue"}'} replace`,
    );
  };

  client.core.execute = async function () {
    while (commands.length > 0) {
      const pos = indexToPoint();
      const command = commands.shift();
      client.write("update_command_block", {
        command: command,
        location: {
          x: pos.x + pos.x,
          y: pos.y + pos.y,
          z: pos.z + pos.z,
        },
        mode: 1,
        flags: 4,
      });
    }
  };

  client.core.run = async function (command) {
    /*if(command.length >= 32500){
            console.warn(chalk.yellowBright('[WARNING] Command is above 32500 characters and it will not execute.'));
            return;
        }*/
    commands.push(command.slice(0, 32500));
    await client.core.execute();
  };

  function indexToPoint() {
    const { width, height, length } = size;

    const totalBlocks = width * height * length;

    if (coreIndex < 0 || coreIndex >= totalBlocks) {
      coreIndex = 0;
    }

    const z = Math.floor(coreIndex / (width * height));
    const y = Math.floor((coreIndex % (width * height)) / width);
    const x = coreIndex % width;

    coreIndex++;

    return { x, y, z };
  }

  client.core.refill();
};

module.exports = core;
