//json src: https://github.com/openpolis/geojson-italy

// set up svg
var width = d3.select('.canvas').node().clientWidth;
var height = d3.select('.canvas').node().clientHeight;

// set up svg for geography map
var svg = d3.select('.canvas').append('svg')
grp = svg.append('g');

svg.attr('width', width).attr('height', height);
grp.attr('transform', 'translate(' + [0, 0] + ')');

// Create the geographic projection
var projection = d3.geoMercator()
	.scale(width / 0.8)
	.translate([width / 8, height + 180]);

// Configure the path generator
var pathGenerator = d3.geoPath()
	.projection(projection);

// color
// var color = d3.scaleLinear()
// 	.domain([-1, 5])
// 	.range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
// 	.interpolate(d3.interpolateHcl);

// create sample circle packing data structure
root_cartogram = {
	name: "Italy",
	children: [{
		name: "Lombardia",
		children: [{
				"name": "Milano",
				"number": 300
			},
			{
				"name": "Brescia",
				"number": 200
			}
		]
	}]
}

// d3.json('data/provinces.json', function(error, data) {
d3.json('data/regions.json', function (error, data) {

	if (error) {
		console.error(error);
		throw error;
	}

	// var geojson = topojson.feature(data, data.objects.provinces).features;
	var geojson = topojson.feature(data, data.objects.regions).features;


	// Compute the projected centroid, area and length of the side of the squares.
	geojson.forEach(function (d) {
		d.centroid = projection(d3.geoCentroid(d));
		d.x0 = d.centroid[0];
		d.y0 = d.centroid[1];
		d.area = d3.geoPath().projection(projection).area(d);
		d.r = Math.sqrt(d.area);
	});

	// Sort the features by projected area
	geojson.sort(function (a, b) {
		return b.area - a.area;
	});

	// draw geopath line
	var provinces = grp.selectAll('path')
		.data(geojson)
		.enter()
		.append('path')
		.classed('province', true)
		.attr('d', pathGenerator);

	provinces.exit().remove();

	// create hierarchy data for circle packing
	var geo = {
		name: "Italy",
		children: []
	};
	geojson.forEach(function (d, i) {
		root_cartogram.children.forEach(function (n, i) {
			if (d.properties.reg_name === n.name) {
				var obj = {};
				geo.children[i] = Object.defineProperties(obj, {
					name: {
						value: d.properties.reg_name,
						writable: true
					},
					x0: {
						value: d.x0,
						writable: true
					},
					y0: {
						value: d.y0,
						writable: true
					},
					r: {
						value: d.r,
						writable: true
					},
					children: {
						value: n.children,
						writable: true
					}
				});
			}
		})
	})

	// console.log("geojson:", geojson);
	// console.log("geodata:", geodata);

	// pass hierarchy data to d3
	var geo = d3.hierarchy(geo)
		.sum(d => d.number)
		.sort((a, b) => d3.descending(a.value, b.value));

	console.log("geochildren:", geo.children);
	console.log("geo:", geo);

	// set up svg for circle packing
	// var grp_circle = svg.append('g').attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

	// Circles
	var margin = 1;

	var focus = geo,
		view;

	geo.children.forEach(function (d, i) {
		var pack = d3.pack()
			.size([d.data.r - margin, d.data.r - margin])
			.padding(2);

		var nodes = pack(geo).descendants();

		console.log("nodes:", nodes);

		var circle = grp.selectAll('circle')
			.data(nodes)
			.enter()
			.append('circle')
			.style("fill", function (d) {
				if (d.children) {
					return "#5EFFEF"
				} else {
					return "#37beb1"
				};
				// return d.children ? color(d.depth) : null;
			})
			.on("click", function (d) {
				if (focus !== d) zoom(d), d3.event.stopPropagation();
			});

		circle
			.attr('cx', function (n) {
				if (n.height < 2) {
					return d.data.x0 - n.x
				}
			})
			.attr('cy', function (n) {
				if (n.height < 2) {
					return d.data.y0 - n.y
				}
			})
			.attr('r', function (n) {
				if (n.height < 2) {
					return n.r
				}
			})

		// var node = grp.selectAll('circle');
		// console.log(node);

		// svg.on("click", function () {
		// 	zoom(geo);
		// });

		// zoomTo([geo.x, geo.y, geo.r * 2]);

		// function zoomTo(v) {
		// 	var k = d.data.r / v[2];
		// 	view = v;
		// 	circle.attr("transform", function (d) {
		// 		return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
		// 	});
		// 	circle.attr("r", function (d) {
		// 		return d.r * k;
		// 	});
		// }

		// function zoom(d) {
		// 	var focus0 = focus;
		// 	focus = d;

		// 	var transition = d3.transition()
		// 		.duration(d3.event.altKey ? 7500 : 750)
		// 		.tween("zoom", function (d) {
		// 			var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
		// 			return function (t) {
		// 				zoomTo(i(t));
		// 			};
		// 		});
		// }
	})














	// labels
	// var labels = grp.selectAll('text')
	// 	.data(nodes)
	// 	.enter()
	// 	.append('text')
	// 	.classed('txt_province', true)

	// 	// create a force simulation and add forces to it
	// function simulation(){
	// 	// new force simulation creation	
	// 	var simulation = d3.forceSimulation()
	// 		.velocityDecay(0.5)
	// 		.force("cx", d3.forceX().x(d => d.x0).strength(0.6))
	//     	.force("cy", d3.forceY().y(d => d.y0).strength(0.6))
	// 		.force("x", d3.forceX().x(d => d.x0).strength(0.6))
	//     	.force("y", d3.forceY().y(d => d.y0).strength(0.6))
	// 		// .force('center', d3.forceCenter(width / 2, height / 2))
	// 		.force('collision', d3.forceCollide().radius(function(d) {
	// 			return d.r/2;
	// 			// return d.r/1.8;
	// 		}))
	// 		.force('charge', d3.forceManyBody().strength(3))//make nodes repulse away from each other
	// 		//.stop();

	// 	// Apply these forces to the nodes and update their positions.
	// 	// Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
	// 	simulation
	// 		.nodes(geojson)
	// 		.on("tick", function(d) {
	// 			circles
	// 				.attr("cx", function(d) {
	// 				return d.x;
	// 				})
	// 				.attr("cy", function(d) {
	// 				return d.y;
	// 				})
	// 			labels
	// 				.attr("x", function(d) {
	// 				return d.x;
	// 				})
	// 				.attr("y", function(d) {
	// 				return d.y;
	// 				})
	// 		});
	// 	simulation.alpha(1).restart();
	// }

	// // simulation starts running automatically once geojson nodes are set
	// simulation();

	// circles.on('mouseover', function(d) {
	// 	// Highlight on mouse over
	// 	// d3.select(this).classed('highlighted', true);	
	// 	// prin_name.append('text')
	// 	// 	.classed('province-label', true)
	// 	// 	.attr('x', 0)
	// 	// 	.attr('y', 0)
	// 	// 	.text(d.properties.reg_name);
	// 	// })
	// 	// .on('mouseout', function(d) {
	// 	// 	d3.select(this).classed('highlighted', false);
	// 	// 	prin_name.selectAll('text.province-label').remove();
	// 	});

	// circles.exit().remove();
})