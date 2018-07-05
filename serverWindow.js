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
//   for (env of tempServerList) {
//     let serverDetails = getServerDetails(env);
//     newList.appendChild(new Option(env + " - " + serverDetails.type + serverDetails.leg + serverDetails.status, env));
//   }
//   newList.classList = "w-100 btn btn-secondary dropdown-toggle";
//   dropDownDivSubEnv.appendChild(newList);
//   newList.id = "dropDownSubEnv";

  showList(tempServerList);

});


function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  function getServerDetails(serverName){
    for(server of serverList) {
        if (server.hostname == serverName) {
            return {type: server.name.split("-")[1], leg: server.ASMleg , status: server.status, availability:server.availability, hostname:server.hostname, port:server.port};
        }
    }
    return "";
  }

  function showList(_list){

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

    // Add some bold text in the new cell:
    cell1.innerHTML = "<b>Hostname</b>";
    cell2.innerHTML = "<b>Type</b>";
    // cell2.addEventListener("click", function() {
    //   sortData("name", "hostname");
    // });
    cell3.innerHTML = "<b>ASM Leg</b>";
    cell4.innerHTML = "<b>ASM Status</b>";
    cell5.innerHTML = "<b>ASM Availability</b>";

    for (item of _list) {

        let serverDetails = getServerDetails(item);

        let row = table.insertRow();
        let cell1 = row.insertCell();
        let cell2 = row.insertCell();
        let cell3 = row.insertCell();
        let cell4 = row.insertCell();
        let cell5 = row.insertCell();
        cell1.innerHTML = serverDetails.hostname + ":" + serverDetails.port;
        cell2.innerHTML = serverDetails.type
        cell3.innerHTML = serverDetails.leg
        cell4.innerHTML = serverDetails.status;
        cell5.innerHTML = serverDetails.availability;

        // let rowStyle = getRowStyle(serverDetails.full);

        // row.className = "table-" + rowStyle.colour;

        let tableDiv = document.querySelector("#tableDiv");
        tableDiv.appendChild(table);

    }
  }