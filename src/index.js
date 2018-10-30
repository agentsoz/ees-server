const globalMercator = require('global-mercator')
const express = require('express');
const tilelive = require('@mapbox/tilelive');
const MBTiles = require('@mapbox/mbtiles').registerProtocols(tilelive);
const fs = require('fs');
const download = require('download');
var cors = require('cors')
import {loadAllTiles, getTile} from './tilesaggr'

function startServer(port) {
  return new Promise(function(resolve, reject){
    var app = express();
    app.use(cors());
    app.listen(port, resolve(app));
  });
}

async function main3() {
  var tiledict = {};
  tiledict["mount_alexander_shire_network"] = {
    region: "mount-alexander-shire",
    download: "https://cloudstor.aarnet.edu.au/plus/s/oh23zw4a0Vy4PNQ/download"
  }
  tiledict["surf_coast_shire_network"] = {
    region: "surf-coast-shire",
    download: "https://cloudstor.aarnet.edu.au/plus/s/JK7STxWGKI2jNe4/download"
  }

  // Download all tiles from cloud storage if necessary, and load them into memory
  loadAllTiles(tiledict);

  // Start the express server
  const port = 12345;
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
  // Serve the requested file (needed to get style.json)
  server.get('/:file', function(req, res){
    res.sendFile(__dirname + '/' + req.params.file);
  });
  // Handle something like: /tiles/matsim/zoom/lon/lat
  server.get('/tiles/:layer/:z/:x/:y.pbf', function (req, res) {
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

main3();
