const fs = require('fs');
const tarball = require('tarball-extract');

import {
  searchRecursive,
  parseOutputEventsXml,
  parseOutputNetworkXml,
  buildEventFrames
} from './util';

export const OUTPUT_DIR = "output";

if (!fs.existsSync(OUTPUT_DIR))
  fs.mkdirSync(OUTPUT_DIR);

function downloadOutput(url, folder, archive) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(archive)) {
      console.log("Downloading output %s from %s", folder, url);
      tarball.extractTarballDownload(
        url,
        archive,
        folder,
        {},
        function(err, result) {
          if (err)
            reject(err);
          else
            resolve(result);
        }
      );
    } else if (!fs.existsSync(folder)) {
      // we have the archive, has it been extracted?
      console.log("Found archive %s, extracting to %s", archive, folder);
      tarball.extractTarball(
        archive,
        folder,
        function(err) {
          if (err)
            reject(err);
          else
            resolve({});
        }
      );
    } else {
      console.log("It seems we have already extracted archive %s to folder %s", archive, folder);
      resolve({});
    }
  });
}

// basic load output functionality. Downloads a targz from a url, extracts
// and searches for an events.xml.gz and network.xml.gz
export async function loadAllOutput(outputdict) {
  var outputs = {};
  for (var key in outputdict) {
    var o = outputdict[key];
    const outputname = key.replace(/[^a-z0-9]/gi, '_');
    o.folder = OUTPUT_DIR + "/" + outputname;
    o.file = o.folder + "/" + outputname + ".json"; // written to this file is the result of buildEventFrames
    if (fs.existsSync(o.file)) {
      console.log("Found a processed output file %s", o.file);
      outputs[key] = o.file;
      continue; // already processed
    }

    // an output has been added and must be downloaded
    try {
      const archive = OUTPUT_DIR + '/' + o.archive;
      // download output archive
      await downloadOutput(o.download, o.folder, archive);

      // find events and network xml.gz
      var eventsfile = searchRecursive(o.folder, "output_events.xml.gz");
      var networkfile = searchRecursive(o.folder, "output_network.xml.gz");
      if (eventsfile.length > 0 && networkfile.length > 0) {
        console.log("Found an events file in %s: %s", o.folder, eventsfile[0]);
        console.log("Found a network file in %s: %s", o.folder, networkfile[0]);

        // get both events and network
        const events = await parseOutputEventsXml(eventsfile[0]);
        const network = await parseOutputNetworkXml(networkfile[0]);

        // build frames and save to output folder as json
        var frames = buildEventFrames(events, network);

        fs.writeFileSync(o.file, JSON.stringify(frames));
        console.log("Output frames %s written for %s.", o.file, outputname);
        outputs[key] = o.file;
      } else {
        console.log("Could not find an events or network xml in output %s, skipping.", o.folder);
      }
    } catch(e) {
      console.log("Failed to download output %s from %s, skipping.", outputname, o.download);
      console.log(e);
    }
  }
  return outputs;
}
