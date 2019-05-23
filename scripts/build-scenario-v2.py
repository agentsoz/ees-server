#!/usr/bin/env python

# Example run:
# python3 build-scenario-v2.py -c config.json -t scenarios/templates/ -o scenarios/surf-coast-shire -n town -v
# Will create folder scenarios/surf-coast-shire/town.


import sys
import os
import argparse
import json
import subprocess
from subprocess import call
# ----------------------------------------------------------------------------
# Globals and Defaults
# ----------------------------------------------------------------------------

proportionRelatives = 0.3  # hardwired, fix me
maxMtrsToRelatives = 1000  # hardwired, fix me


# ----------------------------------------------------------------------------
# Util functions for argparse
# ----------------------------------------------------------------------------
def is_valid_file(arg):
    if not os.path.exists(arg):
        msg = "%s does not exist" % arg
        raise argparse.ArgumentTypeError(msg)
    else:
        return arg


def is_valid_dir(arg):
    if not os.path.isdir(arg):
        msg = "%s does not exist" % arg
        raise argparse.ArgumentTypeError(msg)
    else:
        return arg


def new_dir(arg):
    if os.path.exists(arg):
        msg = "%s already exists; will not overwrite" % arg
        raise argparse.ArgumentTypeError(msg)
    else:
        os.makedirs(os.path.dirname("output"), exist_ok=True)
        return arg


def parse_args():
    parser = argparse.ArgumentParser(description='Builds a bushfire simulation scenario using web UI produced JSON')
    parser.add_argument('-c', '--config',
                        help='path to JSON file (created by bushfire scenario builder UI)',
                        required=True,
                        type=is_valid_file)
    parser.add_argument('-o', '--outdir',
                        help='output directory to use for creating subdir with scenario files',
                        required=True,
                        type=is_valid_dir)
    parser.add_argument('-t', '--templatesdir',
                        help='path to the scenario templates directory',
                        required=True,
                        type=is_valid_dir)
    parser.add_argument('-n', '--name',
                        help='scenario name used for naming files and directories',
                        required=True)
    parser.add_argument('-v', '--verbose',
                        help='be verbose',
                        action='store_true',
                        required=False)
    return parser.parse_args()


# ----------------------------------------------------------------------------
# Write file functions
# ----------------------------------------------------------------------------

def write_file(template, output, replacements):
    with open(template) as infile, open(output, 'w') as outfile:
        for line in infile:
            for src, target in replacements.items():
                line = line.replace(src, target)
            outfile.write(line)


# ----------------------------------------------------------------------------
# START
# ----------------------------------------------------------------------------

# parse command line arguments
args = parse_args()

# set verbosity
if args.verbose is not None:
    def log(*args):
        # Print each argument separately so caller doesn't need to
        # stuff everything to be printed into a single string
        for arg in args:
            print(arg),
        print
else:
    log = lambda *a: None  # do-nothing function
# values
prefix = args.name
outdir = os.path.join(args.outdir, prefix)

# Template Files
t_ees = os.path.join(args.templatesdir, "t_ees.xml")
t_scenario_main = os.path.join(args.templatesdir, "t_scenario_main.xml")
t_scenario_fire = os.path.join(args.templatesdir, "scenario_fire.json")

# Output files
o_ees = os.path.join(outdir, "ees.xml")
o_scenario_main = os.path.join(outdir, "scenario_main.xml")

# check before proceeding
if os.path.exists(outdir):
    sys.exit("\nERROR: '%s' already exists; will not proceed" % outdir)

# create the output dir
os.makedirs(outdir)

# load the json input
log("loading input JSON config file '%s'" % args.config)
with open(args.config) as data_file:
    data = json.load(data_file)

# ----------------------------------------------------------------------------
# Create replacements and write to output files
# ----------------------------------------------------------------------------

# ees.xml
ees_replacements = {
    # main config template replacements
    '${randomSeed}': data['ees'][0]['global'][0]['randomSeed'],
    '${crs}': data['ees'][0]['global'][0]['crs'],
    '${startHHMM}': data['ees'][0]['global'][0]['startHHMM'],

    '${jPlanSelectionPolicy}': data['ees'][0]['bdi'][0]['jPlanSelectionPolicy'],
    '${jAgents}': data['ees'][0]['bdi'][0]['jAgents'],
    '${jLogLevel}': data['ees'][0]['bdi'][0]['jLogLevel'],
    '${jLogFile}': data['ees'][0]['bdi'][0]['jLogFile'],
    '${jOutFile}': data['ees'][0]['bdi'][0]['jOutFile'],

    '${outputDir}': data['ees'][0]['matsim'][0]['outputDir'],
    '${configXml}': data['ees'][0]['matsim'][0]['configXml'],
    '${maxDistanceForFireVisual}': data['ees'][0]['matsim'][0]['maxDistanceForFireVisual'],
    '${maxDistanceForSmokeVisual}': data['ees'][0]['matsim'][0]['maxDistanceForSmokeVisual'],
    '${fireAvoidanceBufferForVehicles}': data['ees'][0]['matsim'][0]['fireAvoidanceBufferForVehicles'],
    '${fireAvoidanceBufferForEmergencyVehicles}': data['ees'][0]['matsim'][0][
        'fireAvoidanceBufferForEmergencyVehicles'],
    '${congestionEvaluationInterval}': data['ees'][0]['matsim'][0]['congestionEvaluationInterval'],
    '${congestionToleranceThreshold}': data['ees'][0]['matsim'][0]['congestionToleranceThreshold'],
    '${congestionReactionProbability}': data['ees'][0]['matsim'][0]['congestionReactionProbability'],

    '${ignitionHHMM}': data['ees'][0]['phoenix'][0]['ignitionHHMM'],
    '${fireGeoJson}': data['ees'][0]['phoenix'][0]['fireGeoJson'],
    '${smokeGeoJson}': data['ees'][0]['phoenix'][0]['smokeGeoJson'],
}
write_file(t_ees, o_ees, ees_replacements)

# scenario_main.xml
scenario_main_replacements = {
    # main config template replacements
    '${matsimfile}': data['scenario_main'][0]['matsimfile'],

    '${name}': data['scenario_main'][0]['firefile'][0]['name'],
    '${coordinates}': data['scenario_main'][0]['firefile'][0]['coordinates'],
    '${format}': data['scenario_main'][0]['firefile'][0]['format'],

    '${geo_name}': data['scenario_main'][0]['geographyfile'][0]['geo_name'],

    '${proportion}': data['scenario_main'][0]['trafficBehaviour'][0]['proportion'],
    '${radiusInMtrs}': data['scenario_main'][0]['trafficBehaviour'][0]['radiusInMtrs'],

    '${start}': data['scenario_main'][0]['evacuationTiming'][0]['start'],
    '${peak}': data['scenario_main'][0]['evacuationTiming'][0]['peak'],

    '${bdiagents}': data['scenario_main'][0]['bdiagents'],
}
write_file(t_scenario_main, o_scenario_main, scenario_main_replacements)


call('java  -Xmx4g -Xms4g -cp ../../ees/target/ees-2.1.1-SNAPSHOT.jar  io.github.agentsoz.ees.Run --config ' + outdir + '/ees.xml', shell=True)