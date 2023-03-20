const { app, BrowserWindow } = require("electron");
const path = require("path");
const Docker = require("dockerode");

const CONTAINER_NAME = process.env.CONTAINER_NAME ?? "smarthome";

const HOSTNAME = process.env.APP_HOSTNAME ?? "localhost";
const PORT = process.env.APP_PORT ?? 2022;
const PROTOCOL = process.env.APP_PROTOCOL ?? "http";

const WIDTH = process.env.BROWSER_WIDTH ?? 800;
const HEIGHT = process.env.BROWSER_HEIGHT ?? 480;

const SPLASH_SHOW_TIME = 7000;
const RECONNECT_TIMEOUT = 3000;

const docker = Docker({
  socketPath: process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock",
});

function restartOnContainerStop() {
  docker.getEvents(
    {
      filters: {
        type: ["container"],
        container: [CONTAINER_NAME],
        event: ["destroy", "die", "kill", "pause", "restart", "stop"],
      },
    },
    function (err, stream) {
      if (err) {
        reject(err);
      } else {
        stream.on("data", (data) => {
          stream.destroy();
          app.relaunch();
          app.exit();
        });
      }
    }
  );
}

function startContainerStartListener() {
  return new Promise((resolve, reject) => {
    docker.getEvents(
      { filters: { type: ["container"], container: [CONTAINER_NAME], event: ["start"] } },
      function (err, stream) {
        if (err) {
          reject(err);
        } else {
          stream.on("data", (data) => {
            stream.destroy();
            resolve();
          });
        }
      }
    );
  });
}

function waitForContainer() {
  return new Promise((resolve, reject) => {
    docker.getContainer(CONTAINER_NAME).inspect(function (err, data) {
      if (err) {
        reject(err);
      } else {
        if (data.State.Running) {
          resolve();
        } else {
          startContainerStartListener().then(resolve).catch(reject);
        }
      }
    });
  });
}

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    movable: false,
  });
  return new Promise((resolve, reject) => {
    splash.once("ready-to-show", () => {
      splash.show();
      resolve(splash);
    });
    splash.loadFile(path.join(__dirname, "splash.html"));
  });
}

async function main() {
  console.log("Creating splash window...");
  const splashWindow = await createSplashWindow();
  console.log("Splash window shown");

  const start = new Date();

  console.log("Waiting for container to start...");
  await waitForContainer();
  console.log("Container started");

  const elapsed = new Date() - start;

  if (elapsed < SPLASH_SHOW_TIME) {
    const wait = SPLASH_SHOW_TIME - elapsed;
    console.log(`Creating main window in ${wait} milliseconds...`);
    await sleep(wait);
  }

  const mainWindow = createMainWindow();
  mainWindow.on("show", () => {
    splashWindow.destroy();
  });

  while (true) {
    try {
      await loadMainWindow(mainWindow);
      mainWindow.show();
      break;
    } catch (err) {
      console.log(`Failed to load main window, retrying in ${RECONNECT_TIMEOUT} milliseconds...`);
      await sleep(RECONNECT_TIMEOUT);
    }
  }

  console.log("App started successfully");
}

function loadMainWindow(window) {
  return new Promise((resolve, reject) => {
    window.loadURL(`${PROTOCOL}://${HOSTNAME}:${PORT}`).then(resolve).catch(reject);
  });
}

function createMainWindow() {
  console.log("Creating main window...");
  const window = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    movable: false,
    transparent: true,
  });
  return window;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.whenReady().then(() => {
  restartOnContainerStop();
  main();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
