dir=$(dirname "$0")

matsim2esri=$dir/matsimNetwork2Shape.sh
esri2json=$dir/shapefile2json.py

function toJson() {
  prefix=$1
  crs=$2
  cmd="rm -f $dir/${prefix}/${prefix}L.json; $esri2json -infile $dir/${prefix}/${prefix}L.shp -outfile $dir/${prefix}/${prefix}L.json -inCRS $crs -outCRS 'EPSG:4326'"
  echo $cmd; eval $cmd
  cmd="rm -f $dir/${prefix}/${prefix}P.json; $esri2json -infile $dir/${prefix}/${prefix}P.shp -outfile $dir/${prefix}/${prefix}P.json -inCRS $crs -outCRS 'EPSG:4326'"
  echo $cmd; eval $cmd

}

function build() {
  name=$1
  projection=$2
  url=$3
  mkdir -p $dir/$name
  if [ ! -f $dir/$name/$name.xml.gz ] ; then
    printf "\nDid not find MATSim network ($dir/$name/$name.xml.gz) so will download it now\n"
    cmd="wget --no-verbose -O $dir/$name/$name.xml.gz $url"
    echo $cmd; eval $cmd
  else
    printf "\nFound MATSim network ($dir/$name/$name.xml.gz) so will use it\n"
  fi

  cmd="$matsim2esri -net $dir/$name/$name.xml.gz -outl $dir/$name/${name}L.shp -outp $dir/$name/${name}P.shp -crs 'EPSG:4326'"
  echo $cmd; eval $cmd

  printf "\nConverting MATSim network shapefiles ($dir/$name/*.shp) to GeoJSON now\n"
  toJson $name $projection
}

# Northern Cluster Shires network JSON
build \
  "loddon_mallee_northern_cluster_shires_network" \
  "EPSG:28355" \
  "https://github.com/agentsoz/ees/raw/master/scenarios/loddon-mallee-northern-cluster-shires/loddon_mallee_northern_cluster_shires_network.xml.gz"

# Mount Alexander Shire network JSON
build \
  "mount_alexander_shire_network" \
  "EPSG:28355" \
  "https://github.com/agentsoz/ees/raw/master/scenarios/mount-alexander-shire/mount_alexander_shire_network_2018.xml.gz"

# Surf Coast Shire network JSON
build \
  "surf_coast_shire_network" \
  "EPSG:32754" \
  "https://github.com/agentsoz/ees/raw/master/scenarios/surf-coast-shire/surf_coast_shire_network.xml.gz"
