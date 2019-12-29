const fs = require('fs');
const path = require('path');
const download = require('download');

const reproj = require('reproject');
const proj4 = require('proj4');
const epsg = require('epsg');

const zlib = require('zlib');
const XML = require('pixl-xml');

proj4.defs([
  [
    "EPSG:28355",
    "+proj=utm +zone=55 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
  ],
  [
    "EPSG:32754",
    "+proj=utm +zone=54 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs"
  ]
]);

export function searchRecursive(dir, pattern) {
  // This is where we store pattern matches of all files inside the directory
  var results = [];

  // Read contents of directory
  fs.readdirSync(dir).forEach(function (dirInner) {
    // Obtain absolute path
    dirInner = path.resolve(dir, dirInner);

    // Get stats to determine if path is a directory or a file
    var stat = fs.statSync(dirInner);

    // If path is a directory, scan it and combine results
    if (stat.isDirectory()) {
      results = results.concat(searchRecursive(dirInner, pattern));
    }

    // If path is a file and ends with pattern then push it onto results
    if (stat.isFile() && dirInner.endsWith(pattern)) {
      results.push(dirInner);
    }
  });

  return results;
};

/**
 * download a given resource to a destination folder
 */
export function downloadResource(url, dir, dest) {
  return new Promise(function(resolve, reject){
    var err = null;
    download(url).then(data => {
      try {
        fs.writeFileSync(dir+"/"+dest, data);
        resolve(dest);
      } catch(error) {
        reject(err);
      }
    });
  });
}

export function parseOutputEventsXml(eventsfile) {
  return new Promise((resolve, reject) => {

    try {
      console.log("Attempting to parse events XML...");
      fs.readFile(eventsfile, function (zerror, zbuf) {
        if (zerror) reject(zerror);
        zlib.gunzip(zbuf, function (error, buf) {
          if (error) reject(error);

          // access data as buffer
          var jsonObj = XML.parse(buf.toString());
          console.log("XML Events parsed");

          resolve(jsonObj);
        });
      });
    } catch(error) {
      reject(err);
    }
  });
}

export function parseOutputNetworkXml(networkfile) {
  return new Promise((resolve, reject) => {

    try {
      console.log("Attempting to parse network XML...");
      fs.readFile(networkfile, function (zerror, zbuf) {
        if (zerror) reject(zerror);
        zlib.gunzip(zbuf, function (error, buf) {
          if (error) reject(error);

          // access data as buffer
          var jsonObj = XML.parse(buf.toString());
          console.log("XML network parsed");

          resolve(jsonObj);
        });
      });
    } catch(error) {
      reject(err);
    }
  });
}

// param: array length two, events json and network json produced from output xml
export function buildEventFrames(eventsjson, network) {
  var nodes = {};
  var links = {};

  // attr
  var crs;
  if (Array.isArray(network.attributes.attribute)) {
    for(const n of network.attributes.attribute) {
      if (n.name == 'coordinateReferenceSystem') {
        crs = n._Data;
        break;
      }
    }
  } else if (network.attributes.attribute.name == 'coordinateReferenceSystem') {
    crs = network.attributes.attribute._Data
  } else {
    crs = 'EPSG:4326';
  }
  console.log("Found CRS for xml network: %s", crs);

  // nodes
  for(const n of network.nodes.node) {
    nodes[n.id] = [n.x, n.y];
  }

  // links
  for(const l of network.links.link) {
    // we are filtering events on entered link, so we only care about any given
    // link fromnode
    links[l.id] = l.from;
  }

  // events
  const events = eventsjson.event;
  var frames=[];
  var framesize=60; //seconds
  // the vehicle must be the key, in order to track where each car goes
  var j=0;
  var vehicletracker = {}; // for the current frame
  for(var i=0; i < 24 * 60 * 60 / framesize; i++) {
    while(j<events.length && i * framesize > parseInt(events[j].time)) {
      if (events[j].type == "entered link")
        vehicletracker[events[j].vehicle] = events[j].link;
      else if (events[j].type == "PersonLeavesVehicle")
        delete vehicletracker[events[j].vehicle];
      j++;
    }

    // we have reached the end of the timestep, build a frame
    var f={}; // frame
    for (const v in vehicletracker) {
      if (vehicletracker[v] in f) {
        f[vehicletracker[v]]++;
      } else {
        f[vehicletracker[v]] = 1;
      }
    }
    
    var features = [];
    for(const l in f) { // for each link in our frame
      const n = nodes[links[l]];
      var x, y;
      [x, y] = proj4(
        crs,
        "EPSG:4326",
        [parseFloat(n[0]),parseFloat(n[1])]);
      var feature = {
        'type':'Feature',
        'properties': {
          'v': f[l]
        },
        'geometry': {
          'type': 'Point',
          'coordinates':[x,y]
        }
      };
      features.push(feature);
    }
    frames.push({'type':'FeatureCollection',
      'features':features});
  }

  return frames;
}

/**
 * download a given resource to a destination folder
 */
export function downloadPopulationXml(url, dir, dest, crs) {
  return new Promise(function(resolve, reject){
    var err = null;
    download(url).then(zbuf => {
      try {
        // unzip population archive
        zlib.gunzip(zbuf, function (error, buf) {
          if (error) throw error;
          // Access data here through result as a Buffer
          var jsonObj = XML.parse(buf.toString());

          var plans = [];

          // now loop through and build the required population file
          for(const p of jsonObj.person) {
            for(const a of p.plan.activity) {
              var x, y;
              [x, y] = proj4(crs,"EPSG:4326",[parseFloat(a.x),parseFloat(a.y)]);

              var end_hr = Date.parse(
                '1970-01-01T' +
                ('end_time' in a ? a.end_time : '23:59:59') +
                'Z'
              ) / 3600000;
              plans.push({'id':p.id,'type':a.type,'x':x, 'y':y, 'end_hr': end_hr});
            }
          }

          // sort by end_time
          plans.sort((a, b) => (a.end_hr > b.end_hr) ? 1 : -1);

          // write to json file
          fs.writeFileSync(dir+"/"+dest, JSON.stringify(plans));

          console.log("Generated successfully: " + dest );
          resolve(dest);
            
        })
        //fs.writeFileSync(dir+"/"+dest, data);
      } catch(error) {
        reject(err);
      }
    });
  });
}

/**
 * download geojson, reproject coordinates, and put into a destination folder
 */
export function downloadGeojson(url, dir, dest) {
  return new Promise(function(resolve, reject){
    var err = null;
    download(url).then(buf => {
      var json = JSON.parse(buf.toString());
      json = reproj.toWgs84(json, undefined, epsg);
      try {
        fs.writeFileSync(dir+"/"+dest, JSON.stringify(json));
        resolve(dest);
      } catch(error) {
        reject(err);
      }
    });
  });
}

