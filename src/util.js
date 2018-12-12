const fs = require('fs');
const download = require('download');

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

