const globalMercator = require('global-mercator')
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
var cors = require('cors');
var pythonShell = require('python-shell');
var path = require('path');
var xml2js = require('xml2js');
const { exec } = require('child_process');

import { loadAllTiles, getTile } from './tilesaggr'
import { PHOENIX_DIR, loadAllFires } from './phoenixaggr'
import { connectRedisClient,
  loadPopulation,
  getPopulationStream,
  getOutputNetwork,
  getAgentsStartingPos,
  getAgentsEvents } from './redis'

/**
 * MATSim Networks
 */
var tiledict = {};
// Shape name: mount_alexander_shire_networkP
tiledict["mount_alexander_shire_network"] = {
  region: "mount-alexander-shire",
  download: "https://cloudstor.aarnet.edu.au/plus/s/oh23zw4a0Vy4PNQ/download"
}
// Shape name: surf_coast_shire_networkP
tiledict["surf_coast_shire_network"] = {
  region: "surf-coast-shire",
  download: "https://cloudstor.aarnet.edu.au/plus/s/JK7STxWGKI2jNe4/download"
}

/**
 * Phoenix Fires
 */
var phoenixdict = {};
phoenixdict["20181109_mountalex_evac_ffdi50a_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi50a_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi50b_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi50b_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi50c_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi50c_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi50d_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi50d_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi75a_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi75a_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi75b_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi75b_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi75c_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi75c_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi75d_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi75d_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi100b_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi100b_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi100c_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi100c_grid.shp.json"
phoenixdict["20181109_mountalex_evac_ffdi100d_grid.shp.json"] =
  "https://cloudstor.aarnet.edu.au/plus/s/W0lk21g3Ry9Wnqs/download?path=%2Fphoenix%2Fmount-alexander-shire&files=20181109_mountalex_evac_ffdi100d_grid.shp.json"

function startServer(port) {
  return new Promise(function (resolve, reject) {
    var app = express();
    app.use(cors());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.listen(port, resolve(app));
  });
}

async function main3() {
  // Download all tiles from cloud storage if necessary, and load them into memory
  loadAllTiles(tiledict);

  // download all phoenix fires if necessary
  loadAllFires(phoenixdict);

  // Start the express server
  const port = 12345;
  console.log("Starting the server on local port %d", port);
  const server = await startServer(port);
  console.log("Ready and serving the tiles at http://localhost:%s", port);

  // initialise connection to redis server and load population to redis
  connectRedisClient();
  loadPopulation();
  getOutputNetwork();

  // Set up some HTTP GET handlers
  // Serve index.html if nothing specified
  server.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
  });
  // Don't have a favicon
  server.get('/favicon.ico', (req, res) => res.status(204));

  // wake the server
  server.get('/wake/please', function (req, res) {
    res.send("OK");
  });

  // Get population sets from redis based on activity
  server.post('/get-population', function (req, res) {
    getPopulationStream(req.body.key).pipe(res);
  });

  server.get('/agents-start-pos', function (req, res) {
    getAgentsStartingPos().pipe(res);
  });

  server.post('/agents-events', function (req, res) {
    console.log(req.body.eventGroup);
    getAgentsEvents(req.body.eventGroup).pipe(res);
  });

  // save settings from UI and generate config,json file
  server.post('/save-settings', function (req, res) {
    fs.writeFileSync("./../scripts/config.json", JSON.stringify(req.body.config, null, 4), function (err) {
      if (err) {
        console.log(err);
      }
    }
    );

    var options = {
      mode: "text",
      scriptPath: "./../scripts/",
      args: [
        "-c",
        "./../scripts/config.json",
        "-o",
        "./../scripts/output/surf-coast-shire/",
        "-t",
        "./../scripts/templates/",
        "-n",
        req.body.simulationName,
        "-v"
      ]
    };

    var results = [];

    pythonShell.PythonShell.run("build-scenario-v2.py", options, function (
      err,
      res1
    ) {
      if (err && err.exitCode != 0)
        console.log("Could not build simulation1: " + err);
      if (res1) results.push(res1);
    });

    res.send("File Saved!");
  });

  server.post("/create-simulation", function (req, res) {
    var scenarioPath = "./../scripts/output/surf-coast-shire/" + req.body.simulationName.simulationName + "/";
    var userDir = "./../scripts/output/surf-coast-shire/";
    var dist = "./../../ees/target/ees-2.1.1-SNAPSHOT.jar";

    var fileMain = path.join(scenarioPath, "ees.xml");
    var fileLog = path.join(scenarioPath, "scenario.log");
    var fileJillLog = path.join(scenarioPath, "jill.log");
    var fileJillOut = path.join(scenarioPath, "jill.out");
    var fileSafeline = path.join(scenarioPath, "safeline.%d%.out");

    // Read number of agents from config xml
    var parser = new xml2js.Parser();

    fs.readFile(fileMain, function (err, data) {
      parser.parseString(data, function (err, res2) {
        if (err && err.exitCode != 0)
          console.log("Could not build simulation: " + err);

        // Run the simulation

        var cmd =
          "java -Xmx4g -Xms4g -cp " +
          dist +
          " io.github.agentsoz.ees.Run" +
          " --config " +
          fileMain;

        console.log("");
        console.log(cmd);
        console.log("");

        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            
            res.send(error.message);
          }
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);

          res.send("Success!!");
        });
      });
    });
  });

  // Serve the requested file (needed to get style.json)
  server.get('/:file', function (req, res) {
    res.sendFile(__dirname + '/' + req.params.file);
  });
  // Serve the requested phoenix file (needed to get style.json)
  server.get('/' + PHOENIX_DIR + '/:file', function (req, res) {
    res.sendFile(__dirname + '/' + PHOENIX_DIR + '/' + req.params.file);
  });

  // Handle something like: /tiles/matsim/zoom/lon/lat
  server.get('/matsim-tiles/:layer/:z/:x/:y.pbf', function (req, res) {
    const x = parseInt(req.params.x);
    const y = parseInt(req.params.y);
    const z = parseInt(req.params.z);
    console.log("zxy[%d,%d,%d] ", z, x, y);
    getTile(req.params.layer, z, x, y).then(function (data) {
      const headers = data[0];
      const img = data[1];
      console.log(headers);
      res.set(headers);
      res.send(img);
    }, function (err) {
      console.log(err);
      res.status(404)
      res.send(err.message);
      console.log(err.message);
    });
  });
  // Catch-all for the rest
  server.get('*', function (req, res) {
    res.send('what???', 404);
  });

}

main3();
