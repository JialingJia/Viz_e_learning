//json src: https://github.com/openpolis/geojson-italy

var width = d3.select('.canvas').node().clientWidth;
var height = d3.select('.canvas').node().clientHeight;

var svg = d3.select('.canvas').append('svg')
	grp = svg.append('g');
        
svg.attr('width', width).attr('height', height);
grp.attr('transform', 'translate(' + [0, 0] + ')');

// Create the geographic projection
var projection = d3.geoMercator()
	.scale(width/0.8)
	.translate([width/8, height+180]);

// Configure the path generator
var pathGenerator = d3.geoPath()
	.projection(projection);

// d3.json('data/provinces.json', function(error, data) {
d3.json('data/regions.json', function(error, data) {

	if (error) {
		console.error(error);
		throw error;
	}

	// var geojson = topojson.feature(data, data.objects.provinces).features;
	var geojson = topojson.feature(data, data.objects.regions).features;
	console.log(geojson);

	// Compute the projected centroid, area and length of the side
	// of the squares.
	geojson.forEach(function(d) {
		d.centroid = projection(d3.geoCentroid(d));
		d.x0 = d.centroid[0];
		d.y0 = d.centroid[1];
		d.area = d3.geoPath().projection(projection).area(d);
		d.r = Math.sqrt(d.area);
	});

	// Sort the features by projected area
	geojson.sort(function(a, b) { return b.area - a.area; });

	var provinces = grp.selectAll('path.province')
		.data(geojson)
		.enter()
		.append('path')
		.classed('province', true)
		.attr('d', pathGenerator);
	
	provinces.exit().remove();

	// Circles
	var prin_name = d3.select('.info');
	var circles = grp.selectAll('circle.province')
		.data(geojson)
		.enter()
		.append('circle')
		.classed('province', true);
	circles
		.attr('cx', function(d) { return d.centroid[0] - d.r / 2; })
		.attr('cy', function(d) { return d.centroid[1] - d.r / 2; })
		.attr('r', function(d) { return d.r/2; });
	
	// labels
	var labels = grp.selectAll('text')
		.data(geojson)
		.enter()
		.append('text')
		.classed('txt_province',true)
	labels
		.attr('x', function(d) { return d.x0 - d.r; })
		.attr('y', function(d) { return d.y0 - d.r / 2; })
		// .text(d=>d.properties.prov_name)
		.text(d=>d.properties.reg_name)
	
		// create a force simulation and add forces to it
	function simulation(){
		// new force simulation creation	
		var simulation = d3.forceSimulation()
			.velocityDecay(0.5)
			.force("cx", d3.forceX().x(d => d.x0).strength(0.6))
        	.force("cy", d3.forceY().y(d => d.y0).strength(0.6))
			.force("x", d3.forceX().x(d => d.x0).strength(0.6))
        	.force("y", d3.forceY().y(d => d.y0).strength(0.6))
			// .force('center', d3.forceCenter(width / 2, height / 2))
			.force('collision', d3.forceCollide().radius(function(d) {
				// return d.r/2;
				return d.r/1.8;
			}))
			.force('charge', d3.forceManyBody().strength(3))//make nodes repulse away from each other
			//.stop();
		
		// Apply these forces to the nodes and update their positions.
		// Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
		simulation
			.nodes(geojson)
			.on("tick", function(d) {
				circles
					.attr("cx", function(d) {
					return d.x;
					})
					.attr("cy", function(d) {
					return d.y;
					})
				labels
					.attr("x", function(d) {
					return d.x;
					})
					.attr("y", function(d) {
					return d.y;
					})
			});
		simulation.alpha(1).restart();
	}

	// simulation starts running automatically once geojson nodes are set
	simulation();
	
	circles.on('mouseover', function(d) {
		// Highlight on mouse over
		d3.select(this).classed('highlighted', true);	
		prin_name.append('text')
			.classed('province-label', true)
			// .attr('x', 20)
			// .attr('y', 20)
			.text(d.properties.reg_name);
		})
		.on('mouseout', function(d) {
			d3.select(this).classed('highlighted', false);
			prin_name.selectAll('text.province-label').remove();
		});

	circles.exit().remove();
})
