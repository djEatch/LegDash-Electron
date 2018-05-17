const {app, BrowserWindow, Menu, ipcMain} = require('electron')
const path = require('path')
const url = require('url')

const fs = require("fs");
const http = require("http");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let contents;

let serverList = [];
let csvUrl = './servers.txt';  // URL to web API

//app.on('ready', () => {readCsvData(), createWindow()})
app.on('ready', function(){



    // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  win.loadURL(url.format({
    //pathname: path.join(__dirname, 'public','index.html'),
    pathname: path.join(__dirname, 'electronIndex.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  const winMenu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(winMenu);
  readCsvData()
  contents = win.webContents;

  //setup();
});



function readCsvData() {
  // Asynchronous read
  fs.readFile(csvUrl, function (err, data) {
    if (err) {
      //return console.error(err);
      handleError(err)
    }
    extractData(data.toString());
  });
}

function extractData(data) {

  let allTextLines = data.split(/\r\n|\n/);
  let headers = allTextLines[0].split(',');
  let lines = [];

  for ( let i = 1; i < allTextLines.length; i++) {
      // split content based on comma
      let data = allTextLines[i].split(',');
      if (data.length == headers.length) {
          let myServer = new Server(data[0].replace(/['"]+/g, ''),data[1].replace(/['"]+/g, ''),data[2].replace(/['"]+/g, ''),data[3].replace(/['"]+/g, ''));
          serverList.push(myServer);
      }
  }
  console.log(serverList);

  //requestServerDetails();
}


function requestServerDetails(){
  for(let server of serverList){
      if(!server.leg){
          server.leg="querying...";
          getServerDetails(server);
      }
  }
}

function getServerDetails(server){
  if(!server.name){
      server.name = server.target.attributes['data-server-name'].value;
      server.endpoint = server.target.attributes['data-server-endpoint'].value; 
      //server.port = server.target.attributes['data-server-port'].value;
  }
  //let url = "http://" + server.ip + ":" + server.port + '/legquery';
  getRequest(updateServerResults, server.endpoint, server.name);
}

function updateServerResults(data, serverName){
    
  for(let server of serverList){
      if(serverName == server.name) {
          try{
              server.leg = JSON.parse(data).legname;
              if(!server.leg) {
                  server.leg = data;
              }
          break;
          } catch (e) {
              server.leg = data;
          }
      }
  }
  drawTable();
}

function getRequest(callback, url, id){
  var xhr = new http.XMLHttpRequest();
  // xhr.onerror = function(e){
  //   console.log(e);
  //   callback("Unknown Error Occured. Server response not received.",id);
  // };
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");

    xhr.send();
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4 && xhr.status == 200) {
        callback(xhr.responseText,id);
      }
      if(xhr.readyState == 4 && xhr.status != 200) {
        callback("connection error, status:" + xhr.status,id);
      }
    }  
}

function handleError (error) {
  // In a real world app, we might use a remote logging infrastructure
  // We'd also dig deeper into the error to get a better message
  let errMsg = (error.message) ? error.message :
    error.status ? `${error.status} - ${error.statusText}` : 'Server error';
  console.error("ERR: " + errMsg); // log to console instead
  return errMsg;
}

function setup(){
  console.log(serverList);
  // let button = document.getElementById("refreshButton");
  // button.addEventListener("click", refresh);
  // console.log(serverList);
  // requestServerDetails();
  // console.log(serverList);
  // drawTable();
}


class Server {

  constructor(name, hostname, port, endpoint) {
    this.name = name;
    this.hostname = hostname;
    this.port = port;
    this.endpoint = endpoint;
    this.response = null;
  }

  addResponse(response){
    this.response = response;
  }

}
  
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

//app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})
  

const template = [
  {
    label: 'Edit',
    submenu: [
//      {        role: 'undo'      },
//      {        role: 'redo'      },
//      {        type: 'separator'      },
//      {        role: 'cut'      },
      {        role: 'copy'      },
//      {        role: 'paste'      },
//      {        role: 'pasteandmatchstyle'      },
//      {        role: 'delete'      },
      {        role: 'selectall'      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.reload()
        }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.webContents.toggleDevTools()
        }
      },
      {        type: 'separator'      },
      {        role: 'resetzoom'      },
      {        role: 'zoomin'      },
      {        role: 'zoomout'      },
      {        type: 'separator'      },
      {        role: 'togglefullscreen'      }
    ]
  },
  {
    role: 'window',
    submenu: [
      {        role: 'minimize'      },
      {        role: 'close'      }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click () { require('electron').shell.openExternal('http://electron.atom.io') }
      }
    ]
  }
]

if (process.platform === 'darwin') {
  const name = app.getName()
  template.unshift({
    label: name,
    submenu: [
      {        role: 'about'      },
      {        type: 'separator'      },
      {        role: 'services', submenu: []},
      {        type: 'separator'      },
      {        role: 'hide'      },
      {        role: 'hideothers'      },
      {        role: 'unhide'      },
      {        type: 'separator'      },
      {        role: 'quit'      }
    ]
  })
  // Edit menu.
  template[1].submenu.push(
    {      type: 'separator'    },
    {      label: 'Speech',
      submenu: [
        {
          role: 'startspeaking'
        },
        {
          role: 'stopspeaking'
        }
      ]
    }
  )
  // Window menu.
  template[3].submenu = [
    {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    },
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    },
    {
      label: 'Zoom',
      role: 'zoom'
    },
    {
      type: 'separator'
    },
    {
      label: 'Bring All to Front',
      role: 'front'
    }
  ]
}

