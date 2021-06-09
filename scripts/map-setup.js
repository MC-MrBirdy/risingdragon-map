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
function lng(cor) { return Math.round(cor*coCor); }

const crs = L.CRS.Simple;
crs.transformation = new L.Transformation(1, -tileExtent[0], -1, tileExtent[3]);
crs.scale = function(zoom) { return Math.pow(2, zoom) / mapMinResolution; };
crs.zoom = function(scale) { return Math.log(scale * mapMinResolution) / Math.LN2; };

var worldsList = {};
var worldIDs = {};
var markerList = {};
var searchMarker = L.circleMarker();
var displayCoords = L.control.mousePosition({lngFirst: true, lngFormatter: lng, latFormatter: lat});
var checkShow = new URL(window.location.href).searchParams.get("show");


/* ***************************************************
// Simple function to get the JSON data.
****************************************************** */
async function getJSON(url) {
	const result = await fetch(url);
	return await result.json();
}

/* ***************************************************
// Correct the game coordinates to map coordinates.
****************************************************** */
function fixCoords(latlng) {
	// If the first element has two items,
	// we assume it to be coordinates for an rectangle.
	if (latlng[0].length == 2) {
		latlng[0] = fixCoords(latlng[0]);
		latlng[1] = fixCoords(latlng[1]);
	// Else we correct the coordinates as is.
	// Since the game coordinates aren't like the map.
	// We need to correct them (coCor) and swap them.
	} else {
		var tmpX = latlng[0]/coCor;
		var tmpY = latlng[1]*-1/coCor;
		latlng[1] = tmpX;
		latlng[0] = tmpY;
	}
	
	return latlng;
}

/* ***************************************************
// Loop through the latlngs array to fix the coordinates.
****************************************************** */
function loopLatlngs(latlngs) {
	for (var latlng of latlngs) { latlng = fixCoords(latlng); }
	return latlngs;
}

/* ***************************************************
// Correct the game coordinates for latlngs to map coordinates.
****************************************************** */
function fixLatlngs(latlngs) {
	if (latlngs[0].length >= 2 && latlngs.length == 2) {
		latlngs[0] = loopLatlngs(latlngs[0]);
		latlngs[1] = loopLatlngs(latlngs[1]);
	} else {
		latlngs = loopLatlngs(latlngs);
	}
	return latlngs;
}

/* ***************************************************
// Create a shape based on the arguments.
****************************************************** */
function getShape(shape) {
	var returnShape;
	
	switch (shape["shape"]) {
		default:
		case "circle":
			returnShape = L.circle(fixCoords(shape["latlng"]), {
				color: shape["color"],
				opacity: shape["opacity"],
				fillOpacity: shape["opacity"],
				weight: shape["weight"],
				radius: shape["radius"],
				title: shape["name"]
			});
			break;
		case "rectangle":
			returnShape = L.rectangle(
				[fixCoords(shape["latlng"])],
				{
					color: shape["color"],
					opacity: shape["opacity"],
					weight: shape["weight"],
					title: shape["name"]
				}
			);
			break;
		case "polygon":
			returnShape = L.polygon(
				fixLatlngs(shape["latlngs"]), 
				{
					color: shape["color"],
					title: shape["name"]
				}
			);
			break;
	}
	return returnShape;
}

/* ***************************************************
// Creating a marker layerGroup based on path and name.
****************************************************** */
async function fillMarkers(worldData, list, markers) {
	var path = worldData.path + list.path
	var markerGroup = L.layerGroup([]);
	var markersList = {};
	var alterDataSets = [];	
	
	// Check if there are alterations.
	// If so load them.
	if (worldData.alter && 
		worldData.alter[list.name] &&
		checkShow == "alter") {
		for (const alter of worldData.alter[list.name]) {
			var alterPath = worldData.path + alter;
			await getJSON(alterPath).then( data => { alterDataSets = alterDataSets.concat(data) });
		}
	}
	
	// Get the marker data.
	await getJSON(path).then( data => { markersList = data });

	// Itherate through the homeList and create proper layers for it.
	for (const marker of markersList) {
		var shape = {
			"name" : (marker.name) ? marker.name : "unidentified",
			"shape" : (marker.shape) ? marker.shape : "circle",
			"weight" : (marker.weight>=0) ? marker.weight : 2,
			"radius" : (marker.radius>=0) ? marker.radius : 15,
			"opacity" : (marker.opacity>=0) ? marker.opacity : 0.5,
			"color" : (marker.color) ? marker.color : "red",
			"latlngs" : (marker.latlngs) ? marker.latlngs : [],
			"latlng" : (marker.latlng) ? marker.latlng : []
		};
		
		// First split the name if needed.
		// Than search for the correct alterData set.
		var firstName = marker.name.split(" - ")[0];
		var alterData = alterDataSets.filter(obj => { return obj.name.toLowerCase() == firstName.toLowerCase()});
		// If there's alterData we'll loop through it.
		// We skip the name and apply the value to the attributes.
		// If it's an array we'll use the second value in an eval.
		alterData.forEach( item => {
			for (var attr in shape) {
				switch (attr) {
					case "name": continue; break;
					default:
						if (item[attr]) {
							shape[attr] = (item[attr].includes(";")) ? eval(item[attr]) : item[attr];
						}
						break;
				}
			}
		});
		
		// Make sure we get the shape object.
		// And add itt o the layer.
		// var lShape = getShape(shape);
		markerGroup.addLayer(
			getShape(shape).bindTooltip(marker.name)
			.bindPopup(marker.name)
		);
	};
	
	markers[list.name] = markerGroup;
	return markers;
}

/* ***************************************************
// Process the worldData and return the objects.
****************************************************** */
async function processWorldData(worldData, map) {
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
	var defaultMap = (worldData.type == "default") ? true : false;
	var spawn = L.layerGroup([]);
	var homes = L.layerGroup([]);
	var warps = L.layerGroup([]);
	var markers = {};
	var markersDefault = (worldData.markers_default) ? worldData.markers_default : "Home";
	
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
	
	// Make sure we populate the markers.
	// Not to forget define the default set to display.
	for (const list of worldData.markers) {
		markers = await fillMarkers(worldData, list, markers);
		markersDefault = (list.default) ? list.name : markersDefault;
	}
	
	// Get the default world based on worldData type.
	if (defaultMap) { map.addLayer(world); }
	
	// Return the data per world.
	return {"id":worldData.id,"data":world,"markers":markers,"markersDefault":markersDefault,"default":defaultMap}
}

/* ***************************************************
// Remove the searchMarker and add a new one.
****************************************************** */
function addSearchMarker(latlng, title, map) { 
	searchMarker.remove(); 
	searchMarker = L.circleMarker(latlng, {color:'red'});
	map.addLayer(searchMarker);
};


/* ***************************************************
// When switching a layer/map we need to change controls.
****************************************************** */
function updateMap(map, i) {
	// First we'll remove the map.
	map.off();
	map.remove();
	
	var mapID = i.layer.options.id;
	var mapName = worldIDs[mapID];
	
	// Define a new map.
	map = new L.Map('map', {
		maxZoom: mapMaxZoom,
		minZoom: mapMinZoom,
		crs: crs
	}).fitBounds([
		crs.unproject(L.point(mapExtent[2], mapExtent[3])),
		crs.unproject(L.point(mapExtent[0], mapExtent[1]))
	]);
	
	var currentMarkerList = markerList[mapID];
	
	// Redefine the controls to give the proper marker options.
	var defaultControls = L.control.layers(worldsList, currentMarkerList.list);
	var defaultSearch = new L.Control.Search({
		layer: currentMarkerList.list[currentMarkerList.default],
		initial: false,
		autoType: false,
		position:'topright',
		marker: false,
		moveToLocation: function(latlng, title, map) {addSearchMarker(latlng, title, map)}
	});
	
	// Add the controls and layers to the map.
	map.addControl(defaultControls);
	map.addControl(defaultSearch);
	map.addControl(displayCoords);
	
	map.addLayer(worldsList[mapName]);
	map.addLayer(currentMarkerList.list[currentMarkerList.default]);
	
	// Enable the on baselayerchange function (this) again.
	map.on('baselayerchange', function(i) { updateMap(map, i); });
}

/* ***************************************************
// Create the world map.
****************************************************** */
async function coreMap() {
	var defaultMap = 0;
	
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
	for (const worldData of worldsConfig) {
		await processWorldData(worldData, map).then( world => {
			markerList[world.id] = {"default":world.markersDefault,"list":world.markers};
			worldIDs[world.id] = worldData.name;
			worldsList[worldData.name] = world.data;
			defaultMap = (world.default) ? world.id : defaultMap;
		});
	};
	
	var currentMarkerList = markerList[defaultMap];
	
	// Define the control layers for the worlds.
	var defaultControls = L.control.layers(worldsList, currentMarkerList.list);
	var defaultSearch = new L.Control.Search({
		layer: currentMarkerList.list[currentMarkerList.default],
		initial: false,
		autoType: false,
		position:'topright',
		marker: false,
		moveToLocation: function(latlng, title, map) {addSearchMarker(latlng, title, map)}
	});
	
	// Add the controls to the map.
	map.addControl(defaultControls);
	map.addControl(defaultSearch);
	map.addControl(displayCoords);
	
	// Display the proper things when switching layers.
	map.on('baselayerchange', function(i) { updateMap(map, i); });
}

// Setup the map after DOMContentLoaded
document.addEventListener('DOMContentLoaded', (event) => {
	coreMap();
});