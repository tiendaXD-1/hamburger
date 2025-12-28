const mcp = require("minecraft-protocol");
const chalk = require("chalk"); // why you need chalk lol
const screenshotDesktop = require("screenshot-desktop");
const sharp = require("sharp");
const coreModule = require("./core.js");

const coreExists = true; // set false if you want core to auto /fill

const allowedUsers = [
  "f43583f1-c924-3f6c-8497-e52dadee2a3f",
  "be5d2f59-40c5-3e02-83d3-8bf212c4acb1",
  "b3988048-cafa-3021-ac76-d630928cd678",
  "c0e3a835-4d87-3eb3-b0e1-595d5db0ec54",
];

const screenTag = "screen";
const screenSelector = `@e[type=text_display,limit=1,tag=${screenTag}]`;

/* ---------------- screen → minecraft ---------------- */
function startMcScreenStream(client) {
  if (!screenshotDesktop || !sharp) return;
  if (client._screenStreamStarted) return;
  client._screenStreamStarted = true;

  console.log("screen stream started");

  const CHAT_W = 50; // this is the width
  const CHAT_H = 20; // this is the height the idea would be to make this bigger but if u make this number bigger it surpasses the 32.5k command length limit
  const POS = { x: -111, y: -55, z: -55 };
  let screenExists = false; // also core.js is kinda broken if you just edit 1 line really good core.js
  // oh btw i will use my own method to make core, basic that how every bot work
  async function streamLoop() {
    try {
      if (!client.core?.run) return; // i mean how{
      const img = await screenshotDesktop({
        format: "png",
        screen: "\\\\.\\DISPLAY5",
      });
      const { data, info } = await sharp(img)
        .resize(CHAT_W, CHAT_H, { fit: "fill" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const components = [];
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const i = (y * info.width + x) * 3;
          const r = data[i].toString(16).padStart(2, "0");
          const g = data[i + 1].toString(16).padStart(2, "0");
          const b = data[i + 2].toString(16).padStart(2, "0");
          components.push({ text: "⬛", color: `#${r}${g}${b}` });
        }
        components.push({ text: "\n" });
      }

      const json = JSON.stringify({ text: "", extra: components });
      if (json.length < 32767) {
        if (!screenExists) {
          await client.core.run(
            `summon minecraft:text_display ${POS.x} ${POS.y} ${POS.z} {Tags:["${screenTag}"],billboard:"fixed",text:{"text":"Loading my screen :/"},line_width:5000}`,
          );
          screenExists = true;
        }

        await client.core.run(
          `/data merge entity ${screenSelector} {text:${json},scale:[4f,4f,4f]}`,
        );
      }
    } catch (e) {
      console.error("screen stream error", e.message);
    }

    setImmediate(streamLoop); // run next frame ASAP
  }

  streamLoop();
}

/* ---------------- minecraft client ---------------- */
function clientcreate(name, server, opts = {}) {
  const client = mcp.createClient({
    host: server,
    port: opts.port || 25565,
    username: name,
    version: opts.version || "1.19.4",
    validateChannelProtocol: true,
  });

  client.on("connect", () => {
    console.log(chalk.green("connected"));
  });
  client.on("login", () => {
    console.log(chalk.green("logged in, init core"));
    coreModule(client, coreExists);

    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    console.log(chalk.blue('type commands or "showscreen"'));

    process.stdin.on("data", async (line) => {
      const cmd = line.trim();
      if (!cmd) return;

      if (cmd === "showscreen") return startMcScreenStream(client);
      if (cmd === "exit") return process.exit(0);

      try {
        await client.core.run(cmd);
        console.log(chalk.green("ran:"), cmd);
      } catch (e) {
        console.error("cmd error:", e.message);
      }
    });
  });

  client.on("playerChat", async (packet) => {
    const msg = (
      packet.plainMessage ||
      packet.unsignedContent ||
      ""
    ).toLowerCase();

    // log every packet
    console.log("[PACKET LOG]", packet);

    if (msg === "hello") {
      if (allowedUsers.includes(packet.sender)) {
        client.chat("Loading screen..");
        startMcScreenStream(client);
        const summonData = {
          transformation: {
            left_rotation: [0, 0, 0, 1],
            right_rotation: [0, 0, 0, 1],
            translation: [0, 0, 0],
            scale: [4, 4, 4], //
          },
        };
        await client.core.run(
          `/data merge entity ${screenSelector} ${JSON.stringify(summonData)}`,
        );
      } else client.chat("Access denied. | Error code : 1d10t");
    } else if (msg === "bye") {
      if (allowedUsers.includes(packet.sender)) {
        client.chat("Removing screen..");
        await client.core.run(`kill ${screenSelector}`);
        client.chat("Goodbye.");
        client.end();
      } else client.chat("Access denied. | Error code : 1d10t");
    } else if (msg === "just go") {
      if (allowedUsers.includes(packet.sender)) {
        client.chat("Goodbye.");
        await client.core.run(`kill ${screenSelector}`);
        client.chat("Screen removed.");
        client.chat("Core unloaded successfully.");
        client.chat("Shutting down..");
        client.end();
        process.exit(0);
      } else client.chat("Access denied. | Error code : 1d10t");
    } else if (msg.startsWith("core run ")) {
      const command = msg.slice(9);
      if (allowedUsers.includes(packet.sender)) {
        try {
          await client.core.run(command);
          console.log(chalk.green("ran command:"), command);
        } catch (e) {
          console.error("core run error:", e.message);
        }
      } else {
        client.chat("Access denied. | Error code : 1d10t");
      }
    }
  });

  client.on("error", (err) => console.error("client error", err.message));
  client.on("end", () => console.log(chalk.yellow("connection ended")));

  return client;
}

/* ---------------- reconnect wrapper ---------------- */
function runBot(name, host, opts = {}) {
  let client;
  function start() {
    if (client) client.end();
    client = clientcreate(name, host, opts);
    client.once("end", () => setTimeout(start, 5000));
  }
  start();
}

/* ---------------- entry ---------------- */
if (require.main === module) {
  runBot(process.env.BOT_NAME || "hello", process.env.BOT_HOST || "kaboom.pw", {
    port: process.env.BOT_PORT ? Number(process.env.BOT_PORT) : 25565,
  });
}
