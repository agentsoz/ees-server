const fs = require('fs');
import { downloadPopulationXml } from './util';

export const POPULATION_DIR = "populations";

if (!fs.existsSync(POPULATION_DIR))
  fs.mkdirSync(POPULATION_DIR);

export async function loadAllPopulations(list) {
  var population_dict = {};
  for (var p of list) {
    const file = p.display_name.replace(/[^a-z0-9]/gi, '_') + ".json";
    p.file = POPULATION_DIR + "/" + file
    if (!fs.existsSync(p.file)) {
      console.log("Generating population %s from %s", file, p.url);

      // Fetch geojson from cloud storage given url and destination
      try {
        await downloadPopulationXml(p.url, POPULATION_DIR, file, p.crs)
        population_dict[p.display_name] = p;
      } catch(e) {
        console.log("Failed to generate population %s from %s", file, p.url);
        console.log(e);
      }
    } else {
      population_dict[p.display_name] = p;
      console.log("Found %s so will use it",p.file);
    }
  }
  return population_dict;
}
