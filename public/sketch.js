//const debugMode = true;
let serverList = {};
let table;

function preload(){
    table = loadTable('servers.txt', 'csv', 'header');
}

function setup() {
// get server list
    console.log(serverList);
    let button = document.getElementById("refreshButton");
    button.addEventListener("click", refresh);

    //createServerList();
    //getServerList();
    console.log(serverList);
    requestServerDetails();
    console.log(serverList);
    drawTable();
}


function refresh(){
    createServerList();
    requestServerDetails();
    drawTable();
}


function createServerList(){

    let localList = [];

    for (var r = 0; r < table.getRowCount(); r++){

        let serverdeets = {};

        serverdeets.name = table.getString(r, 0)
        serverdeets.endpoint = table.getString(r, 1)
        localList.push(serverdeets);
    }
    serverList.servers=localList;

}


function drawTable(){
    //for everything in sserver list, draw it
    let table = document.getElementById("serverTable").getElementsByTagName('tbody')[0];
    table.innerHTML = "";
    let i = 0
    for(let server of serverList.servers){
  
        let row = table.insertRow(i);
        let cell1 = row.insertCell(0);
        let cell2 = row.insertCell(1);
        let cell3 = row.insertCell(2);
        let cellbtn = row.insertCell(3);
        cell1.innerHTML = server.name;
        cell2.innerHTML = server.endpoint;
        cell3.innerHTML = server.leg;
        if(server.leg != "XLeg") {
            row.className = "table-success"
        }
        if(server.leg == "connection error, status:0") {
            row.className = "table-danger"
            let refButton = createButton('retry');
            refButton.attribute('type','button');
            refButton.attribute("class","btn btn-danger");
            refButton.parent(cellbtn);
            refButton.attribute('data-server-name',server.name);
            refButton.attribute('data-server-endpoint',server.endpoint);
            //refButton.attribute('data-server-port',server.port);
            refButton.mousePressed(getServerDetails);
            
        }
        i++;
    }
}

function requestServerDetails(){
    for(let server of serverList.servers){
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
    
    for(server of serverList.servers){
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
    var xhr = new XMLHttpRequest();
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





