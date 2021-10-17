var defaultConfig = {
	"minZoom" : 3,
	"maxZoom" : 6,
	"mapResolution" : 1.00000000,
	"mapExtent" : [-5120.00000000, -5120.00000000, 5120.00000000, 5120.00000000],
	"defaultWorldID" : 0,
	"coordCor" : 2.0
};

var worldsConfig = [
	{
		"id":0,
		"name":"Overworld",
		"path":"worlds/overworld",
		"type":"default",
		"xsize":20000,
		"ysize":20000,
		"markers":[
			{
				"name":"Homes",
				"path":"/homes.json",
				"default":true
			},
			{
				"name":"Warps",
				"path":"/warps.json",
				"default":false,
				"color":"yellow"
			}]
	}
];