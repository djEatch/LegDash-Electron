const electron = require("electron");
const { ipcRenderer } = electron;
const bootstrap = require("bootstrap"); //required even though not called!!
var $ = require("jquery");
//var Mousetrap = require('mousetrap');

let serverList = [];
let envTypeList;
let masterLBList = [];
let servCountList = [];
let envNameList = [];
let fullSubLBList = [];
let currentSubLBList = [];
let currentMLB;
let currentSubEnv;
let lbServerList = [];
let requestCount = 0;
let replyCount = 0;

let lbUsers = [];
let currentMLBuser;
let jmxUsers = [];
let currentJMXuser;

let sortOptions = { currentField: null, currentDir: -1 };
const accordionContainer = document.querySelector("#accordionContainer");
const modalDiv = document.querySelector("#modalDiv");
const NOLEG = "No Leg Info";
const NODEPLOY = "No Deployment Info";
const CONNERROR = "connection error, status: ";

function showServerModal(server) {
  //modalDiv.innerHTML = "";
  let h;
  h = document.getElementById("modal-header-title");
  h.textContent = server.hostname + " (" + server.ip + ")";
  
  h = document.getElementById("modal-server-address"); 
  h.textContent = "http://" + server.hostname + ":" + server.port + server.endpoint;

  h = document.getElementById("modal-server-response"); 
  h.textContent = server.response

  let setMaintBtn = document.getElementById("setMaintBtn");
  let unsetMaintBtn = document.getElementById("unsetMaintBtn");
 
  setMaintBtn.addEventListener("click", () => {
    maintMode("SET", server);
  });

  unsetMaintBtn.addEventListener("click", () => {
    maintMode("UNSET", server);
  });

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

function sortServerData(field, field2) {
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

  tempLBList = currentSubLBList;
  tempLBList.sort(function(a, b) {
    x = a.name.toLowerCase();
    y = b.name.toLowerCase();
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
    let headerText = ["VIP Name", "Hostname","ASM Leg","ASM Status", "ASM Avail.", "LB State","LB Leg","Res. Time","Retry","Con. Count", "Dep."];

    // Create an empty <tr> element and add it to the first position of <thead>:
    var row = header.insertRow(0);

    // Insert a new cell (<td>) at the first position of the "new" <tr> element:
    let cell = []
    for (heading of headerText){
      cell.push(row.insertCell());
      cell[cell.length-1].innerHTML="<b>" + heading + "</b>"
      if(heading == "Hostname"){
        cell[cell.length-1].addEventListener("click", function() {
          sortServerData("VIPname", "hostname");
        });
      }
    }

    for (server of serverList) {
      if (server.LBName == currentLB.name) {
        let row = table.insertRow();
        let cell = []
        let rowStyle = getRowStyle(server);
        row.className = "table-" + rowStyle.colour;
        for (heading of headerText){
          cell.push(row.insertCell());
          switch(heading){
            case "VIP Name":{
              cell[cell.length-1].innerHTML=server.VIPname;
              break;
            }
            case "Hostname":{
              cell[cell.length-1].innerHTML=server.hostname + ":" + server.port + "<br>(" + server.ip + ")";
              cell[cell.length-1].setAttribute("data-server-VIPname", server.VIPname);
              cell[cell.length-1].setAttribute("data-server-hostname", server.hostname);
              cell[cell.length-1].setAttribute("data-server-endpoint", server.endpoint);
              cell[cell.length-1].setAttribute("data-server-port", server.port);
              cell[cell.length-1].onclick = showResponseDetails;
              break;
            }
            case "ASM Leg":{
              cell[cell.length-1].innerHTML = server.ASMleg;
              cell[cell.length-1].setAttribute("data-server-VIPname", server.VIPname);
              cell[cell.length-1].setAttribute("data-server-hostname", server.hostname);
              cell[cell.length-1].setAttribute("data-server-endpoint", server.endpoint);
              cell[cell.length-1].setAttribute("data-server-port", server.port);
              if (server.ASMleg == NOLEG) {
                cell[cell.length-1].style.color = "red";
              }
              break;
            }
            case "ASM Status":{
              cell[cell.length-1].innerHTML=server.status;
              cell[cell.length-1].setAttribute("data-server-VIPname", server.VIPname);
              cell[cell.length-1].setAttribute("data-server-hostname", server.hostname);
              cell[cell.length-1].setAttribute("data-server-endpoint", server.endpoint);
              cell[cell.length-1].setAttribute("data-server-port", server.port);
              cell[cell.length-1].onclick = showResponseDetails;
              if(cell[cell.length-1].textContent.substring(0,26) == CONNERROR) {
                cell[cell.length-1].style.color = "red";
              }
              break;
            }
            case "ASM Avail.":{
              cell[cell.length-1].innerHTML=server.availability;
              break;
            }
            case "LB State":{
              cell[cell.length-1].innerHTML=server.state;
              break;
            }
            case "LB Leg":{
              cell[cell.length-1].innerHTML=server.LBLeg;
              break;
            }
            case "Res. Time":{
              cell[cell.length-1].innerHTML=server.responseTime;
              break;
            }
            case "Retry":{
              let refButton = document.createElement("button");
              refButton.textContent = "refresh";
              refButton.type = "button";
              refButton.setAttribute("data-server-VIPname", server.VIPname);
              refButton.setAttribute("data-server-hostname", server.hostname);
              refButton.setAttribute("data-server-endpoint", server.endpoint);
              refButton.setAttribute("data-server-port", server.port);
              refButton.onclick = individualRefresh;
              refButton.classList = "btn btn-" + rowStyle.colour;
              refButton.textContent = rowStyle.text;
      
              cell[cell.length-1].appendChild(refButton);
              break;
            }
            case "Con. Count":{
              cell[cell.length-1].innerHTML=server.cursrvrconnections;
              break;
            }
            case "Dep.":{
              cell[cell.length-1].innerHTML="";
              for (deployment of server.deployments) {
                if(deployment == NODEPLOY){
                  cell[cell.length-1].innerHTML = NODEPLOY + "<br>";
                } else {
                  cell[cell.length-1].innerHTML +=
                  deployment.deploymentName.split("-")[1] +
                  " (" + deployment.deploymentName.split("-")[2] + ")" +
                  " : " +
                  deployment.deployed +
                  "<br>";
                }
              } 
              cell[cell.length-1].innerHTML = cell[cell.length-1].innerHTML.slice(0, -4);
              if(cell[cell.length-1].textContent == NODEPLOY) {
                cell[cell.length-1].style.color = "red";
              }
              break;
            }
          }
        }
      }
    }
    cbd.appendChild(table);
  }
}

ipcRenderer.on("exportResults", exportResults);

function writeLine(_length,textToRepeat){
  let i = _length;
  let output = "";
  while(i--){
    output += textToRepeat;
  }
  return output;
}
function exportResults() {
  let tempLBList = [];

  let outputText = "";

  tempLBList = currentSubLBList;
  tempLBList.sort(function(a, b) {
    x = a.name.toLowerCase();
    y = b.name.toLowerCase();
    if (x < y) {
      return -1;
    } else if (x > y) {
      return 1;
    } else return 0;
  });

  if (serverList.length < 1) {
    return;
  }

  let headerText = ["VIP Name", "Hostname","ASM Leg","ASM Status", "ASM Avail.", "LB State","LB Leg","Res. Time","Retry","Con. Count", "Dep."];
  let headerLength = headerText.toString().length
  
  for (currentLB of tempLBList) {


    let shortName =
      currentLB.splitEnvName + currentLB.splitServerType + currentLB.splitLeg;

    //console.log(currentLB);
    
    outputText += writeLine(headerLength,"=") + ("\r\n");
    //outputText += "==============================================================\n"
    outputText += (currentLB.name + " - " + currentLB.state) + ("\r\n");
    outputText += writeLine(headerLength,"=") + ("\r\n");
    //outputText += "==============================================================\n"

    

    outputText += headerText;
    outputText += ("\r\n");
    outputText += writeLine(headerLength,"-") + ("\r\n");

    for (server of serverList) {
      if (server.LBName == currentLB.name) {
        for (heading of headerText){
          switch(heading){
            case "VIP Name":{
              outputText += server.VIPname + ", ";
              break;
            }
            case "Hostname":{
              outputText += server.hostname + ":" + server.port + " (" + server.ip + ")" + ", ";
              break;
            }
            case "ASM Leg":{
              outputText +=  server.ASMleg + ", ";
              break;
            }
            case "ASM Status":{
              outputText += server.status + ", ";
              break;
            }
            case "ASM Avail.":{
              outputText += server.availability + ", ";
              break;
            }
            case "LB State":{
              outputText += server.state + ", ";
              break;
            }
            case "LB Leg":{
              outputText += server.LBLeg + ", ";
              break;
            }
            case "Res. Time":{
              outputText += server.responseTime + ", ";
              break;
            }
            case "Retry":{
              break;
            }
            case "Con. Count":{
              outputText += server.cursrvrconnections+ ", ";
              break;
            }
            case "Dep.":{
              for (deployment of server.deployments) {
                if(deployment == NODEPLOY){
                  outputText += NODEPLOY + " & ";
                } else {
                  outputText +=
                  deployment.deploymentName.split("-")[1] +
                  " (" + deployment.deploymentName.split("-")[2] + ")" +
                  " : " +
                  deployment.deployed +
                  " & ";
                }
              } 
              break;
            }
          }
        }
        outputText += ("\r\n");
      }
      
    }
    
  }
  outputText += writeLine(headerLength,"^") + ("\r\n");
  let globalSubEnv = electron.remote.getGlobal("globalSubEnv")
  writeFile(outputText, "DLA-vips-" + globalSubEnv + "-" + new Date().toISOString() + ".txt");
  //console.log(outputText);
}

function writeFile(contentString, outputFilename){
  let file = new Blob([contentString], {type: "text"});
  if (window.navigator.msSaveOrOpenBlob) { // IE10+
    window.navigator.msSaveOrOpenBlob(file, outputFilename);
  }
  else { // Others
    let a = document.createElement("a")
    let url = URL.createObjectURL(file);
    a.href = url;
    a.download = outputFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);  
    }, 0); 
  }
}

function getRowStyle(server) {
  if (server.ASMleg == "querying...") {
    //no results yet as it's querying
    return { colour: "outline-warning", text: "retry" };
  } else if (server.ASMleg.toUpperCase() == server.LBLeg.toUpperCase()) {
    // matching LB ASMleg to ASM Leg
    if (server.availability == "true") {
      if (server.state == "UP") {
        return { colour: "success", text: "refresh" };
      } else if (
        server.state == "DOWN" ||
        server.state == "DOWN WHEN GOING OUT OF SERVICE"
      ) {
        return { colour: "danger", text: "refresh" };
      } else {
        return { colour: "warning", text: "refresh" };
      }
    } else if (server.availability != "true") {
      if (server.state == "UP") {
        return { colour: "warning", text: "refresh" };
      } else if (
        server.state == "DOWN" ||
        server.state == "DOWN WHEN GOING OUT OF SERVICE"
      ) {
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
      server.VIPname == e.target.attributes["data-server-VIPname"].value
    ) {
      //ipcRenderer.send("popup", server);
      showServerModal(server);
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


ipcRenderer.on("updateServCountList", function(e, _servCountList){
  servCountList = _servCountList;
});


ipcRenderer.on("updateEnvNameList", function(e, _envNameList){
  envNameList = _envNameList;
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
    disableServerListButton();
    drawMultiTables();
  });
  newList.classList = "w-100 btn btn-secondary dropdown-toggle";
  newList.id = "EnvDropDown";
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

function lbLogin(e, u, p) {
  let envType = e.getAttribute("data-lbUserEnvType");
  lbUsers.push(new LBUser(envType, u.value, p.value));
  $("#loginModalDiv").modal("hide");
  pickedEnvType(envType);
}

function jmxLogin(e, u, p) {
  let envName = e.getAttribute("data-jmxUserEnvName");
  let _action = e.getAttribute("data-jmxUserAction");
  let _server = JSON.parse(e.getAttribute("data-jmxUserServer"));
  jmxUsers.push(new JMXUser(envName, u.value, p.value));
  $("#jmxLoginModalDiv").modal("hide");
  maintMode(_action, _server);
}

function reAuthenticateJMX(url, response, _envName, _action, _server ) {
  //_envName = document.querySelector("#EnvDropDown").value;
  console.log("NEED NEW CREDS, for " + _envName, url, response);
  jmxUsers = jmxUsers.filter(function(jmxu) {
    return jmxu != currentJMXuser;
  });

  showJMXLoginModal(_envName, _action, _server);
}

function reAuthenticateLB(url, response) {
  _envType = document.querySelector("#EnvDropDown").value;
  console.log("NEED NEW CREDS, for " + _envType, url, response);
  lbUsers = lbUsers.filter(function(lbu) {
    return lbu != currentMLBuser;
  });

  showLBLoginModal(_envType);
}

function showLBLoginModal(_envType) {
  let lbCredModal = document.querySelector("#modalLBpara");
  lbCredModal.innerHTML =
    "Enter login details for the " + _envType + " load balancer.";
  let lbCredModalSubmitBtn = document.querySelector("#btnSetLBcredentials");
  lbCredModalSubmitBtn.setAttribute("data-lbUserEnvType", _envType);
  $("#loginModalDiv").modal("show");
}

function showJMXLoginModal(_envName, _action, _server) {
  try{$("#myModal").modal("hide");}
  catch(error){console.log(error, "no modal to close")}
  let jmxCredModal = document.querySelector("#modalJMXpara");
  jmxCredModal.innerHTML =
    "Enter JMX login details for the envrionment: " + _envName;
  let jmxCredModalSubmitBtn = document.querySelector("#btnSetJMXcredentials");
  jmxCredModalSubmitBtn.setAttribute("data-jmxUserEnvName", _envName);
  jmxCredModalSubmitBtn.setAttribute("data-jmxUserAction", _action);
  jmxCredModalSubmitBtn.setAttribute("data-jmxUserServer", JSON.stringify(_server));
  $("#jmxLoginModalDiv").modal("show");
}

function pickedEnvType(_envType) {
  currentMLBuser = null;
  for (lbUser of lbUsers) {
    if (lbUser.environmentType == _envType) {
      currentMLBuser = lbUser;
      break;
    }
  }

  if (!currentMLBuser) {
    showLBLoginModal(_envType);
    return;
  }

  if ((currentMLB = getMasterLBForEnvType(_envType))) {
    let masterLBAddress = "http://" + currentMLB.hostname + currentMLB.endpoint;
    getRequest(
      gotSubLBList,
      masterLBAddress,
      currentMLB,
      //currentMLB.username,
      //currentMLB.password
      currentMLBuser.userName,
      currentMLBuser.passWord
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

function humanEnvName(envText) {
  for (let _env of envNameList){
    if(_env.envID.toLowerCase() == envText.toLowerCase()){
      return _env.envName;
    }
  }
  return envText;
}

function setupSubEnvDropDown() {
  let dropDownDivSubEnv = document.querySelector("#dropDownDivSubEnv");
  let newList = document.createElement("select");
  let tempEnvList = [];
  for (let item of fullSubLBList) {
    if(item.splitEnvName != "ERROR") {tempEnvList.push(item.splitEnvName);}
  }
  tempEnvList = tempEnvList.filter(onlyUnique);
  tempEnvList.sort();
  for (let env of tempEnvList) {
    newList.appendChild(new Option(humanEnvName(env), env));
  }
  newList.classList = "w-100 btn btn-secondary dropdown-toggle";
  dropDownDivSubEnv.appendChild(newList);
  newList.id = "dropDownSubEnv";
  newList.addEventListener("change", function() {
    serverList = [];
    disableServerListButton();
    drawMultiTables();
  });

  let btnDivSubEnv = document.querySelector("#btnDivSubEnv");
  let pickSubEnvBtn = document.createElement("button");
  pickSubEnvBtn.textContent = "Select Sub Env";
  pickSubEnvBtn.id = "pickSubEnvBtn";
  pickSubEnvBtn.type = "button";
  pickSubEnvBtn.classList = "btn btn-primary btn-block";
  pickSubEnvBtn.addEventListener("click", function() {
    currentSubEnv = newList.value;
    ipcRenderer.send("setGlobalSubEnv", humanEnvName(newList.value));
    getServerListFromSubLBList(currentSubEnv);
  });
  btnDivSubEnv.appendChild(pickSubEnvBtn);
}

function gotSubLBList(data) {
  fullSubLBList = [];
  try {
    let masterLBResponse = JSON.parse(data);
    fullSubLBList = masterLBResponse.lbvserver;
    for (let subLB of fullSubLBList) {
      if((subLB.name.split("-").length - 1) == 8){
        //let subtext = subLB.name.split("-");
        if(subLB.name.indexOf("-EAS-")>0){
          subLB.splitServerType = "EAS";
        } else if (subLB.name.indexOf("-UIS-">0)){
          subLB.splitServerType = "UIS";
        } else {
          subLB.splitEnvName = "ERROR";
          subLB.splitServerType = "ERROR";
          subLB.splitLeg = "ERROR";
          continue;
        }
        let pos;
        pos = subLB.name.search("-([^-]{12})-");
        if(pos > 0){
          subLB.splitEnvName = subLB.name.substr(pos+1,12).substr(-3);
        } else {
          subLB.splitEnvName = "ERROR";
          subLB.splitServerType = "ERROR";
          subLB.splitLeg = "ERROR";
          continue;
        }
        pos = subLB.name.search("-([^-])-");
        if(pos > 0){
          subLB.splitLeg = subLB.name.substr(pos+1,1);
        } else {
          subLB.splitEnvName = "ERROR";
          subLB.splitServerType = "ERROR";
          subLB.splitLeg = "ERROR";
          continue;
        }
      } else {
        subLB.splitEnvName = "ERROR";
        subLB.splitServerType = "ERROR";
        subLB.splitLeg = "ERROR";
      }
    }
    setupSubEnvDropDown();
  } catch (err) {
    console.log("BAD Response from Master LB");
    console.log(err);
    console.log(data);
  }
}

function getServerListFromSubLBList(_selectedEnvName) {
  lbServerList = [];
  requestCount = 0; //subLBList.length;
  replyCount = 0;
  currentSubLBList = [];
  for (subLB of fullSubLBList) {
    if (subLB.splitEnvName == _selectedEnvName) {
      requestCount++;
      currentSubLBList.push(subLB);
    }
  }

  for (subLB of currentSubLBList) {
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
        //currentMLB.username,
        //currentMLB.password
        lbUser.userName,
        lbUser.passWord
      );
    }
  }
}

function gotSubServerList(data, _subLB) {
  replyCount++;
  try {
    let subLBResponse = JSON.parse(data);
    let subLBServerList;
    if (subLBResponse.lbvserver[0].servicegroupmember) {
      subLBServerList = subLBResponse.lbvserver[0].servicegroupmember;
    } else {
      console.log("No Servers On " + _subLB.name);
      return;
    }
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
    lbServer.VIPname = splitTextQuestion[0].slice(0, -4);
    lbServer.ip = lbServer.primaryipaddress;
    lbServer.hostname = splitTextQuestion[1];// + ".corp.internal";
    lbServer.port = splitTextQuestion[2];
    lbServer.endpoint =
      "/application-status-monitor/rest/applicationstatusmonitor/status.json";
    lbServer.response = "querying...";
    lbServer.ASMleg = "querying...";
    lbServer.availability = null;
    lbServer.status = null;
    lbServer.LBLeg = lbServer.servicegroupname.split("-")[2];
    lbServer.deployments = [];
  }

  serverList = lbServerList;
  enableServerListButton();
  resetSort();
  sortServerData("VIPname", "hostname");
  drawMultiTables();
  requestAllServerDetails();
}

function disableServerListButton() {
  let btnDivShowServers = document.querySelector("#btnDivShowServers");
  btnDivShowServers.innerHTML = "";
}

function enableServerListButton() {
  let btnDivShowServers = document.querySelector("#btnDivShowServers");
  btnDivShowServers.innerHTML = "";
  let showServersBtn = document.createElement("button");
  showServersBtn.textContent = "Show Servers";
  showServersBtn.type = "button";
  showServersBtn.classList = "btn btn-secondary btn-block";
  showServersBtn.addEventListener("click", function() {
    ipcRenderer.send("showServerWindow", serverList);
  });
  showServersBtn.id = "showServersBtn";
  btnDivShowServers.appendChild(showServersBtn);
}

function requestAllServerDetails() {
  let tempServerList = [];
  for (item of serverList) {
    tempServerList.push(item.hostname);
  }
  tempServerList = tempServerList.filter(onlyUnique);
  if(servCountList.length > 0){
    checkServerCount(tempServerList);
  }
  for (tempServer of tempServerList) {
    let querySent = false;
    for (let server of serverList) {
      if (tempServer == server.hostname) {
        if (!querySent) {
          getServerDetails(server);
          querySent = true;
        }
        server.ASMleg = "querying...";
      }
    }
  }
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function individualRefresh(e) {
  for (let server of serverList) {
    if (
      server.port == e.target.attributes["data-server-port"].value &&
      server.hostname == e.target.attributes["data-server-hostname"].value
    ) {
      server.ASMleg = "querying...";

      drawMultiTables();
      if (server.VIPname == e.target.attributes["data-server-VIPname"].value) {
        getServerDetails(server);
      }
    }
  }
}

function getServerDetails(server) {
  let url =
    "http://" +
    server.ip +
    ":" +
    server.port +
    server.endpoint +
    "?include_version=true";
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
    if (xhr.readyState == 4 && xhr.status == 401) {
      if (
        callback.name == "gotSubLBList" ||
        callback.name == "gotSubServerList"
      ) {
        reAuthenticateLB(url, xhr.responseText);
        return;
      }
    }
    if (xhr.readyState == 4 && xhr.status != 200) {
      var endTime = new Date();
      callback(
        CONNERROR + xhr.status,
        id,
        endTime - startTime
      );
    }
  };
}

function postRequest(callback, url, args, auth, action, server, timeout) {
  var xhr = new XMLHttpRequest();
  //console.log(url, args);
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  if (auth) {
    xhr.setRequestHeader("Authorization", auth);
  }
  xhr.send(args);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      callback(xhr.responseText, action, null, server, timeout);
    }
    if (xhr.readyState == 4 && xhr.status == 401) {
      if (        callback.name == "postedMaint"      ) {
        reAuthenticateJMX(url, xhr.responseText, server.VIPname.split("-")[0], action, server );
        return;
      }
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
        server.ASMleg = JSON.parse(data).status.label.replace(/^Leg/, "");
      } catch (e) {
        //server.ASMleg = data;
        server.ASMleg = NOLEG;
      }
      try {
        server.status = JSON.parse(data).status.currentStatus;
      } catch (e) {
        server.status = data;
      }
      try {
        server.availability = JSON.parse(data).status.available.toString();
      } catch (e) {
        server.availability = null;
      }
      try {
        let deploys = JSON.parse(data).status.deployments;

        if (!Array.isArray(deploys)) {
          if(deploys){
            server.deployments = [];
            server.deployments.push(deploys);
          } else {
            server.deployments = [NODEPLOY];
          }
        } else {
          server.deployments = deploys;
        }
        //console.log(server.deployments);
      } catch (e) {
        server.deployments = [];
      }
    }
  }
  drawMultiTables();
}

function postedMaint(response, action, err, _server, timeout) {
  let replyStatus;
  let replyTitle;
  if (err) {
    replyTitle = "Error: " + err;
    replyStatus =
      "Error " +
      err +
      " occured. Please try again later, if the error persists please contact support.";
  } else {
    let parser = new DOMParser();
    let reply = parser.parseFromString(response, "text/html");
    replyTitle = "Success";
    replyStatus =
      "The action " +
      action +
      " has completed successfully and returned the following response: " +
      reply.getElementById("fade").textContent;
      $("#myModal").modal("show");
    //console.log(reply);
  }
  //console.log(replyStatus);
  switch (action) {
    case "SET":
      // if (timeout > 0) {
      //   $("#setMaintDelayBtn").popover("dispose");
      //   $("#setMaintDelayBtn").popover({
      //     title: replyTitle,
      //     content: replyStatus,
      //     trigger: "focus"
      //   });
      //   $("#setMaintDelayBtn").popover("show");
      // } else
      {
        $("#setMaintBtn").popover("dispose");
        $("#setMaintBtn").popover({
          title: replyTitle,
          content: replyStatus,
          trigger: "focus"
        });
        $("#setMaintBtn").popover("show");
      }
      break;
    case "UNSET":
      $("#unsetMaintBtn").popover("dispose");
      $("#unsetMaintBtn").popover({
        title: replyTitle,
        content: replyStatus,
        trigger: "focus"
      });
      $("#unsetMaintBtn").popover("show");
      break;
    default:
      console.log("unknown reply", action);
  }

  for (sv of serverList) {
    if (sv == _server) {
      //console.log(sv);
      sv.availability = "refreshing...";
      sv.MLBState = "refreshing...";
      sv.status = "refreshing...";
    }
  }

  drawMultiTables();
  setTimeout(getServerListFromSubLBList, 10000, currentSubEnv);
  // if (timeout > 0) {
  //   setTimeout(getServerListFromSubLBList, 1000 * timeout, currentSubEnv);
  // }
}

function maintMode(action, server) {

  currentJMXuser = null;
  for (jmxUser of jmxUsers) {
    if (jmxUser.environmentName == server.VIPname.split("-")[0]) {
      currentJMXuser = jmxUser;
      break;
    }
  }

  if (!currentJMXuser) {
    showJMXLoginModal(server.VIPname.split("-")[0],action, server);
    return;
  }

  //, timeoutSeconds) {
  //gbrpmsuisf01.corp.internal
  let timeoutSeconds = 0;
  switch (action.toUpperCase()) {
    case "SET": {
      // if (!timeoutSeconds) {
      //   timeoutSeconds = 0;
      // }
      postRequest(
        postedMaint,
        "https://" +
          server.ip +
          ":8443/application-status-monitor/jmx/servers/0/domains/com.ab.oneleo.status.monitor.mbean/mbeans/type=ApplicationStatusMonitor/operations/setMaintenanceMode(int,boolean)",
        "param=" + timeoutSeconds + "&param=false&executed=true",
        "Basic " + btoa(currentJMXuser.userName + ":" + currentJMXuser.passWord),
        action,
        server //,
        // timeoutSeconds
      );
      // https://gbrpmsuisf01.corp.internal:8443/application-status-monitor/jmx/servers/0/domains/com.ab.oneleo.status.monitor.mbean/mbeans/type=ApplicationStatusMonitor/operations/setMaintenanceMode%28int%2Cboolean%29
      //console.log(action, server);
      break;
    }
    case "UNSET": {
      postRequest(
        postedMaint,
        "https://" +
          server.ip +
          ":8443/application-status-monitor/jmx/servers/0/domains/com.ab.oneleo.status.monitor.mbean/mbeans/type=ApplicationStatusMonitor/operations/unsetMaintenanceMode()",
        "executed=true",
        "Basic " + btoa(currentJMXuser.userName + ":" + currentJMXuser.passWord),
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
  //console.log("end of function");
}

// function whatDoesLBThinkOfThisServer(server) {
//   console.log(serverList, envTypeList, fullSubLBList, lbServerList);
//   console.log(server);
// }

class Server {
  constructor(VIPname, hostname, port, endpoint) {
    this.VIPname = VIPname;
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

class LBUser {
  constructor(envType, uName, pWord) {
    this.environmentType = envType;
    this.userName = uName;
    this.passWord = pWord;
  }
}

class JMXUser {
  constructor(envName, uName, pWord) {
    this.environmentName = envName;
    this.userName = uName;
    this.passWord = pWord;
  }
}

function checkServerCount(_sList){
  if(getExpectedServerCount(currentSubEnv) != _sList.length){
    alert("Env: " + currentSubEnv + "\nExpected Servers: " + getExpectedServerCount(currentSubEnv) + "\nServers Found: " + _sList.length);
  }
}

function getExpectedServerCount(envText) {
  for (let subEnv of servCountList){
    if(subEnv.envID.toLowerCase() == envText.toLowerCase()){
      return subEnv.servCount;
    }
  }
  return "Unknown - Check config";
}