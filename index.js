const mcp = require("minecraft-protocol");
const chalk = require("chalk");
const screenshotDesktop = require("screenshot-desktop");
const sharp = require("sharp");
const coreModule = require("./core.js");

const coreExists = true;

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

  const CHAT_W = 50;
  const CHAT_H = 20;
  const POS = { x: -111, y: -55, z: -55 };
  let screenExists = false;

  async function streamLoop() {
    try {
      if (!client.core?.run) return;

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

      const textJson = JSON.stringify({ text: "", extra: components });

      if (textJson.length < 32767) {
        if (!screenExists) {
          await client.core.run(
            `/summon minecraft:text_display ${POS.x} ${POS.y} ${POS.z} {Tags:["${screenTag}"],billboard:"fixed",text:{text:"loading screen..."},line_width:5000}`
          );
          screenExists = true;
        }

        await client.core.run(
          `/data merge entity ${screenSelector} {text:${textJson},scale:[4f,4f,4f]}`
        );
      }
    } catch (e) {
      console.error("screen stream error", e?.message || e);
    }

    setImmediate(streamLoop);
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

  client.on("login", () => {
    console.log("logged in");
    coreModule(client, coreExists);
  });

  client.on("playerChat", async (packet) => {
    const msg = (
      packet.plainMessage ||
      packet.unsignedContent ||
      ""
    ).toLowerCase();

    if (!allowedUsers.includes(packet.sender)) {
      if (["hello","bye","just go","reshowscreen"].includes(msg))
        client.chat("access denied | error code: 1d10t");
      return;
    }

    if (msg === "hello" || msg === "reshowscreen") {
      client.chat("loading screen...");
      startMcScreenStream(client);

      const transform = JSON.stringify({
        transformation: {
          left_rotation: [0, 0, 0, 1],
          right_rotation: [0, 0, 0, 1],
          translation: [0, 0, 0],
          scale: [4, 4, 4],
        },
      });

      await client.core.run(
        `/data merge entity ${screenSelector} ${transform}`
      );
      return;
    }

    if (msg === "bye") {
      await client.core.run(`/kill ${screenSelector}`);
      client.chat("goodbye");
      client.end();
      return;
    }

    if (msg === "just go") {
      await client.core.run(`/kill ${screenSelector}`);
      client.chat("shutting down");
      client.end();
      process.exit(0);
    }

    if (msg.startsWith("core run ")) {
      const command = msg.slice(9);
      try {
        await client.core.run(command);
      } catch (e) {
        console.error("core run error", e?.message || e);
      }
    }
  });

  client.on("error", (e) => console.error("client error", e?.message || e));
  return client;
}

/* ---------------- entry ---------------- */
if (require.main === module) {
  clientcreate(
    process.env.BOT_NAME || "hello",
    process.env.BOT_HOST || "kaboom.pw",
    { port: 25565 }
  );
}
