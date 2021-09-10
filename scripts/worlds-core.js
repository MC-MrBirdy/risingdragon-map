class Worlds {
	/*******************************************************************\
	// Initialize function to call when you've define the class.
	// By default the class won't do anything without a constructor.
	// The callback function is called in processWorldsConfig.
	// This allows us to have a define map before doing more things.
	\*******************************************************************/
	init(defaultConfig, worldsConfig, crs, callback) {
		// Default map settings and available configs.
		this.minZoom = defaultConfig.minZoom;
		this.maxZoom = defaultConfig.maxZoom;
		this.mapExtent = defaultConfig.mapExtent;
		this.coordCor = 1.2;
		
		// Set some extra options based on GET variables.
		this.alterView = (new URL(window.location.href).searchParams.get("show") == "alter") ? true : false;
		//this.checkDebug = (new URL(window.location.href).searchParams.get("debug") == "true") ? true : false;
		
		this.defaultWorldID = defaultConfig.defaultWorldID;
		this.currentWorldID = this.defaultWorldID;
		this.worldsConfig = worldsConfig;
		this.crs = crs;
		this.callback = callback;
		
		// The empty tiles and worlds list.
		this.tilesList = {};
		this.worldsList = {};
		this.markersList = {};
		this.defaultMarkersList = {};
		this.shapePointLayer = {};
		this.shapeRectangleCoords = [];
		this.shapeRectangles = L.layerGroup([]);
		
		// Empty search marker.
		this.searchMarker = new L.circleMarker();
		
		// Setup the map and handle each world.
		this.initDefaults();
		this.processWorldsConfig();
	}
	
	/*******************************************************************\
	// Make sure we setup the default config values.
	// We need the crs functions and tileBounds for the map.
	\*******************************************************************/
	initDefaults() {
		// Define the bounds for the map.
		// This so we can limit what's being loaded.
		this.tileBounds = L.latLngBounds(
			L.latLng(this.mapExtent[0], this.mapExtent[1]),
			L.latLng(this.mapExtent[2], this.mapExtent[3])
		);
		
		// Define the map using the config.
		// Make sure to alter the crs if available.
		this.map = L.map('map', {
				maxZoom: this.maxZoom,
				minZoom: this.minZoom,
				crs: this.crs
			}).fitBounds([
				crs.unproject(L.point(this.mapExtent[2], this.mapExtent[3])),
				crs.unproject(L.point(this.mapExtent[0], this.mapExtent[1]))
			]);
	}
	
	/*******************************************************************\
	// Get the world configs and add them to the map.
	\*******************************************************************/
	async processWorldsConfig() {
		// Itherate through the config to generate the tile layers.
		for (var config of this.worldsConfig) {
			// First define the tile layer, using the proper path.
			// The attribution is optional and defaults to ©MagnaRisa.
			const currentWorld = L.tileLayer(config.path + '/{z}/{x}/{y}.png', {
				attribution: (config.attr) ? config.attr : '&copy;MagnaRisa',
				id: config.id,
				parent: this,
				minZoom: this.minZoom,
				maxZoom: this.maxZoom,
				noWrap: true,
				tms: false,
				bounds: this.tileBounds
			});
			
			// Make sure we add it to our world list.
			// This so we can add the controls to switch worlds.
			this.tilesList[config.name] = currentWorld;
			this.worldsList[config.name] = config;
			
			// Generate the markers.
			await this.processMarkers(config);
			
			// If it's the default map we want to add it to the map.
			if (config.id == this.defaultWorldID) {
				this.map.addLayer(currentWorld);
				this.map.addLayer(this.defaultMarkersList[config.id]);
			}
		}
		
		// Add the controls with the populated worlds list.
		this.mapControls = L.control.layers(this.tilesList, this.markersList[this.defaultWorldID]);
		this.map.addControl(this.mapControls);
		
		// Add/Overwrite the baseLayerChange event to trigger an update of the map.
		// This so we can display the proper markers and update the controls.
		this.map.on('baselayerchange', function(i) { i.layer.options.parent.updateMap(this, i.layer.options.id); });
		
		this.callback.bind(this)();
	}
	
	/*******************************************************************\
	// Simple function to add controls to the map.
	\*******************************************************************/
	addControlToMap(control) {
		this.map.addControl(control);
	}
	
	/*******************************************************************\
	// Switching a map will need things to be updated.
	// This includes removing the old layers and adding the new.
	\*******************************************************************/
	updateMap(map, ID) {
		// Itherate through the current layers and remove them.
		// We remove them from both the map and controls.
		for (var layerName in this.markersList[this.currentWorldID]) {
			map.removeLayer(this.markersList[this.currentWorldID][layerName]);
			this.mapControls.removeLayer(this.markersList[this.currentWorldID][layerName]);
		}
		
		// Remove the points if they're still on the map.
		for (var oldPointLayers in this.shapePointLayer) {
			for (var oldPointLayer in this.shapePointLayer[oldPointLayers]) {
				this.map.removeLayer(this.shapePointLayer[oldPointLayers][oldPointLayer]);
			}
		}
		
		// Remove all rectangles that are on the map.
		map.removeLayer(this.shapeRectangles);
		// Remove the search circle that might be on the map.
		map.removeLayer(this.searchMarker);
		
		// Set the current world ID.
		this.currentWorldID = ID;
		
		// set a defaultMarkerName placeholder and get the current world config.
		var defaultMarkerName = "undefined";
		var config = this.worldsConfig.find(config => config.id == this.currentWorldID);
		
		// Only when the world config has markers we'll try to get the default one.
		if (config && config.markers) {
			var defaultMarker = config.markers.reverse().find(marker => marker.default == true);
			// When the default one (first in reverse order) has been found we set the name.
			if (defaultMarker && defaultMarker.name) {
				defaultMarkerName = defaultMarker.name;
			}
		}
		
		// Itherate through the new layers and add them.
		// For the default overlay we'll need to add it to the map.
		for (var layerName in this.markersList[this.currentWorldID]) {
			this.mapControls.addOverlay(this.markersList[this.currentWorldID][layerName], layerName);
			if (layerName == defaultMarkerName) {
				this.map.addLayer(this.markersList[this.currentWorldID][layerName]);
			}
		}
	}
	
	/*******************************************************************\
	// Remove the old searchMarker and add a new one.
	// This function isn't used unless a search control is added.
	\*******************************************************************/
	addSearchMarker(latlng) {
		this.searchMarker.remove(); 
		this.searchMarker = new L.circleMarker(latlng, {color:'red'});
		this.map.addLayer(this.searchMarker);
		this.map.setView(latlng, 100);
	}
	
	/*******************************************************************\
	// Function to get the url content as JSON and wait for it's response.
	\*******************************************************************/
	async fetchJSON(url) {
		var result = await fetch(url);
		return await result.json();
	}
	
	/*******************************************************************\
	// Get the marker data so it can be added to the map.
	\*******************************************************************/
	async processMarkers(config) {
		// Define the empty markersList array.
		this.markersList[config.id] = [];
		
		// Itherate through the configured markers.
		for (var markers of config.markers) {
			// Check if the alter view is required.
			// If it is and it's false we skip.
			if (!this.alterView && markers.alter) {
				continue;
			}
			
			// For each marker we fetch the data.
			// We wait for the json to be handled.
			var json = await this.fetchJSON(config.path + markers.path);
			
			// Check if the alter view is enabled.
			// If so we'll check if we have alter views to process.
			// We'll need to wait for this as it will get external data.
			if (this.alterView && config.alter && config.alter[markers.name]) {
				await this.alterMarkerContent(json, config, config.alter[markers.name]);
			}
		
			// To allow access to names we pass on the config and markers.
			this.handleMarkerContent(json, config, markers);
		}
	}
	
	/*******************************************************************\
	// Process the altered data and convert or add it to the marker(s).
	\*******************************************************************/
	async alterMarkerContent(markers, config, alters) {
		// Itherate through the alters available.
		for (var alter of alters) {
			// Fetch the data as a JSON.
			var json = await this.fetchJSON(config.path + alter);
			// Itherate through the JSON.
			for (var attrName in json) {
				// Filter the original markers based on their name property.
				// Using filter will return all matching markers.
				var oriMarkers = markers.filter(x => x.name == attrName);
				// Loop through the found markers and merge them.
				// Using Object.assign the properties can be added or overwritten.
				for (var oriMarker of oriMarkers) {
					oriMarker = Object.assign(oriMarker, json[attrName]);
				}
			}
		}
	}
	
	/*******************************************************************\
	// Get the world configs and add them to the map.
	\*******************************************************************/
	handleMarkerContent(json, config, marker) {
		// Check what type we're dealing with.
		// For arrays we simply call the main create.
		// For objects, these we'll need to convert first.
		switch (json.constructor.name) {
			case "Array":
				// Pass on the config and markers to allow access to names.
				this.createMarkerList(json, config, marker);
				break;
			case "Object":
				json = this.convertRaw(json, marker);
				this.createMarkerList(json, config, marker);
				break;
		}
	}
	
	/*******************************************************************\
	// Convert raw regions data to a markers format.
	// Some settings are configurable in the worlds-config.
	\*******************************************************************/
	convertRaw(raw, markersConfig){
		// Create an empty array to work with.
		var newJson = [];
		
		// Itherate through the regions and return a processable array.
		for (var regionKey of Object.keys(raw.regions)) {
			// Store the region data for easier access.
			var region = raw.regions[regionKey];
			
			// Define empty variables/objects to fill.
			var marker = {};
			var latlngs = [[],[]];
			var latlng = [];
			
			// Skip the region if it has a parent or when players can't chat.
			if (region["parent"]
				|| region["type"] == "global"
				|| (region["flags"] && region["flags"]["send-chat"] && region["flags"]["send-chat"] == "deny")) {
				continue;
			}
			
			// Convert the points (if available) to latlngs.
			if (region["points"]) {
				for (var id of Object.keys(region["points"])) {
					latlngs[0].push(
							[
								region["points"][id]["x"],
								region["points"][id]["z"]
							]
						);
				}
			}
			
			// Convert the coords (if available) to latlng.
			if (region["min"] && region["max"]) {
				latlng = [
						[
							region["min"]["x"],
							region["min"]["z"]
						],[
							region["max"]["x"],
							region["max"]["z"]
						]
					];
			}
			
			// Fill the marker object.
			marker.name = regionKey;
			marker.description = "";
			marker.shape = this.converRawType(region["type"]);
			marker.weight = (markersConfig.weight>=0) ? markersConfig.weight : 2;
			marker.radius = (markersConfig.radius>=0) ? markersConfig.radius : 15;
			marker.opacity = (markersConfig.opacity>=0) ? markersConfig.opacity : 0.5;
			marker.color = (markersConfig.color) ? markersConfig.color : "red";
			// The coords will be corrected later on.
			marker.latlngs = latlngs;
			marker.latlng = latlng;
			marker.tooltip = regionKey;
			
			newJson.push(marker);
		}
		
		return newJson;
	}
	
	/* ***************************************************
	// Correct the raw types from regions to map types.
	****************************************************** */
	converRawType(type) {
		// Default return variable.
		var shape = "circle";
		
		// Convert to proper namings.
		switch (type) {
			case "poly2d": 
				shape = "polygon";
			break;
			case "cuboid":
				shape = "rectangle";
			break;
		}
		
		return shape;
	}
	
	/*******************************************************************\
	// Create a proper marker (layer)group to be displayed.
	\*******************************************************************/
	createMarkerList(markers, config, markersConfig) {
		// Define the layerGroup for all markers.
		var markerGroup = L.layerGroup([]);
		
		// Itherate through the markes and create the proper shape.
		// Each shape will be added as a layer to the marker (layer)group.
		for (var marker of markers) {
			var shape;
			
			// For the popup we first define the tooltip.
			marker.tooltip = (marker.tooltip) ? marker.tooltip : marker.name + ((marker.description) ? "<br/><b>" + marker.description + "</b>" : "");
			
			// For rectangles and polygon we add the total and percentage info.
			if (marker.shape && (marker.shape == "rectangle" || marker.shape == "polygon")) {
				var total = (marker.latlngs && marker.latlngs[0] && marker.latlngs[0].length >= 2) ? Math.abs(this.polygonArea(marker.latlngs)) : this.rectangleArea(marker.latlng);
				var percentage = Math.round(((total / (config.xsize * config.ysize)) * 100) * 100) / 100;
				
				marker.popup = marker.tooltip
					+ "<br/><span class=\"info\">"
					+ "<span class=\"label\">Size:</span>~" + total + " /blocks"
					+ "<br/><span class=\"label\">&nbsp;</span>" + percentage + "%"
					+ "</span>";
			}
			
			// Get the radius, evaluated, or default.
			var radius = (marker.radius>=0) ? marker.radius : 15;
			radius = (marker.radius_eval) ? Math.round(radius+Math.sqrt(marker.radius_eval)) : radius;
			// Cap it to 100
			if (radius>100) { radius = 100;	}
			
			// Partially preventing empty values of causing issues.
			// We set default values for those that might be missing (or are incorrect).
			marker.name = (marker.name) ? marker.name : "unidentified";
			marker.description = (marker.description) ? marker.description : "";
			marker.shape = (marker.shape) ? marker.shape : "circle";
			marker.weight = (marker.weight>=0) ? marker.weight : 2;
			marker.radius = radius;
			marker.opacity = (marker.opacity>=0) ? marker.opacity : 0.5;
			marker.color = (marker.color) ? marker.color : "red";
			// Make a copy of the coords.
			marker.rawLatlngs = (marker.latlngs) ? Array.from(marker.latlngs) : [];
			marker.rawLatlng = (marker.latlng) ? Array.from(marker.latlng) : [];
			marker.latlngs = (marker.latlngs) ? this.fixLatlngs(marker.latlngs) : [];
			marker.latlng = (marker.latlng) ? this.fixLatlng(marker.latlng) : [];
			marker.popup = (marker.popup) ? marker.popup : ((marker.tooltip) ? marker.tooltip : marker.name);
			
			// Define the proper shape.
			switch (marker.shape) {
				default:
				case "circle":				
					shape = L.circle(
								marker.latlng,
								{
									color: (marker.color) ? marker.color : "red",
									opacity: marker.opacity,
									fillOpacity: marker.opacity,
									weight: marker.weight,
									radius: (marker.radius > 0) ? marker.radius : 10,
									title: marker.name + ( (marker.description) ? " - " + marker.description : "" )
								}
							);
					break;
				case "rectangle":				
					shape = L.rectangle(
								[marker.latlng],
								{
									parent: this,
									rawLatlng: marker.rawLatlng,
									color: marker.color,
									opacity: marker.opacity,
									weight: marker.weight,
									title: marker.name + ( (marker.description) ? " - " + marker.description : "" )
								}
							);
					break;
				case "polygon":
					shape = L.polygon(
								marker.latlngs,
								{
									parent: this,
									rawLatlngs: marker.rawLatlngs,
									color: marker.color,
									opacity: marker.opacity,
									weight: marker.weight,
									title: marker.name + ( (marker.description) ? " - " + marker.description : "" )
								}
							);
					break;
			}
			
			// Add the shape to the marker (layer)group.
			// Bind the tooltip, popup, and alter the click.
			markerGroup.addLayer(
				shape.bindTooltip(marker.tooltip)
					.bindPopup(marker.popup)
					.on('click', function(e) { 
							// If the parent is set call the show shape points function.
							// This will add points at all the coords from the shape.
							if (this.options && this.options.parent && this.options.parent.alterView) {
								this.options.parent.showShapePoints(this, this.options.parent); 
							}
						})
			);
		}
		
		// Add the marker (layer)group to the markersList.
		// Here the names are used again for easier access.
		this.markersList[config.id][markersConfig.name] = markerGroup;
		if (markersConfig.default) {
			this.defaultMarkersList[config.id] = markerGroup;
		}
	}
	
	/*******************************************************************\
	// Make sure we remove and show points when needed.
	\*******************************************************************/
	showShapePoints(shape, parent) {
		// Check if we have points added already.
		if (!parent.shapePointLayer[shape.options.title]) {
			// Remove the old points from the map.
			for (var oldPointLayers in parent.shapePointLayer) {
				for (var oldPointLayer in parent.shapePointLayer[oldPointLayers]) {
					parent.map.removeLayer(parent.shapePointLayer[oldPointLayers][oldPointLayer]);
				}
			}
			// Clear the points from the class.
			// Define a new empty version to work with.
			parent.shapePointLayer = {};
			parent.shapePointLayer[shape.options.title] = [];
			// Add the points to the class and map.
			parent.handleShapeOptions(shape, parent);
		}
	}
	
	/*******************************************************************\
	// Handle the shapes options, specifically the latlngs.
	\*******************************************************************/
	handleShapeOptions(shape, parent) {
		// The id is used for the multiple latlngs we can have.
		var id = 0;
		// Only if the latlngs are available, itherate through them.
		// We add the points to the map and class.
		if (shape._latlngs) {
			for (var latlngs of shape._latlngs) {
				this.addPolyPoint(latlngs, shape, parent, id);
				id++;
			}
		}
	}
	
	/*******************************************************************\
	// Handle each latlng location and create, add, and store the points.
	\*******************************************************************/
	addPolyPoint(latlngs, shape, parent, id) {
		// Empty layer group to work with.
		var pointGroup = L.layerGroup([]);
		
		// Itherate through all latlngs and add them  to the group.
		for (var latlng of latlngs) {
			// Calculate the game coordinates to show as popup.
			var latCor = Math.round(latlng.lat * -1 * parent.coordCor);
			var lngCor = Math.round(latlng.lng * parent.coordCor);
			
			// Create the circle with popup and click function.
			var point = L.circle(
							[latlng.lat, latlng.lng],
							{
								parent: parent,
								lat: latlng.lat,
								lng: latlng.lng,
								opacity: 0.75,
								fillOpacity: 0.75,
								weight: 0,
								radius: 10,
								title: "test"
							}
						)
						.bindPopup( latCor + "," + lngCor )
						.on('click', function (e){ this.options.parent.drawSquare(this, this.options.parent) });
			
			// Add the point to the layer group.
			pointGroup.addLayer(point);
		}
		
		// Store the group and add it to the map.
		parent.shapePointLayer[shape.options.title][id] = pointGroup;
		parent.shapePointLayer[shape.options.title][id].addTo(parent.map);
	}
	
	/*******************************************************************\
	// Handle the points being clicked so we can draw rectangles.
	\*******************************************************************/
	drawSquare(point, parent) {
		// Check if we already have the points coords in the list.
		// If so we just return to stop the function.
		if (parent.shapeRectangleCoords.length > 0
			&& parent.shapeRectangleCoords[0][0] == point.options.lat
			&& parent.shapeRectangleCoords[0][1] == point.options.lng) {
			return;
		}
		
		// Add the coords to the list.
		parent.shapeRectangleCoords.push([point.options.lat, point.options.lng]);
		
		// Create the rectangle when we have 2 sets of coordinates.
		// Clear the rectangle coordinates for a new one.
		if (parent.shapeRectangleCoords.length == 2) {				
			var rectangle = L.rectangle(parent.shapeRectangleCoords, {});
			parent.shapeRectangleCoords = [];
			parent.shapeRectangles.addLayer(rectangle);
			// Output our data to the console.
			parent.outputCoords(rectangle._latlngs, parent);
		}
		
		// Add the rectangle(s) to the map.
		parent.shapeRectangles.addTo(parent.map);
	}
	
	/* ***************************************************
	// Simple function to output the rectangle latlngs to the console.
	****************************************************** */
	outputCoords(latlngs, parent) {
		// Make a copy of the latlngs so we don't move the rectangle.
		var latlngsCor = JSON.parse(JSON.stringify(latlngs[0]));
		// Itherate through them to correct them back to game coordinates.
		for (var key in latlngsCor) {
			latlngsCor[key].lat = Math.round(latlngsCor[key].lat * -1 * parent.coordCor);
			latlngsCor[key].lng = Math.round(latlngsCor[key].lng * parent.coordCor);
		}
	
		// Get the proper order for the coords.
		var minX = (latlngsCor[0].lng > latlngsCor[2].lng) ? latlngsCor[2].lng : latlngsCor[0].lng;
		var maxX = (latlngsCor[0].lng > latlngsCor[2].lng) ? latlngsCor[0].lng : latlngsCor[2].lng;
		var minZ = (latlngsCor[0].lat > latlngsCor[2].lat) ? latlngsCor[2].lat : latlngsCor[0].lat;
		var maxZ = (latlngsCor[0].lat > latlngsCor[2].lat) ? latlngsCor[0].lat : latlngsCor[2].lat;
		
		// Output the result to the console.
		console.log("x>=" + minX + " AND x<=" + maxX + " AND z>=" + minZ + " AND z<=" + maxZ);
	}
	
	/*******************************************************************\
	// A fix for game coordinates to map coordinates.
	// Well at least they'll be very close to it.
	\*******************************************************************/
	fixLatlng(latlng) {
		// If we have coords to work with correct them.
		if (latlng[0]) {
			switch (latlng[0].length) {
				case 2:
					// If the first element has two items,
					// we assume it to be coordinates for an rectangle.
					latlng[0] = this.fixLatlng(latlng[0]);
					latlng[1] = this.fixLatlng(latlng[1]);
					break;
				default:
					// Else we correct the coordinates as is.
					// Since the game coordinates aren't like the map.
					// We need to correct them (coordCor) and swap them.
					var tmpX = latlng[0]/this.coordCor;
					var tmpY = latlng[1]*-1/this.coordCor;
					latlng[1] = tmpX;
					latlng[0] = tmpY;
					break;
			}
		}
		
		return latlng;
	}

	/* ***************************************************
	// Correct the game coordinates for latlngs to map coordinates.
	****************************************************** */
	fixLatlngs(latlngs) {		
		// If the latlngs contain a second element it must be processed individually.
		// In a polygon this will be the cutout area.
		if (latlngs[0] && latlngs[0].length >= 2 && latlngs.length == 2) {
			latlngs[0] = this.loopLatlngs(latlngs[0]);
			latlngs[1] = this.loopLatlngs(latlngs[1]);
		} else {
			latlngs = this.loopLatlngs(latlngs);
		}
		
		return latlngs;
	}
	
	/* ***************************************************
	// Simple loop to trigger the latlng fix for latlngs.
	****************************************************** */
	loopLatlngs(latlngs) {
		for (var latlng of latlngs) {
			latlng = this.fixLatlng(latlng);
		}
		return latlngs;
	}

	/* ***************************************************
	// Calculate the area of a polygon.
	// Do note that we can have a cutout (key 1).
	// This we substract from the origin (key 0).
	****************************************************** */
	polygonArea(inLatlngs) {
		var latlngs = JSON.parse(JSON.stringify(inLatlngs)); 
		var area0 = 0;
		var area1 = 0;
		var tmpArr;
		
		if (latlngs[0] && latlngs[0][0]) {
			latlngs[0][0]
			tmpArr = latlngs[0];
			tmpArr.push(latlngs[0][0]);
			tmpArr = [tmpArr];
			
			area0 = this.polygonSubArea(latlngs[0]);
		}
		
		if (latlngs[1] && latlngs[1][0]) {
			latlngs[1][0]
			tmpArr = latlngs[1];
			tmpArr.push(latlngs[1][0]);
			tmpArr = [tmpArr];
			
			area1 = this.polygonSubArea(latlngs[1]);
		}
		
		return (area0-area1);
	}
	
	/* ***************************************************
	// The real calculation for the polygon.
	****************************************************** */
	polygonSubArea(latlngs){
		var area0 = 0;
		for (var i=1; i<(latlngs.length-1); i++) {
			area0 +=  (latlngs[i-1][1]+latlngs[i][1]) * (latlngs[i-1][0]-latlngs[i][0]);
		}
		
		return area0/2;
	}

	/* ***************************************************
	// Simple function to get the area of a rectangle.
	****************************************************** */
	rectangleArea(inLatlngs) {
		var latlngs = JSON.parse(JSON.stringify(inLatlngs)); 
		return ((latlngs[0][0]+1000000000) - (latlngs[1][0]+1000000000)) * ((latlngs[0][1]+1000000000) - (latlngs[1][1]+1000000000));
	}
}
	