var globalMercator = require('global-mercator')
var express = require('express');
var tilelive = require('@mapbox/tilelive');
var MBTiles = require('@mapbox/mbtiles').registerProtocols(tilelive);
var protobuf = require("protobufjs");

function startServer(port) {
  return new Promise(function(resolve, reject){
    var app = express();
    app.listen(port, resolve(app));
  });
}

function loadTilesDb(url) {
  return new Promise(function(resolve, reject){
    tilelive.load(url, function(err, source) {
      if (err) {
        reject(err);
      } else {
        resolve(source);
      }
    });
  });
}

function getTile(source, z, x, y) {
  return new Promise(function(resolve, reject){
    source.getTile(z, x, y, function(err, tile, headers) {
        if (err) {
          reject(err);
        } else {
          resolve([headers, tile]);
        }
    });
  });
}

function getList(dir) {
  return new Promise(function(resolve, reject){
    tilelive.list(dir, function(err, data){
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function main3() {
  // List the MBTiles files in this directory
  const dir = "./mbtiles";
  const mbtilesFile = "mount_alexander_shire_network";
  const list = await getList(dir);
  console.log("Found the following MBTiles files in dir '%s':\n%s",dir,JSON.stringify(list, null, 2));
  // Load the one we want (assumes it is there)
  console.log("Loading %s", mbtilesFile);
  const tiles = await loadTilesDb(list[mbtilesFile]).catch(error => console.log(error));
  // Start the express server
  const port = 12345;
  console.log("Starting the server on local port %d", port);
  const server = await startServer(port);
  console.log("Ready and serving the Mount Alexander Shire MATSim network at http://localhost:%s", port);
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
    getTile(tiles, z, x, y).then(function(data) {
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
