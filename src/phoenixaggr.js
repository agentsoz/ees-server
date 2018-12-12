const fs = require('fs');
import { downloadResource } from './util';

export const PHOENIX_DIR = "phoenix";

if (!fs.existsSync(PHOENIX_DIR))
  fs.mkdirSync(PHOENIX_DIR);

// where we will store all tile sources. Will load every mbtiles region for now. Will memory be an issue?
export async function loadAllFires(fires) {
  for (var key in fires) {
    // Download the mbtiles ready for loading
    var file = key;
    var url = fires[key];
    if (!fs.existsSync(PHOENIX_DIR+"/"+file)) {
      console.log("Fetching phoenix fire %s from %s", file, url);

      // Fetch mbtiles from cloud storage given url and destination
      await downloadResource(url, PHOENIX_DIR, file).catch(error => console.log(error));
    } else {
      console.log("Found %s so will use it",file);
    }
  }
}
