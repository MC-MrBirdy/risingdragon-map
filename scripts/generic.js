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
// The real calculation for the polygon.
****************************************************** */
function polygonSubArea(latlngs){
	area = 0;
	for (i=1; i<(latlngs.length-1); i++) {
		area +=  (latlngs[i-1][1]+latlngs[i][1]) * (latlngs[i-1][0]-latlngs[i][0]);
	}
	
	return area/2;
}

/* ***************************************************
// Calculate the area of a polygon.
// Do note that we can have a cutout (key 1).
// This we substract from the origin (key 0).
****************************************************** */
function polygonArea(latlngs) {
	area0 = 0;
	area1 = 0;
	
	if (latlngs[0] && latlngs[0][0]) {
		latlngs[0][0]
		tmpArr = latlngs[0];
		tmpArr.push(latlngs[0][0]);
		tmpArr = [tmpArr];
		
		area0 = polygonSubArea(latlngs[0]);
	}
	
	if (latlngs[1] && latlngs[1][0]) {
		latlngs[1][0]
		tmpArr = latlngs[1];
		tmpArr.push(latlngs[1][0]);
		tmpArr = [tmpArr];
		
		area1 = polygonSubArea(latlngs[1]);
	}
	
	return (area0-area1);
}

/* ***************************************************
// Simple function to get the area of a rectangle.
****************************************************** */
function rectangleArea(latlngs) {
	return ((latlngs[0][0]+1000000000) - (latlngs[1][0]+1000000000)) * ((latlngs[0][1]+1000000000) - (latlngs[1][1]+1000000000));
}