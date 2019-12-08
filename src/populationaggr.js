const fs = require('fs');
import { downloadResource } from './util';

export const POPULATION_DIR = "populations";

if (!fs.existsSync(POPULATION_DIR))
  fs.mkdirSync(POPULATION_DIR);

export async function loadAllPopulations(list) {
  var population_dict = {};
  for (var p of list) {
    const file = p.display_name.replace(/[^a-z0-9]/gi, '_') + ".xml.gz";
    p.file = POPULATION_DIR + "/" + file
    if (!fs.existsSync(p.file)) {
      console.log("Fetching population %s from %s", file, p.url);

      // Fetch geojson from cloud storage given url and destination
      try {
        await downloadResource(p.url, POPULATION_DIR, file)
        population_dict[p.display_name] = p;
      } catch(e) {
        console.log(error);
      }
    } else {
      population_dict[p.display_name] = p;
      console.log("Found %s so will use it",p.file);
    }
  }
  return population_dict;
}
