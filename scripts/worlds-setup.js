// Define the crs overwrite.
const crs = L.CRS.Simple;
const resolution = (Math.pow(2, defaultConfig.maxZoom) * defaultConfig.mapResolution);
	crs.transformation = new L.Transformation(1, -defaultConfig.mapExtent[0], -1, defaultConfig.mapExtent[3]);
	crs.scale = function(zoom) { return Math.pow(2, zoom) / resolution; };
	crs.zoom = function(scale) { return Math.log(scale * resolution) / Math.LN2; };

// Create the world and execute additions on the callback.
// This allows us to add controls after the entire map has been defined.
// This also works around the issue of having to call our class by variable within the class.
var world = new Worlds();
world.init(defaultConfig, worldsConfig, crs, function() {
	// Custom search function.
	var defaultSearch = new L.Control.Search({
			layer: world.defaultMarkersList[world.defaultWorldID],
			initial: false,
			autoType: false,
			position:'topright',
			marker: false,
			moveToLocation: function(latlng, title, map) {
				world.addSearchMarker(latlng);
			}
		});
	
	// Define the coordinates (mousePosition).
	var displayCoords = new L.control.mousePosition({
			lngFirst: true,
			lngFormatter: lng,
			latFormatter: lat
		});
	
	// Add the custom search and coordinates to the map.
	world.addControlToMap(defaultSearch);
	world.addControlToMap(displayCoords);
});

/* ***************************************************
// Simple functions to correct the coordinates.
****************************************************** */
function lat(cor) { return Math.round(cor*world.coordCor)*-1; }
function lng(cor) { return Math.round(cor*world.coordCor); }
