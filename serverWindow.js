const electron = require("electron");
const { ipcRenderer } = electron;
const bootstrap = require("bootstrap"); //required even though not called!!
var $ = require("jquery");

let serverList = [];

ipcRenderer.on("showServerList", function(e, _serverList) {
    serverList = _serverList;
  console.log(serverList);

  dropDownDivSubEnv = document.querySelector("#dropDownDivSubEnv");
  let newList = document.createElement("select");
  let tempServerList = [];
  for (item of serverList) {
      tempServerList.push(item.hostname);
  }
  tempServerList = tempServerList.filter(onlyUnique);
  for (env of tempServerList) {
    let serverDetails = getServerDetails(env);
    newList.appendChild(new Option(env + " - " + serverDetails.type + serverDetails.leg + serverDetails.status, env));
  }
  newList.classList = "w-100 btn btn-secondary dropdown-toggle";
  dropDownDivSubEnv.appendChild(newList);
  newList.id = "dropDownSubEnv";

});


function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  function getServerDetails(serverName){
    for(server of serverList) {
        if (server.hostname == serverName) {
            return {type: server.name.split("-")[1], leg: server.ASMleg , status: server.status};
        }
    }
    return "";
  }