const mapMinZoom = 3;
const mapMaxZoom = 6;
const coCor = 1.2;

const mapMaxResolution = 1.00000000;
const mapMinResolution = Math.pow(2, mapMaxZoom) * mapMaxResolution;

// Define the boundaries for the tileLayers.
const southWest = L.latLng(-5120.00000000, -5120.00000000);
const northEast = L.latLng(5120.00000000, 5120.00000000);
const bounds = L.latLngBounds(southWest, northEast);
// World boundaries for the map
const mapExtent = [-5120.00000000, -5120.00000000, 5120.00000000, 5120.00000000];
const tileExtent = [-5120.00000000, -5120.00000000, 5120.00000000, 5120.00000000];

// Two functions to fix the coordinates displayed.
// Lat needs to be reversed, else the coordinates are flipped.
function lat(cor) { return Math.round(cor*coCor)*-1; }
function lng(cor){ return Math.round(cor*coCor); }

const crs = L.CRS.Simple;
crs.transformation = new L.Transformation(1, -tileExtent[0], -1, tileExtent[3]);
crs.scale = function(zoom) { return Math.pow(2, zoom) / mapMinResolution; };
crs.zoom = function(scale) { return Math.log(scale * mapMinResolution) / Math.LN2; };


var worldsList = {};
var worldIDs = {};
var markerList = {};
var searchMarker = L.circleMarker();
var displayCoords = L.control.mousePosition({lngFirst: true, lngFormatter: lng, latFormatter: lat});


/* ***************************************************
// Simple function to g et the JSON data.
****************************************************** */
async function getJSON(url){
	const result = await fetch(url);
	return await result.json();
}

/* ***************************************************
// Creating a marker layerGroup based on path and name.
****************************************************** */
async function fillMarkers(path, name, markers){
	var markerGroup = L.layerGroup([]);
	var markersList = {};
	
	await getJSON(path).then( data => { markersList = data });
	// Itherate through the homeList and create proper layers for it.
	markersList.forEach( marker => {
		markerGroup.addLayer(
			L.circle([(marker.y*-1/coCor),(marker.x/coCor)], {
				color: marker.color,
				opacity: 0.6,
				fillOpacity: 0.6,
				weight: 2,
				radius: 15,
				title: marker.name
			}).bindTooltip(marker.name)
			.bindPopup(marker.name)
		);
	});
	
	markers[name] = markerGroup;
	return markers;
}

/* ***************************************************
// Process the worldData and return the objects.
****************************************************** */
async function processWorldData(worldData, map){
	// Define the world tileLayer.
	const world = L.tileLayer(worldData.path+'/{z}/{x}/{y}.png', {
		id: worldData.id,
		minZoom: mapMinZoom,
		maxZoom: mapMaxZoom,
		noWrap: true,
		tms: false,
		bounds: bounds
	});
	
	// Setup some variables for the markers.
	var spawnName = "Spawn";
	var spawn = L.layerGroup([]);
	var homes = L.layerGroup([]);
	var warps = L.layerGroup([]);
	var markers = {};
	
	// Get the spawn area for the current world.
	if (worldData.spawn != "")
	{
		// Create a rectangle for the spawn area.
		spawn = L.rectangle(
			[
				[(worldData.spawn.x1/coCor), (worldData.spawn.y1/coCor)],
				[(worldData.spawn.x2/coCor), (worldData.spawn.y2/coCor)]
			],
			{
				color: worldData.spawn.color,
				opacity: worldData.spawn.opacity,
				weight: worldData.spawn.weight
			}
		).bindTooltip(worldData.spawn.name)
		.bindPopup(worldData.spawn.name);
		
		// Set the mark with the correct spawn name.
		spawnName = worldData.spawn.name;
		markers[spawnName] = spawn;
	}
	
	// Get all homes for the current world.
	if (worldData.homes != ""){ markers = await fillMarkers(worldData.path + worldData.homes, "Homes", markers); }
	// Get all warps for the current world.
	if (worldData.warps != ""){ markers = await fillMarkers(worldData.path + worldData.warps, "Warps", markers); }
	
	// Get the default world based on worldData type.
	if (worldData.type == "default"){ map.addLayer(world); }
	
	// Return the data per world.
	return {"id":worldData.id,"data":world,"markers":markers}
}

/* ***************************************************
// Remove the searchMarker and add a new one.
****************************************************** */
function addSearchMarker(latlng, title, map){ 
	searchMarker.remove(); 
	searchMarker = L.circleMarker(latlng, {color:'red'});
	map.addLayer(searchMarker);
};


/* ***************************************************
// When switching a layer/map we need to change controls.
****************************************************** */
function updateMap(map, i){
	// First we'll remove the map.
	map.off();
	map.remove();
	
	// Define a new map.
	map = new L.Map('map', {
		maxZoom: mapMaxZoom,
		minZoom: mapMinZoom,
		crs: crs
	}).fitBounds([
		crs.unproject(L.point(mapExtent[2], mapExtent[3])),
		crs.unproject(L.point(mapExtent[0], mapExtent[1]))
	]);
	
	// Redefine the controls to give the proper marker options.
	var defaultControls = L.control.layers(worldsList, markerList[i.layer.options.id]);
	var defaultSearch = new L.Control.Search({
		layer: markerList[i.layer.options.id]["Homes"],
		initial: false,
		autoType: false,
		position:'topright',
		marker: false,
		moveToLocation: function(latlng, title, map){addSearchMarker(latlng, title, map)}
	});
	
	// Add the controls and layers to the map.
	map.addControl(defaultControls);
	map.addControl(defaultSearch);
	map.addControl(displayCoords);
	
	map.addLayer(worldsList[worldIDs[i.layer.options.id]]);
	map.addLayer(markerList[i.layer.options.id]["Homes"]);
	
	// Enable the on baselayerchange function (this) again.
	map.on('baselayerchange', function(i){ updateMap(map, i); });
}

/* ***************************************************
// Create the world map.
****************************************************** */
async function coreMap(){
	// Define the map.
	var map = new L.Map('map', {
		maxZoom: mapMaxZoom,
		minZoom: mapMinZoom,
		crs: crs
	}).fitBounds([
		crs.unproject(L.point(mapExtent[2], mapExtent[3])),
		crs.unproject(L.point(mapExtent[0], mapExtent[1]))
	]);
	
	// Itherate through the world config.
	// Create tileLayers for each world.
	// Add them to the worldsList.
	for (const worldData of worldsConfig){
		await processWorldData(worldData, map).then( world => {
			markerList[world.id] = world.markers;
			worldIDs[world.id] = worldData.name;
			worldsList[worldData.name] = world.data; 
		});
	};
	
	// Define the control layers for the worlds.
	var defaultControls = L.control.layers(worldsList, markerList[0]);
	var defaultSearch = new L.Control.Search({
		layer: markerList[0]["Homes"],
		initial: false,
		autoType: false,
		position:'topright',
		marker: false,
		moveToLocation: function(latlng, title, map){addSearchMarker(latlng, title, map)}
	});
	
	// Add the controls to the map.
	map.addControl(defaultControls);
	map.addControl(defaultSearch);
	map.addControl(displayCoords);
	
	// Display the proper things when switching layers.
	map.on('baselayerchange', function(i){ updateMap(map, i); });
}

// Setup the map after DOMContentLoaded
document.addEventListener('DOMContentLoaded', (event) => {
	coreMap();
});