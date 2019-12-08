const fs = require('fs');
import { downloadResource } from './util';

export const PHOENIX_DIR = "phoenix";

if (!fs.existsSync(PHOENIX_DIR))
  fs.mkdirSync(PHOENIX_DIR);

export async function loadAllFires(fires) {
  var phoenix_dict = {};
  for (var fire of fires) {
    const file = fire.display_name.replace(/[^a-z0-9]/gi, '_') + ".json";
    fire.file = PHOENIX_DIR + "/" + file;
    if (!fs.existsSync(fire.file)) {
      console.log("Fetching phoenix fire %s from %s", file, fire.url);

      // Fetch geojson from cloud storage given url and destination
      try {
        await downloadResource(fire.url, PHOENIX_DIR, file)
        phoenix_dict[fire.display_name] = fire;
      } catch(e) {
        console.log(error);
      }

    } else {
      phoenix_dict[fire.display_name] = fire;
      console.log("Found %s so will use it",fire.file);
    }
  }
  return phoenix_dict;
}
