const globalMercator = require('global-mercator')
const tilelive = require('@mapbox/tilelive');
const MBTiles = require('@mapbox/mbtiles').registerProtocols(tilelive);
const fs = require('fs');
const download = require('download');
var cors = require('cors')

var dir = ".";

export async function getAllTiles(tiles) {
  for (var key in tiles) {
    var mbtilesFile = key+".mbtiles";
    var mbtilesUrl = tiles[key];
    if (!fs.existsSync(mbtilesFile)) {
      console.log("Fetching MBTiles DB %s from %s", mbtilesFile, mbtilesUrl);
      await getTilesDb(mbtilesUrl, mbtilesFile).catch(error => console.log(error));
    } else {
      console.log("Found %s so will use it",mbtilesFile);
    }
  }
}

/**
 * Fetch mbtiles from cloud storage given url and destination
 */
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

export function loadTilesDb(url) {
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

export function getList() {
  return new Promise(function(resolve, reject){
    tilelive.list(dir, function(err, data){
      if (err) {
        reject(err);
      } else {
        console.log("Found the following MBTiles files in dir '%s':\n%s",dir,JSON.stringify(data, null, 2));
        resolve(data);
      }
    });
  });
}
