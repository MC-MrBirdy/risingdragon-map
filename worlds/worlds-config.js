var defaultConfig = {
	"minZoom" : 3,
	"maxZoom" : 6,
	"mapResolution" : 1.00000000,
	"mapExtent" : [-5695.00000000, -5695.00000000, 5695.00000000, 5695.00000000],
	"defaultWorldID" : 0,
	"coordCor" : 2.006
};

var worldsConfig = [
	{
		"id":0,
		"name":"Overworld",
		"path":"worlds/overworld",
		"type":"default",
		"xsize":22500,
		"ysize":22500,
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
	},
	{
		"id":9,
		"name":"Overworld Dec.21 (1.17)",
		"path":"worlds/overworld-dec21-117",
		"type":"default",
		"xsize":20000,
		"ysize":20000,
		"coordCor" : 2,
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

/*,
	{
		"id":10,
		"name":"Overworld Oct.21 (1.17)",
		"path":"worlds/overworld-oct21-117",
		"type":"default",
		"xsize":20000,
		"ysize":20000,
		"coordCor" : 2,
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
*/