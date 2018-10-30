const globalMercator = require('global-mercator')
const tilelive = require('@mapbox/tilelive');
const MBTiles = require('@mapbox/mbtiles').registerProtocols(tilelive);
const fs = require('fs');
const download = require('download');
var cors = require('cors')

var dir = ".";

// where we will store all tile sources. Will load every mbtiles region for now. Will memory be an issue?
var tilesources = {};

export async function loadAllTiles(tiles) {
  for (var key in tiles) {
    // Download the mbtiles ready for loading
    var mbtilesFile = key+".mbtiles";
    var mbtilesUrl = tiles[key];
    if (!fs.existsSync(mbtilesFile)) {
      console.log("Fetching MBTiles DB %s from %s", mbtilesFile, mbtilesUrl);
      await getTilesDb(mbtilesUrl, mbtilesFile).catch(error => console.log(error));
    } else {
      console.log("Found %s so will use it",mbtilesFile);
    }
  }

  // We have downloaded all regions
  const mbtilesList = await getList();

  // load them into our tilesources datastructure
  for (var mbtilesKey in mbtilesList) {
    console.log("Loading %s", mbtilesKey);
    tilesources[mbtilesKey] = await loadTilesDb(mbtilesList[mbtilesKey]);
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

/**
 * Load tiles into memory
 */
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

export function getTile(region, z, x, y) {
  return new Promise(function(resolve, reject){
    // check the source string is a valid one
    if (tilesources.hasOwnProperty(region)) {
      // grab the tile from this region
      var source = tilesources[region];
      source.getTile(z, x, y, function(err, tile, headers) {
        if (err) {
          reject(err);
        } else {
          resolve([headers, tile]);
        }
      });
    } else { // region is invalid or hasn't been downloaded
      reject("Provided region is invalid.")
    }
  });
}

function getList() {
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
