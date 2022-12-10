const { app, BrowserWindow } = require("electron");
const path = require("path");

const WIDTH = process.env.BROWSER_WIDTH || 800;
const HEIGHT = process.env.BROWSER_HEIGHT || 480;

function createWindow() {
    let launchTime;
    const mainWindow = new BrowserWindow({
        width: WIDTH,
        height: HEIGHT,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        show: false,
        movable: false,
        transparent: true,
    });
    mainWindow.on("show", () => {
        splash.destroy();
        mainWindow.webContents.once("did-fail-load", () => {
            app.relaunch();
            app.exit();
        });
    });

    (function connect() {
        mainWindow
            .loadURL(
                `${process.env.APP_PROTOCOL || "http"}://${process.env.APP_IP || "localhost"}:${
                    process.env.APP_PORT || 2022
                }`
            )
            .then(() => {
                const now = new Date();
                const diff = now - launchTime;
                if (diff >= 7000) mainWindow.show();
                else setTimeout(() => mainWindow.show(), 7000 - diff);
            })
            .catch((err) => {
                setTimeout(connect, process.env.RECONNECT_TIMEOUT || 5000);
            });
    })();

    const splash = new BrowserWindow({
        width: WIDTH,
        height: HEIGHT,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        show: false,
        movable: false,
    });

    splash.once("ready-to-show", () => {
        splash.show();
        launchTime = new Date();
    });

    splash.loadFile(path.join(__dirname, "splash.html"));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow();

    app.on("activate", function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
