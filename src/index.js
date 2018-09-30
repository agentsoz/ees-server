const globalMercator = require('global-mercator')
const express = require('express');
const tilelive = require('@mapbox/tilelive');
const MBTiles = require('@mapbox/mbtiles').registerProtocols(tilelive);
const fs = require('fs');
const download = require('download');
var cors = require('cors')

function startServer(port) {
  return new Promise(function(resolve, reject){
    var app = express();
    app.use(cors());
    app.listen(port, resolve(app));
  });
}

function getTilesDb(url, dest) {
  return new Promise(function(resolve, reject){
    var err = null;
    download(url).then(data => {
      try {
        fs.writeFileSync(dest, data);
        resolve(dest);
      } catch(error) {
        reject(err);
      }
    });
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
  const dir = ".";
  const mbtilesKey = "mount_alexander_shire_network";
  const mbtilesFile = mbtilesKey+".mbtiles";
  const mbtilesUrl = "https://cloudstor.aarnet.edu.au/plus/s/oh23zw4a0Vy4PNQ/download";
  //console.log("Files in %s:\n%s", dir, fs.readdirSync(dir));
  if (!fs.existsSync(mbtilesFile)) {
    //Fetch the mbtiles file
    console.log("Fetching MBTiles DB %s from %s", mbtilesFile, mbtilesUrl);
    const file = await getTilesDb(mbtilesUrl, mbtilesFile).catch(error => console.log(error));
  } else {
    console.log("Found %s so will use it",mbtilesFile)
  }
  // List the MBTiles files in this directory
  const list = await getList(dir);
  console.log("Found the following MBTiles files in dir '%s':\n%s",dir,JSON.stringify(list, null, 2));
  // Load the one we want (assumes it is there)
  console.log("Loading %s", mbtilesKey);
  const tiles = await loadTilesDb(list[mbtilesKey]).catch(error => console.log(error));
  // Start the express server
  const port = 12345;
  console.log("Starting the server on local port %d", port);
  const server = await startServer(port);
  console.log("Ready and serving the %s tiles at http://localhost:%s", mbtilesKey, port);
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
