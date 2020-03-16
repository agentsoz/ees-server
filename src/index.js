const globalMercator = require('global-mercator')
const express = require('express');
const download = require('download');
const fs = require('fs');
var cors = require('cors')
import {loadAllTiles, getTile} from './tilesaggr'
import { PHOENIX_DIR, loadAllFires} from './phoenixaggr'
import { POPULATION_DIR, loadAllPopulations} from './populationaggr'
import files from '../data/files.json';

var DATA_DIR = "data";

var phoenixdict = {};
var populationdict = {};

async function loadFromFile(url) {
  // data.json should contain all fires and population data
  phoenixdict = await loadAllFires(files.phoenix_fires)
  populationdict = await loadAllPopulations(files.matsim_populations)
}

/**
 * MATSim Networks
 */
var tiledict = {};
// Shape name: mount_alexander_shire_networkP
tiledict["mount_alexander_shire_network"] = {
  name: "Mount Alexander Shire",
  region: "mount-alexander-shire",
  center: [144.212304, -37.064737], // Castlemaine VIC
  matsimNetworkLayer: "mount_alexander_shire_networkP",
  matsimNetworkTiles: "/matsim-tiles/mount-alexander-shire/{z}/{x}/{y}.pbf",
  download: "https://cloudstor.aarnet.edu.au/plus/s/oh23zw4a0Vy4PNQ/download"
}
// Shape name: surf_coast_shire_networkP
tiledict["surf_coast_shire_network"] = {
  name: "Surf Coast Shire",
  region: "surf-coast-shire",
  center: [144.326271, -38.332386], // Torquay Esplanade
  matsimNetworkLayer: "surf_coast_shire_networkP",
  matsimNetworkTiles: "/matsim-tiles/surf-coast-shire/{z}/{x}/{y}.pbf",
  download: "https://cloudstor.aarnet.edu.au/plus/s/JK7STxWGKI2jNe4/download"
}

function startServer(port) {
  return new Promise(function(resolve, reject){
    var app = express();
    app.use(cors());
    app.listen(port, resolve(app));
  });
}

async function main3() {
  // Download all tiles from cloud storage if necessary, and load them into memory
  loadAllTiles(tiledict);

  // Start the express server
  const port = process.env.PORT || 80;
  console.log("Starting the server on local port %d", port);
  const server = await startServer(port);
  console.log("Ready and serving the tiles at http://localhost:%s", port);

  // Set up some HTTP GET handlers
  // Serve index.html if nothing specified
  server.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
  });
  // Don't have a favicon
  server.get('/favicon.ico', (req, res) => res.status(204));

  // wake the server
  server.get('/config', function(req, res){
    res.send({
      "tiles": tiledict,
      "fires": phoenixdict,
      "populations": populationdict
    });
  });

  server.get('/wake/please', function(req, res){
    res.send("OK 2");
  });

  // Serve the requested file (needed to get style.json)
  server.get('/:file', function(req, res){
    res.sendFile(__dirname + '/' + req.params.file);
  });
  // Serve the requested data file
  server.get('/'+DATA_DIR+'/:file', function(req, res){
    res.sendFile(__dirname + '/' + DATA_DIR + '/' + req.params.file);
  });
  // Serve the requested phoenix file
  server.get('/'+PHOENIX_DIR+'/:file', function(req, res){
    res.sendFile(__dirname + '/' + PHOENIX_DIR + '/' + req.params.file);
  });
  // Serve the requested population file
  server.get('/'+POPULATION_DIR+'/:file', function(req, res){
    res.sendFile(__dirname + '/' + POPULATION_DIR + '/' + req.params.file);
  });

  // Handle something like: /tiles/matsim/zoom/lon/lat
  server.get('/matsim-tiles/:layer/:z/:x/:y.pbf', function (req, res) {
    const x = parseInt(req.params.x);
    const y = parseInt(req.params.y);
    const z = parseInt(req.params.z);
    console.log("zxy[%d,%d,%d] ", z,x,y);
    getTile(req.params.layer, z, x, y).then(function(data) {
      const headers = data[0];
      const img = data[1];
      console.log(headers);
      res.set(headers);
      res.send(img);
    },function(err) {
      console.log(err);
      res.status(404)
      res.send(err.message);
      console.log(err.message);
    });
  });
  // Catch-all for the rest
  server.get('*', function(req, res){
    res.send('what???', 404);
  });

}

loadFromFile("http://localhost:12345/data/files.json")  
main3();

