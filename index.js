const mcp = require('minecraft-protocol');
const chalk = require('chalk');
const screenshotDesktop = require('screenshot-desktop');
const sharp = require('sharp');
const coreModule = require('./core.js');

const coreExists = true; // set false if you want core to auto /fill

/* ---------------- screen → minecraft ---------------- */

function startMcScreenStream(client) {
    if (!screenshotDesktop || !sharp) return;
    if (client._screenStreamStarted) return;
    client._screenStreamStarted = true;

    console.log(chalk.blue('screen stream started'));

    const CHAT_W = 50; // width in "pixels"
    const CHAT_H = 20; // height in "pixels"
    const INTERVAL = 50; // ms between frames (~20 fps)
    const POS = { x: -172, y: -59, z: 144 };
    let screenExists = false;

    setInterval(async () => {
        if (!client.core?.run) return;

        try {
            const img = await screenshotDesktop({ format: 'png' });
            const { data, info } = await sharp(img)
                .resize(CHAT_W, CHAT_H, { fit: 'fill' })
                .removeAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            const components = [];
            for (let i = 0; i < data.length; i += 3) {
                const r = data[i].toString(16).padStart(2, '0');
                const g = data[i + 1].toString(16).padStart(2, '0');
                const b = data[i + 2].toString(16).padStart(2, '0');

                components.push({
                    text: '█', // full block, tightly packed
                    color: `#${r}${g}${b}`
                });
            }

            const json = JSON.stringify({ text: '', extra: components });
            if (json.length >= 32000) return; // too big

            if (!screenExists) {
                await client.core.run(
                    `summon minecraft:text_display ${POS.x} ${POS.y} ${POS.z} {Tags:["screen"],billboard:"fixed",scale:0.05,text:{"text":"Loading..."},line_width:5000}`
                );
                screenExists = true;
            }

            await client.core.run(
                `/data merge entity @e[tag=screen,limit=1] {text:${json},scale:0.05}`
            );

        } catch (e) {
            console.error(chalk.red('screen stream error:'), e.message);
        }
    }, INTERVAL);
}

/* ---------------- minecraft client ---------------- */

function clientcreate(name, server, opts = {}) {
    const client = mcp.createClient({
        host: server,
        port: opts.port || 25565,
        username: name,
        version: opts.version || '1.19.4',
        validateChannelProtocol: true
    });

    client.on('connect', () => console.log(chalk.green('connected')));
    client.on('login', () => {
        console.log(chalk.green('logged in, init core'));
        coreModule(client, coreExists);

        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        console.log(chalk.blue('type commands or "showscreen"'));

        process.stdin.on('data', async (line) => {
            const cmd = line.trim();
            if (!cmd) return;

            if (cmd === 'showscreen') {
                startMcScreenStream(client);
                return;
            }

            if (cmd === 'exit') process.exit(0);

            try {
                await client.core.execute(cmd);
                console.log(chalk.green('ran:'), cmd);
            } catch (e) {
                console.error(chalk.red('cmd error:'), e.message);
            }
        });
    });

    client.on('playerChat', (packet) => {
        const msg = packet.plainMessage || packet.unsignedContent || '';
        if (typeof msg !== 'string') return;

        if (msg.toLowerCase() === 'hello') startMcScreenStream(client);
        else if (msg.toLowerCase() === 'bye') client.end();
        else if (msg.toLowerCase() === 'just go') process.exit(0);
        else if (msg.toLowerCase() === 'refillcore') client.chat(`/fill 11 -45 -9 7 -49 -13 minecraft:repeating_command_block{CustomName:'{"text":"ᴛʙᴏᴛ ᴄᴏʀᴇ™","color":"blue"}'} replace`)
    });

    client.on('error', err => console.error(chalk.red('client error'), err.message));
    client.on('end', () => console.log(chalk.yellow('connection ended')));

    return client;
}

/* ---------------- reconnect wrapper ---------------- */

function runBot(name, host, opts = {}) {
    let client;

    function start() {
        if (client) client.end();
        client = clientcreate(name, host, opts);

        client.once('end', () => setTimeout(start, 5000));
    }

    start();
}

/* ---------------- entry ---------------- */

if (require.main === module) {
    runBot(
        process.env.BOT_NAME || 'hello',
        process.env.BOT_HOST || 'chipmunk.land',
        { port: process.env.BOT_PORT ? Number(process.env.BOT_PORT) : 25565 }
    );
}
