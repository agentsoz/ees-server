read -r -d '' usage << EOF
usage: $0 [options]
  -net FILE   MATSim network file to read
  -outL FILE  File to store linestring based output in (.shp)
  -outP FILE  File to store polygon based output in (.shp)
  -crs CRS    Coordinate Reference System projection in EPSG format

Example usage:
matsimNetwork2ESRI.sh -net output_network.xml.gz -outl networkL.shp -outp networkP.shp -crs "EPSG:28355"
EOF

dir=`dirname "$0"`
ver=0.10.1
jar=$dir/matsim-$ver/matsim-$ver.jar
zipurl=https://github.com/matsim-org/matsim/releases/download/matsim-$ver/matsim-$ver.zip
class_links2esri=org.matsim.utils.gis.matsim2esri.network.Links2ESRIShape
netFile=
outputFileLs=
outputFileP=
crs=
commonWealth=true
while [ "$1" != "" ]; do
  case $1 in
    -net ) shift
      netFile=$1
      ;;
    -outl ) shift
      outputFileLs=$1
      ;;
    -outp ) shift
      outputFileP=$1
      ;;
    -crs ) shift
      crs=$1
      ;;
  esac
  shift
done

if [ "$netFile" == "" ] || [ "$outputFileLs" == "" ] | [ "outputFileP" == "" ] | [ "crs" == "" ] ; then
  echo "$usage"
  exit
fi

if [ ! -f $jar ] ; then
  printf "\nDid not find MATSim JAR ($jar) so will download it now\n"
  cmd="wget -O $dir/matsim.zip $zipurl"; echo $cmd; eval $cmd
  cmd="unzip -o $dir/matsim.zip"; echo $cmd; eval $cmd
  cmd="rm -f $dir/matsim.zip"; echo $cmd; eval $cmd
else
  printf "\nFound MATSim JAR ($jar) so will use it\n"
fi

printf "\nConverting MATSim network to ESRI Shapefile format now\n"
cmd="java -cp $jar $class_links2esri $netFile $outputFileLs $outputFileP $crs $commonWealth"
echo $cmd; eval $cmd
