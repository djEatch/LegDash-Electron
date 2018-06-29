const electron = require("electron");
const { ipcRenderer } = electron;
const bootstrap = require("bootstrap"); //required even though not called!!
var $ = require("jquery");

let serverList = [];
let envTypeList;
let masterLBList = [];
let subLBList = [];
let currentMLB;
let currentSubEnv;
let lbServerList = [];
let requestCount = 0;
let replyCount = 0;

let sortOptions = { currentField: null, currentDir: -1 };
const accordionContainer = document.querySelector("#accordionContainer");
const modalDiv = document.querySelector("#modalDiv");

// const fudgeButton = document.querySelector("#fudgeButton");
// fudgeButton.addEventListener("click", fudgeFunction);

// function fudgeFunction() {
//   console.log("Clicked");
//   //whatDoesLBThinkOfThisServer(serverList[6]);
//   //makeModal();
//   //$('#collapseThree').collapse('hide')
//   //ipcRenderer.send('popup', {hostname:"blah", endpoint:"hghg", port:"121222", response:"hfksjdhf kdjhaksjh akahsdkjashdak dsf"});
//   ipcRenderer.send('showServerWindow',serverList);
// }

function makeModal(server) {
  modalDiv.innerHTML = "";
  let mfade = document.createElement("div");
  mfade.classList = "modal fade";
  mfade.id = "myModal";
  mfade.setAttribute("tabindex", "-1");
  mfade.setAttribute("role", "dialog");
  mfade.setAttribute("aria-labelledby", "myModalTitle");
  mfade.setAttribute("aria-hidden", "true");
  let mdialog = document.createElement("div");
  mdialog.classList = "modal-dialog modal-lg";
  mdialog.setAttribute("role", "document");
  let mcontent = document.createElement("div");
  mcontent.classList = "modal-content";
  let mheader = document.createElement("div");
  mheader.classList = "modal-header";
  let mttitle = document.createElement("H5");
  mttitle.class = "modal-title";
  let mttext = document.createTextNode(server.hostname);
  let btn = document.createElement("button");
  btn.type = "button";
  btn.classList = "close";
  btn.setAttribute("data-dismiss", "modal");
  btn.setAttribute("aria-label", "Close");
  let btnspan = document.createElement("span");
  btnspan.setAttribute("aria-hidden", "true");
  let mbody = document.createElement("div");
  mbody.classList = "modal-body";
  let mfoot = document.createElement("div");
  mfoot.classList = "modal-footer";
  let mfootbtn = document.createElement("button");
  mfootbtn.type = "button";
  mfootbtn.classList = "btn btn-primary";
  mfootbtn.setAttribute("data-dismiss", "modal");
  mfootbtn.textContent = "Close";

  btnspan.innerHTML = "&times;";
  btn.appendChild(btnspan);
  mttitle.appendChild(mttext);
  mheader.appendChild(mttitle);
  mheader.appendChild(btn);

  mfoot.appendChild(mfootbtn);

  mcontent.appendChild(mheader);
  mcontent.appendChild(mbody);
  mcontent.appendChild(mfoot);

  mdialog.appendChild(mcontent);
  mfade.appendChild(mdialog);

  modalDiv.appendChild(mfade);

  let h = document.createElement("H5"); // Create a <h1> element
  let t = document.createTextNode(
    "http://" + server.hostname + ":" + server.port + server.endpoint
  ); // Create a text node
  h.appendChild(t); // Append the text to <h1>
  mbody.appendChild(h);

  h = document.createElement("P"); // Create a <h1> element
  t = document.createTextNode(server.response); // Create a text node
  h.appendChild(t); // Append the text to <h1>
  mbody.appendChild(h);

  let setMaintBtn = document.createElement("button");
  let unsetMaintBtn = document.createElement("button");
  setMaintBtn.id = "setMaintBtn";
  unsetMaintBtn.id = "unsetMaintBtn";
  setMaintBtn.textContent = "Set Maintenance Mode";
  unsetMaintBtn.textContent = "Unset Maintenance Mode";
  setMaintBtn.classList = "btn btn-secondary";
  unsetMaintBtn.classList = "btn btn-secondary";

  //setMaintBtn.setAttribute("data-toggle", "popover");
  //unsetMaintBtn.setAttribute("data-toggle", "popover");

  setMaintBtn.addEventListener("click", () => {
    maintMode("SET", server);
  });
  unsetMaintBtn.addEventListener("click", () => {
    maintMode("UNSET", server);
  });

  mfoot.insertBefore(setMaintBtn, mfootbtn);
  mfoot.insertBefore(unsetMaintBtn, mfootbtn);

  $("#myModal").modal("show");
}

function refresh(e) {
  drawMultiTables();
  requestAllServerDetails();
  //ipcRenderer.send('refreshList'); <---- this is for old list in text file....
}

function resetSort() {
  sortOptions = { currentField: null, currentDir: -1 };
  //sortData("name", "hostname");
}

function sortData(field, field2) {
  if (sortOptions.currentField == field) {
    sortOptions.currentDir *= -1;
  } else {
    sortOptions.currentField = field;
    sortOptions.currentDir = 1;
  }

  serverList.sort(function(a, b) {
    var x = a[field] == null || !a[field] ? "zzz" : a[field].toLowerCase();
    var y = b[field] == null || !b[field] ? "zzz" : b[field].toLowerCase();

    if (x < y) {
      return -1 * sortOptions.currentDir;
    }
    if (x > y) {
      return 1 * sortOptions.currentDir;
    }

    if (x == y && field2) {
      var x2 =
        a[field2] == null || !a[field2] ? "zzz" : a[field2].toLowerCase();
      var y2 =
        b[field2] == null || !b[field2] ? "zzz" : b[field2].toLowerCase();
      if (x2 < y2) {
        return -1 * sortOptions.currentDir;
      }
      if (x2 > y2) {
        return 1 * sortOptions.currentDir;
      }
    }
    return 0;
  });
  drawMultiTables();
}

function drawMultiTables() {
  let tempLBList = [];

  tempLBList = subLBList;
  tempLBList.sort(function(a, b) {
    x = a.name;
    y = b.name;
    if (x < y) {
      return -1;
    } else if (x > y) {
      return 1;
    } else return 0;
  });

  accordionContainer.innerHTML = "";
  const refreshDiv = document.querySelector("#refreshDiv");
  refreshDiv.innerHTML = "";

  if (serverList.length < 1) {
    return;
  }

  refreshButton = document.createElement("button");
  refreshButton.id = "refreshButton";
  refreshButton.classList = "btn btn-primary btn-block";
  refreshButton.textContent = "refresh all";
  //refreshButton.addEventListener("click", refresh);
  refreshButton.addEventListener("click", () => {
    getServerListFromSubLBList(currentSubEnv);
  });
  refreshDiv.appendChild(refreshButton);

  for (currentLB of tempLBList) {
    let accordiondiv = document.createElement("div");
    accordiondiv.id = "myAccordion";

    accordionContainer.appendChild(accordiondiv);

    let shortName =
      currentLB.splitEnvName + currentLB.splitServerType + currentLB.splitLeg;
    //console.log(currentLB);

    let card = document.createElement("div");
    card.classList = "card";
    let cardheader = document.createElement("div");
    cardheader.classList = "card-header";
    cardheader.id = "heading" + shortName;
    let chh = document.createElement("H5");
    chh.classList = "mb-0";
    let hbtn = document.createElement("button");
    hbtn.classList = "btn btn-link";
    hbtn.setAttribute("data-toggle", "collapse");
    hbtn.setAttribute("data-target", "#collapse" + shortName);
    hbtn.setAttribute("aria-expanded", "true");
    hbtn.setAttribute("aria-controls", "collapse" + shortName);
    hbtn.textContent = currentLB.name + " - " + currentLB.state;

    chh.appendChild(hbtn);
    cardheader.appendChild(chh);

    let cd = document.createElement("div");
    cd.id = "collapse" + shortName;
    cd.classList = "collapse show";
    cd.setAttribute("aria-labelledby", "heading" + shortName);
    cd.setAttribute("data-parent", "#" + accordiondiv.id);

    let cb = document.createElement("div");
    cb.classList = "card-body";
    let cbd = document.createElement("div");
    cbd.classList = "table-responsive";

    cb.appendChild(cbd);
    cd.appendChild(cb);

    card.appendChild(cardheader);
    card.appendChild(cd);
    accordiondiv.appendChild(card);

    let table = document.createElement("table");
    table.classList = "table table-light table-hover";

    // Create an empty <thead> element and add it to the table:
    var header = table.createTHead();
    header.classList = "thead-dark";

    // Create an empty <tr> element and add it to the first position of <thead>:
    var row = header.insertRow(0);

    // Insert a new cell (<td>) at the first position of the "new" <tr> element:
    let cell1 = row.insertCell();
    let cell2 = row.insertCell();
    let cell3 = row.insertCell();
    let cell4 = row.insertCell();
    let cell5 = row.insertCell();
    let cell6 = row.insertCell();
    let cell7 = row.insertCell();
    let cell8 = row.insertCell();
    let cell9 = row.insertCell();

    // Add some bold text in the new cell:
    cell1.innerHTML = "<b>Name</b>";
    cell2.innerHTML = "<b>Hostname</b>";
    cell2.addEventListener("click", function() {
      sortData("name", "hostname");
    });
    cell3.innerHTML = "<b>ASM Leg</b>";
    cell4.innerHTML = "<b>ASM Status</b>";
    cell5.innerHTML = "<b>ASM Availability</b>";
    cell6.innerHTML = "<b>LB State</b>";
    cell7.innerHTML = "<b>LB Leg</b>";
    cell8.innerHTML = "<b>Response Time</b>";
    cell9.innerHTML = "<b>Retry</b>";

    for (server of serverList) {
      if (server.LBName == currentLB.name) {
        let row = table.insertRow();
        let cell1 = row.insertCell();
        let cell2 = row.insertCell();
        let cell3 = row.insertCell();
        let cell4 = row.insertCell();
        let cell5 = row.insertCell();
        let cell6 = row.insertCell();
        let cell7 = row.insertCell();
        let cell8 = row.insertCell();
        let cellbtn = row.insertCell();
        cell1.innerHTML = server.name;
        cell2.innerHTML = server.hostname + ":" + server.port;
        cell2.setAttribute("data-server-name", server.name);
        cell2.setAttribute("data-server-hostname", server.hostname);
        cell2.setAttribute("data-server-endpoint", server.endpoint);
        cell2.setAttribute("data-server-port", server.port);
        cell2.onclick = showResponseDetails;
        // cell2.addEventListener('click',() => {
        //     console.log('clicked', server);
        //     //ipcRenderer.send('popup',server);
        // })
        if (server.ASMleg) {
          cell3.innerHTML = server.ASMleg;
        } else {
          cell3.innerHTML = server.response;
        }
        cell4.innerHTML = server.status;
        cell5.innerHTML = server.availability;
        cell6.innerHTML = server.state;
        cell7.innerHTML = server.LBLeg;
        cell8.innerHTML = server.responseTime;

        let refButton = document.createElement("button");
        refButton.textContent = "refresh";
        refButton.type = "button";
        refButton.setAttribute("data-server-name", server.name);
        refButton.setAttribute("data-server-hostname", server.hostname);
        refButton.setAttribute("data-server-endpoint", server.endpoint);
        refButton.setAttribute("data-server-port", server.port);
        refButton.onclick = individualRefresh;

        let rowStyle = getRowStyle(server);

        row.className = "table-" + rowStyle.colour;
        refButton.classList = "btn btn-" + rowStyle.colour;
        refButton.textContent = rowStyle.text;

        cellbtn.appendChild(refButton);
      }
    }
    cbd.appendChild(table);
  }
}

function getRowStyle(server) {
  if (server.ASMleg == "querying...") {
    //no results yet as it's querying
    return { colour: "outline-warning", text: "retry" };
  } else if (server.ASMleg.includes(server.LBLeg)) {
    // matching LB ASMleg to ASM Leg
    if (server.availability == "true") {
      if (server.state == "UP") {
        return { colour: "success", text: "refresh" };
      } else if (server.state == "DOWN") {
        return { colour: "danger", text: "refresh" };
      } else {
        return { colour: "warning", text: "refresh" };
      }
    } else if (server.availability != "true") {
      if (server.state == "UP") {
        return { colour: "warning", text: "refresh" };
      } else if (server.state == "DOWN") {
        return { colour: "danger", text: "refresh" };
      } else {
        return { colour: "warning", text: "refresh" };
      }
    }
  } else {
    //this server is not in this leg.....

    //if LB says server is up then we have a problem here
    if (server.state == "UP") {
      return { colour: "danger", text: "refresh" };
    } else {
      return { colour: "secondary", text: "refresh" };
    }
  }
}

function showResponseDetails(e) {
  for (let server of serverList) {
    if (
      server.port == e.target.attributes["data-server-port"].value &&
      server.hostname == e.target.attributes["data-server-hostname"].value &&
      server.name == e.target.attributes["data-server-name"].value
    ) {
      //ipcRenderer.send("popup", server);
      makeModal(server);
    }
  }
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

ipcRenderer.on("updateMasterLBList", function(e, _masterLBList) {
  masterLBList = _masterLBList;
  setupEnvTypeList();
});

function setupEnvTypeList() {
  //envTypeList = envTypeData;

  dropDownDivEnvType = document.querySelector("#dropDownDivEnvType");
  let newList = document.createElement("select");

  for (lb of masterLBList) {
    newList.appendChild(new Option(lb.envname, lb.envname));
  }
  newList.addEventListener("change", function() {
    itemtoKill = document.querySelector("#pickSubEnvBtn");
    if (itemtoKill) {
      itemtoKill.parentNode.removeChild(itemtoKill);
    }
    itemtoKill = document.querySelector("#dropDownSubEnv");
    if (itemtoKill) {
      itemtoKill.parentNode.removeChild(itemtoKill);
    }
    itemtoKill = document.querySelector("#showServersBtn");
    if (itemtoKill) {
      itemtoKill.parentNode.removeChild(itemtoKill);
    }
    serverList = [];

    drawMultiTables();
  });
  newList.classList = "w-100 btn btn-secondary dropdown-toggle";
  dropDownDivEnvType.appendChild(newList);

  btnDivEnvType = document.querySelector("#btnDivEnvType");
  let pickEnvTypeBtn = document.createElement("button");
  pickEnvTypeBtn.textContent = "Select";
  pickEnvTypeBtn.type = "button";
  pickEnvTypeBtn.classList = "btn btn-primary btn-block";
  pickEnvTypeBtn.addEventListener("click", function() {
    itemtoKill = document.querySelector("#pickSubEnvBtn");
    if (itemtoKill) {
      itemtoKill.parentNode.removeChild(itemtoKill);
    }
    itemtoKill = document.querySelector("#dropDownSubEnv");
    if (itemtoKill) {
      itemtoKill.parentNode.removeChild(itemtoKill);
    }
    itemtoKill = document.querySelector("#showServersBtn");
    if (itemtoKill) {
      itemtoKill.parentNode.removeChild(itemtoKill);
    }
    serverList = [];
    drawMultiTables();
    pickedEnvType(newList.value);
  });
  btnDivEnvType.appendChild(pickEnvTypeBtn);
}

function pickedEnvType(_envType) {
  if ((currentMLB = getMasterLBForEnvType(_envType))) {
    let masterLBAddress = "http://" + currentMLB.hostname + currentMLB.endpoint;
    getRequest(
      gotSubLBList,
      masterLBAddress,
      currentMLB,
      currentMLB.username,
      currentMLB.password
    );
  } else {
    console.log(_envType + " doesn't exist");
  }
}

function getMasterLBForEnvType(_envType) {
  for (mlb of masterLBList) {
    if (mlb.envname == _envType) {
      return mlb;
    }
  }
  return false;
}

function setupSubEnvDropDown() {
  dropDownDivSubEnv = document.querySelector("#dropDownDivSubEnv");
  let newList = document.createElement("select");
  let tempEnvList = [];
  for (item of subLBList) {
    tempEnvList.push(item.splitEnvName);
  }
  tempEnvList = tempEnvList.filter(onlyUnique);
  for (env of tempEnvList) {
    newList.appendChild(new Option(env, env));
  }
  newList.classList = "w-100 btn btn-secondary dropdown-toggle";
  dropDownDivSubEnv.appendChild(newList);
  newList.id = "dropDownSubEnv";

  btnDivSubEnv = document.querySelector("#btnDivSubEnv");
  let pickSubEnvBtn = document.createElement("button");
  pickSubEnvBtn.textContent = "Select Sub Env";
  pickSubEnvBtn.id = "pickSubEnvBtn";
  pickSubEnvBtn.type = "button";
  pickSubEnvBtn.classList = "btn btn-primary btn-block";
  pickSubEnvBtn.addEventListener("click", function() {
    currentSubEnv = newList.value;
    getServerListFromSubLBList(currentSubEnv);
  });
  btnDivSubEnv.appendChild(pickSubEnvBtn);
}

function gotSubLBList(data) {
  subLBList = [];
  try {
    let masterLBResponse = JSON.parse(data);
    subLBList = masterLBResponse.lbvserver;
    for (subLB of subLBList) {
      subtext = subLB.name.split("-");
      subLB.splitEnvName = subtext[6].substr(-3);
      subLB.splitServerType = subtext[4];
      subLB.splitLeg = subtext[5];
    }
    setupSubEnvDropDown();
  } catch (err) {
    console.log("BAD Response from Master LB");
    console.log(err);
  }
}

function getServerListFromSubLBList(_selectedEnvName) {
  lbServerList = [];
  requestCount = subLBList.length;
  replyCount = 0;

  for (subLB of subLBList) {
    if (subLB.splitEnvName == _selectedEnvName) {
      let subLBAddress =
        "http://" +
        currentMLB.hostname +
        currentMLB.endpoint +
        "/" +
        subLB.name +
        "?statbindings=yes";
      //http://10.141.129.210/nitro/v1/stat/lbvserver/FT1-UIS-X?statbindings=yes
      getRequest(
        gotSubServerList,
        subLBAddress,
        subLB,
        currentMLB.username,
        currentMLB.password
      );
    }
  }
}

function gotSubServerList(data, _subLB) {
  replyCount++;
  try {
    let subLBResponse = JSON.parse(data);
    let subLBServerList = subLBResponse.lbvserver[0].servicegroupmember;
    for (subLBServer of subLBServerList) {
      subLBServer.LBName = _subLB.name;
      subLBServer.MLBState = subLBResponse.lbvserver[0].state;
      lbServerList.push(subLBServer);
    }
    //console.log(lbServerList.length);
  } catch (err) {
    console.log("BAD Response from Sub LB");
    console.log(_subLB);
    console.log(err);
  } finally {
    if (requestCount == replyCount) {
      processServers();
    }
  }
}

function processServers() {
  console.log("AllSubLBsReplied");

  serverList = [];
  for (let lbServer of lbServerList) {
    splitTextQuestion = lbServer.servicegroupname.split("?");
    splitTextHyphen = splitTextQuestion[0].split("-");
    lbServer.name = splitTextQuestion[0].slice(0, -4);
    lbServer.ip = lbServer.primaryipaddress;
    lbServer.hostname = splitTextQuestion[1] + ".corp.internal";
    lbServer.port = splitTextQuestion[2];
    lbServer.endpoint =
      "/application-status-monitor/rest/applicationstatusmonitor/status.json";
    lbServer.response = "querying...";
    lbServer.ASMleg = "querying...";
    lbServer.availability = null;
    lbServer.status = null;
    lbServer.LBLeg = lbServer.servicegroupname.split("-")[2];
  }

  serverList = lbServerList;
  enableServerListButton();
  resetSort();
  sortData("name", "hostname");
  drawMultiTables();
  requestAllServerDetails();
}

function enableServerListButton() {
  let btnDivShowServers = document.querySelector("#btnDivShowServers");
  console.log(btnDivShowServers);
  let showServersBtn = document.createElement("button");
  showServersBtn.textContent = "Show Servers";
  showServersBtn.type = "button";
  showServersBtn.classList = "btn btn-primary btn-block";
  showServersBtn.addEventListener("click", function() {
    ipcRenderer.send('showServerWindow',serverList);
  });
  showServersBtn.id = "showServersBtn";
  btnDivShowServers.appendChild(showServersBtn);
}

function requestAllServerDetails() {
  for (let server of serverList) {
    server.ASMleg = "querying...";
    getServerDetails(server);
  }
}

function individualRefresh(e) {
  for (let server of serverList) {
    if (
      server.port == e.target.attributes["data-server-port"].value &&
      server.hostname == e.target.attributes["data-server-hostname"].value
    ) {
      server.ASMleg = "querying...";

      drawMultiTables();
      if (server.name == e.target.attributes["data-server-name"].value) {
        getServerDetails(server);
      }
    }
  }
}

function getServerDetails(server) {
  let url = "http://" + server.hostname + ":" + server.port + server.endpoint;
  getRequest(updateServerResults, url, server);
}

function getRequest(callback, url, id, username, password) {
  var xhr = new XMLHttpRequest();
  var startTime = new Date();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  if (username) {
    xhr.setRequestHeader(
      "Authorization",
      "Basic " + btoa(username + ":" + password)
    );
  }

  xhr.send();
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      var endTime = new Date();
      callback(xhr.responseText, id, endTime - startTime);
    }
    if (xhr.readyState == 4 && xhr.status != 200) {
      var endTime = new Date();
      callback(
        "connection error, status:" + xhr.status,
        id,
        endTime - startTime
      );
    }
  };
}

function postRequest(callback, url, args, auth, action, server) {
  var xhr = new XMLHttpRequest();

  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  if (auth) {
    xhr.setRequestHeader("Authorization", auth);
  }
  xhr.send(args);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      callback(xhr.responseText, action, null, server);
    }
    if (xhr.readyState == 4 && xhr.status != 200) {
      callback(xhr.responseText, action, xhr.status, server);
    }
  };
}

function updateServerResults(data, _server, timing) {
  //format = {"status":{"available":true,"currentStatus":"UP_AND_RUNNING","label":"LEGX"}}
  for (server of serverList) {
    if (_server.hostname == server.hostname && _server.port == server.port) {
      server.response = data;
      server.responseTime = timing;
      try {
        server.ASMleg = JSON.parse(data).status.label;
      } catch (e) {
        server.ASMleg = data;
      }
      try {
        server.status = JSON.parse(data).status.currentStatus;
      } catch (e) {
        server.status = null;
      }
      try {
        server.availability = JSON.parse(data).status.available.toString();
      } catch (e) {
        server.availability = null;
      }
    }
  }
  drawMultiTables();
}

function postedMaint(response, action, err, _server) {
  let replyStatus;
  if (err) {
    replyStatus = "Error: " + err;
  } else {
    let parser = new DOMParser();
    let reply = parser.parseFromString(response, "text/html");
    replyStatus = reply.getElementById("fade").textContent;
    console.log(reply);
  }
  console.log(replyStatus);
  switch (action) {
    case "SET":
      $("#setMaintBtn").popover("dispose");
      $("#setMaintBtn").popover({ content: replyStatus, trigger: "focus" });
      $("#setMaintBtn").popover("show");
      break;
    case "UNSET":
      $("#unsetMaintBtn").popover("dispose");
      $("#unsetMaintBtn").popover({ content: replyStatus, trigger: "focus" });
      $("#unsetMaintBtn").popover("show");
      break;
    default:
      console.log("unknown reply", action);
  }

  for (sv of serverList) {
    if (sv == _server) {
      console.log(sv);
      sv.availability = "refreshing...";
      sv.MLBState = "refreshing...";
      sv.status = "refreshing...";
    }
  }

  drawMultiTables();
  setTimeout(getServerListFromSubLBList, 10000, currentSubEnv);
}

function maintMode(action, server) {
  //gbrpmsuisf01.corp.internal

  switch (action.toUpperCase()) {
    case "SET": {
      postRequest(
        postedMaint,
        "https://" +
          server.hostname +
          ":8443/application-status-monitor/jmx/servers/0/domains/com.ab.oneleo.status.monitor.mbean/mbeans/type=ApplicationStatusMonitor/operations/setMaintenanceMode(int,boolean)",
        "param=0&param=false&executed=true",
        "Basic " + btoa("FT1Admin:changeme"),
        action,
        server
      );
      // https://gbrpmsuisf01.corp.internal:8443/application-status-monitor/jmx/servers/0/domains/com.ab.oneleo.status.monitor.mbean/mbeans/type=ApplicationStatusMonitor/operations/setMaintenanceMode%28int%2Cboolean%29
      console.log(action, server);
      break;
    }
    case "UNSET": {
      postRequest(
        postedMaint,
        "https://" +
          server.hostname +
          ":8443/application-status-monitor/jmx/servers/0/domains/com.ab.oneleo.status.monitor.mbean/mbeans/type=ApplicationStatusMonitor/operations/unsetMaintenanceMode()",
        "executed=true",
        "Basic " + btoa("FT1Admin:changeme"),
        action,
        server
      );
      // https://gbrpmsuisf01.corp.internal:8443/application-status-monitor/jmx/servers/0/domains/com.ab.oneleo.status.monitor.mbean/mbeans/type=ApplicationStatusMonitor/operations/unsetMaintenanceMode%28%29
      console.log(action, server);
      break;
    }
    default: {
      console.log(server);
    }
  }
  console.log("end of function");
}

function whatDoesLBThinkOfThisServer(server) {
  console.log(serverList, envTypeList, subLBList, lbServerList);
  console.log(server);
}

class Server {
  constructor(name, hostname, port, endpoint) {
    this.name = name;
    this.hostname = hostname;
    this.port = port;
    this.endpoint = endpoint;
    this.response = null;
    this.ASMleg = null;
    this.availability = null;
    this.status = null;
  }
}

class MasterLB {}

class SubLB {}
