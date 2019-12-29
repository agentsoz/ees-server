const fs = require('fs');
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

