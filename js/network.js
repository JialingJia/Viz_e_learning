// network graph
var width_network = window.innerWidth;
var height_network = window.innerHeight;

var canvas = d3.select("#network").append("canvas")
    .attr("width", width_network + "px")
    .attr("height", height_network + "px")
    .node();

var context = canvas.getContext("2d");

var detachedContainer = document.createElement("custom");

var dataContainer = d3.select(detachedContainer);

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function (d) {
        return d.id;
    }))
    .force("charge", d3.forceManyBody().strength(-6))
    .force("collide", d3.forceCollide().strength(0.2).radius(0.5))
    .force("center", d3.forceCenter(width_network / 2 - 150, height_network / 2))

var transform = d3.zoomIdentity;

//cartogram graph
var cartogram = d3.select("#cartogram").append("svg")
geograph = cartogram.append('g');

var width_carto = 300
height_carto = 300
radius = 135;

cartogram.attr('width', width_carto).attr('height', height_carto);
geograph.attr('transform', 'translate(' + [0, 0] + ')');

// Create the geographic projection
var projection = d3.geoMercator()
    .scale(width_carto * 3)
    .translate([-30, 880]);

// Configure the path generator
var pathGenerator = d3.geoPath()
    .projection(projection);

// Math
var k = 2;

function sigmoid(z) {
    return (1 + Math.exp(-z / k));
}

//tree graph
var treegraph = d3.select('#tree').append('svg')
positiontree = treegraph.append('g');

var width_tree = 300
height_tree = 300;

treegraph.attr('width', width_tree).attr('height', height_tree);
positiontree.attr("transform", "translate(" + (width_tree / 2) + "," + (height_tree / 2) + ")");

// load data
d3.queue()
    .defer(d3.json, "./data/proto_data.json")
    .defer(d3.json, "./cartogram/data/regions.json")
    .defer(d3.json, "./data/proto_tree.json")
    .await(function (error, graphdata, geodata, treedata) {
        if (error) throw error;

        // graph
        var g, store;
        var degree, selfScore, validScore;
        var minDegree, maxDegree;
        var degreeList, scoreList, degreeData;

        var threshold_a = 200;
        var threshold_b = 100;

        var radius_a = 0.004;
        var radius_b = 0.05;
        var radius_c = 0.1;

        // real-time calculation
        function aggregate(array) {
            var obj = {};
            array.forEach(function (val) {
                if (!obj[val])
                    obj[val] = 1;
                else
                    obj[val]++;
            });
            return obj;
        }

        function aggregateScore(array, score) {
            var obj = {};
            array.forEach(function (val) {
                if (!obj[val.key])
                    obj[val.key] = val[score];
                else
                    obj[val.key] = val[score] + obj[val.key];
            });
            return obj;
        }

        g = graphdata;
        store = $.extend(true, {}, graphdata);

        initGraph();

        // console.log(nodes.data());

        function initGraph() {

            var link = dataContainer.selectAll("custom.line");
            var node = dataContainer.selectAll("custom.circle");

            // update selections
            link = link.data(g.links, function (d) {
                return d.id;
            })
            node = node.data(g.nodes, function (d) {
                return d.id;
            })

            console.log("updateNode:", node);
            console.log("updateLink:", link);

            // update links and nodes
            var newLink = link.enter().append("custom").attr("class", "line");
            var newNode = node.enter().append("custom").attr("class", "circle");

            console.log("newNode:", newNode);
            // console.log(g.nodes);

            // update + enter
            link = link.merge(newLink);
            node = node.merge(newNode);

            // exit selections
            link.exit().remove();
            node.exit().remove();

            console.log("finalNode:", node);

            simulation
                .nodes(g.nodes)
                .on("tick", ticked);

            simulation.force("link")
                .links(g.links);

            // simulation.force("collide").strength(0.2).radius(function (d) {
            //     return d.degree * 0.005;
            // })

            simulation.alpha(.8).restart();

            // calculate degree and score simultaneously
            degreeList = [];
            scoreList = []

            link.each(function (edge, i) {
                // console.log(edge.target);
                degreeList.push(edge.target.id);
                scoreList.push({
                    "key": edge.target.id,
                    "selfScore": edge.self_score,
                    "validScore": edge.valid_score
                })
            })

            // console.log("finalLink:", link);
            // console.log("degreelist:", degreeList);

            degreeData = aggregate(degreeList);
            var aggregateSelfscore = aggregateScore(scoreList, "selfScore");
            var aggregateValidscore = aggregateScore(scoreList, "validScore");

            degree = Object.keys(degreeData).map(key => ({
                id: key,
                weight: degreeData[key]
            }));

            selfScore = Object.keys(aggregateSelfscore).map(key => ({
                id: key,
                self_score: aggregateSelfscore[key] / degreeData[key]
            }));

            validScore = Object.keys(aggregateValidscore).map(key => ({
                id: key,
                valid_score: aggregateValidscore[key] / degreeData[key]
            }))

            console.log("degreeData:", degreeData);
            minDegree = Math.min.apply(null, degree.map(item => item.weight));
            maxDegree = Math.max.apply(null, degree.map(item => item.weight));
            // console.log("minDegree:", minDegree);

            // normalize degree into 0-1
            function normalize(val, max, min) {
                return (val - min) / (max - min);
            }
            degree.forEach(function (d) {
                d.norWeight = normalize(d.weight, maxDegree, minDegree);
            });

            // console.log("degreeList: ", degreeList);
            console.log("degree:", degree);


            // var newDegree = degree.find(o => o.id === node.id);
            // console.log("node.id:", link.target.id)
            simulation.force('collide', d3.forceCollide(function (d) {
                if (maxDegree > threshold_a) {
                    if (d.domain === "Y") {
                        var newDegree = degree.find(o => o.id === d.id);
                        return newDegree.weight * radius_a;
                    } else {
                        return d.degree * radius_a;
                    }
                } else {
                    if (d.domain === "Y") {
                        // console.log(d.id);
                        var newDegree = degree.find(o => o.id === d.id);
                        return newDegree.weight * 0.1;
                    } else {
                        return d.degree * radius_a;
                    }
                }
            }));

            // create zooming
            function zoomed() {
                transform = d3.event.transform;
                ticked();
            }

            d3.select(canvas)
                .call(d3.drag().subject(dragsubject).on("start", dragstarted).on("drag", dragged).on("end", dragended))
                .call(d3.zoom().scaleExtent([1 / 10, 8]).on("zoom", zoomed))

        }

        function ticked() {

            // console.log(nodes);
            // var nodes = dataContainer.selectAll('custom.circle');
            // var links = dataContainer.selectAll('custom.line');

            // set font based on degree
            function getFont(val) {
                var size = Math.log(val.weight) * 1.5;
                return (size | 0) + "px roboto";
            }

            // draw nodes and edges
            context.save();
            context.clearRect(0, 0, width_network, height_network);
            context.translate(transform.x, transform.y)
            context.scale(transform.k, transform.k)

            for (const circle of g.nodes) {
                context.beginPath();
                drawNode(circle);
                // console.log(node);
                if (circle.domain) {

                    var newDegree = degree.find(o => o.id === circle.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight))

                    // console.log("maxDegree:", maxDegree);

                    context.fillStyle = "rgba(200, 200, 200, 1)";
                    if (maxDegree > threshold_a) {
                        context.arc(circle.x, circle.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                    } else if (threshold_a > maxDegree > threshold_b) {
                        context.arc(circle.x, circle.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                    } else {
                        context.arc(circle.x, circle.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                    }
                    context.fill();

                    // context.fillStyle = "rgba(255, 255, 255, 1)";
                    // context.font = "18px roboto";
                    // context.fillText(node.id, node.x + 20, node.y - 10);
                } else {
                    context.arc(circle.x, circle.y, 1, 0, 2 * Math.PI);
                    context.fillStyle = "rgba(255, 255, 255, 0.2)";
                    context.fill();
                }
            }

            if (positionLevel) {
                for (const circle of g.nodes) {
                    if (!circle.domain && circle.position == positionLevel) {
                        context.beginPath();
                        drawNode(circle);
                        context.arc(circle.x, circle.y, 2.5, 0, 2 * Math.PI);
                        context.fillStyle = "rgba(255, 86, 74, 0.8)";
                        context.fill();

                        context.fillStyle = "rgba(255, 255, 255, 1)";
                        context.font = "14px roboto";
                        context.fillText((circle.id + " " + circle.region), circle.x + 5, circle.y + 2);
                    }
                }
            }

            //add draw conditions for tooltips
            if (closeNode && filterValue === 'default' && !score) {
                context.beginPath();
                drawNode(closeNode);

                for (const edge of g.links) {
                    var newDegree = degree.find(o => o.id === edge.target.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight));
                    // if mouse over domain
                    if (edge.target.id == closeNode.id) {
                        context.beginPath();

                        drawLink(edge);
                        context.strokeStyle = "rgba(10, 171, 179, 0.5)";
                        context.lineWidth = 0.05;
                        context.stroke();

                        drawNode(edge.source);
                        context.arc(edge.source.x, edge.source.y, 1, 0, 2 * Math.PI);
                        context.fillStyle = "rgba(10, 171, 179, 1)";
                        context.fill();
                    }
                    // if mouse over employee
                    else if (edge.source.id == closeNode.id) {
                        context.beginPath();

                        drawLink(edge);
                        context.strokeStyle = "rgba(10, 171, 179, 0.5)";
                        context.lineWidth = 1;
                        context.stroke();

                        drawNode(edge.target);
                        if (maxDegree > threshold_a) {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                        } else {
                            context.arc(edge.target.x, edge.target.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                        }
                        context.fillStyle = "rgba(10, 171, 179, 1)";
                        context.fill();
                    }
                }

                if (closeNode.domain) {

                    var newDegree = degree.find(o => o.id === closeNode.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight));

                    drawNode(closeNode);
                    if (maxDegree > threshold_a) {
                        context.arc(closeNode.x, closeNode.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                    } else if (threshold_a > maxDegree > threshold_b) {
                        context.arc(closeNode.x, closeNode.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                    } else {
                        context.arc(closeNode.x, closeNode.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                    }
                    context.fillStyle = "rgba(10, 171, 179, 1)";
                    context.fill();

                    context.fillStyle = "rgba(240, 240, 240, 1)";
                    context.font = getFont(newDegree);
                    context.fillText(closeNode.id, closeNode.x + 2, closeNode.y + 2);

                } else {

                    drawNode(closeNode);
                    context.arc(closeNode.x, closeNode.y, 1, 0, 2 * Math.PI);
                    context.fillStyle = "rgba(10, 171, 179, 1)";
                    context.fill();

                    context.fillStyle = "rgba(255, 255, 255, 1)";
                    context.font = "10px roboto";
                    context.fillText((closeNode.id + " " + closeNode.region), closeNode.x + 20, closeNode.y - 10);
                }
            }

            //add draw conditions based on group filter
            if (filterValue === "gender") {
                for (const circle of g.nodes) {
                    context.beginPath();
                    drawNode(circle);

                    var newDegree = degree.find(o => o.id === circle.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight));

                    if (!circle.domain) {
                        if (circle.sex === "F") {
                            context.fillStyle = "rgba(255, 253, 41, 0.3)";
                            context.arc(circle.x, circle.y, 1, 0, 2 * Math.PI);
                            context.fill();
                        } else {
                            context.fillStyle = "rgba(196, 71, 255, 0.3)";
                            context.arc(circle.x, circle.y, 1, 0, 2 * Math.PI);
                            context.fill();
                        }
                    } else {

                        context.fillStyle = "rgba(255, 255, 255, 0.5)";

                        if (maxDegree > threshold_a) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                        } else {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                        }
                        context.fill();

                        context.fillStyle = "rgba(240, 240, 240, 0.8)";
                        context.font = getFont(newDegree);
                        context.fillText(circle.id, circle.x + 2, circle.y + 2);
                    }
                }
            }

            var ageColor = [{
                    "age": "18-29",
                    "color": 'rgba(255, 176, 189, 0.8)'
                },
                {
                    "age": "30-39",
                    "color": 'rgba(185, 222, 128, 0.8)'
                },
                {
                    "age": "40-49",
                    "color": 'rgba(255, 192, 117, 0.8)'
                },
                {
                    "age": "50-59",
                    "color": 'rgba(122, 226, 216, 0.8)'
                },
                {
                    "age": "60-69",
                    "color": 'rgba(214, 203, 249, 0.8)'
                },
                {
                    "age": "70+",
                    "color": 'rgba(192, 192, 192, 0.8)'
                }
            ];

            if (filterValue === "age") {
                for (const circle of g.nodes) {
                    context.beginPath();
                    drawNode(circle);

                    var newDegree = degree.find(o => o.id === circle.id);
                    var maxDegree = Math.max.apply(null, degree.map(item => item.weight));

                    if (!circle.domain) {
                        var newColor = ageColor.find(o => o.age === circle.age_groups);
                        context.fillStyle = newColor.color;
                        context.arc(circle.x, circle.y, 1, 0, 2 * Math.PI);
                        context.fill();
                    } else {

                        context.fillStyle = "rgba(255, 255, 255, 0.5)";
                        if (maxDegree > threshold_a) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                        } else {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                        }
                        context.fill();

                        context.fillStyle = "rgba(240, 240, 240, 0.8)";
                        context.font = getFont(newDegree);
                        context.fillText(circle.id, circle.x + 2, circle.y + 2);
                    }
                }
            }

            if (score) {
                for (const circle of g.nodes) {
                    if (circle.domain) {

                        var newDegree = degree.find(o => o.id === circle.id);
                        var maxDegree = Math.max.apply(null, degree.map(item => item.weight));

                        var newSelfscore = selfScore.find(o => o.id === circle.id);
                        // var newValidscore = validScore.find(o => o.id === node.id);
                        context.beginPath();
                        drawNode(circle);

                        if (maxDegree > threshold_a) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_a, 0, 2 * Math.PI);
                        } else if (threshold_a > maxDegree > threshold_b) {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_b, 0, 2 * Math.PI);
                        } else {
                            context.arc(circle.x, circle.y, newDegree.weight * radius_c, 0, 2 * Math.PI);
                        }
                        context.fillStyle = 'rgb(' + Math.floor(255 - 83.3 * newSelfscore.self_score) + ', ' +
                            Math.floor(255 - 47 * newSelfscore.self_score) + ', ' +
                            Math.floor(255 - 40.3 * newSelfscore.self_score) + ')';
                        context.fill();

                        context.fillStyle = "rgba(240, 240, 240, 1)";
                        context.font = getFont(newDegree);
                        context.fillText(circle.id + " " + newSelfscore.self_score.toFixed(2), circle.x + 2, circle.y + 2);

                        // console.log(newSelfscore);

                    }
                }
            }

            context.restore();
        }

        //add tooltips for nodes
        var closeNode;
        d3.select(canvas).on("mousemove", function () {
            var p = d3.mouse(this);
            // console.log(p);
            var pZoom = transform.invert(p);
            closeNode = simulation.find(pZoom[0], pZoom[1]);
        });
        d3.select(canvas).on("mouseout", function () {
            closeNode = NaN;
        })

        function dragsubject() {
            var i,
                x = transform.invertX(d3.event.x),
                y = transform.invertY(d3.event.y),
                dx,
                dy;
            for (i = g.nodes.length - 1; i >= 0; --i) {
                node = g.nodes[i];
                dx = x - node.x;
                dy = y - node.y;

                if (dx * dx + dy * dy < 5 * 5) {
                    node.x = transform.applyX(node.x);
                    node.y = transform.applyY(node.y);

                    return node;
                }
            }
        }

        // drag functions
        function dragstarted() {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d3.event.subject.fx = transform.invertX(d3.event.x);
            d3.event.subject.fy = transform.invertY(d3.event.y);
        }

        function dragged() {
            d3.event.subject.fx = transform.invertX(d3.event.x);
            d3.event.subject.fy = transform.invertY(d3.event.y);
        }

        function dragended() {
            if (!d3.event.active) simulation.alphaTarget(0);
            d3.event.subject.fx = null;
            d3.event.subject.fy = null;
        }

        context.restore();

        // filter color by different groups
        var filterValue = $('#group').val();
        console.log("filter:", filterValue);
        $('#group').change(function () {

            filterValue = $(this).val();
            console.log(filterValue);
        })

        // apply score
        var score;
        $('#score:checkbox').change(function () {
            if (this.checked) {
                score = 1;
                console.log("checked");
            } else {
                score = null;
            }
        })

        function drawLink(d) {
            context.moveTo(d.source.x, d.source.y);
            context.lineTo(d.target.x, d.target.y);
        }

        function drawNode(d) {
            context.moveTo(d.x + 3, d.y);
        }

        // cartogram graph
        // var geojson = topojson.feature(data, data.objects.provinces).features;
        var geojson = topojson.feature(geodata, geodata.objects.regions).features;
        console.log(geojson);

        // Compute the projected centroid, area and length of the side
        // of the squares.
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

        var provinces = geograph.selectAll('path.province')
            .data(geojson)
            .enter()
            .append('path')
            .classed('province', true)
            .attr('d', pathGenerator);

        provinces.exit().remove();

        // console.log("degree:", degree);

        // Circles
        var prin_name = d3.select('.info');
        var circles = geograph.selectAll('circle.province')
            .data(geojson)
            .enter()
            .append('circle')
            .classed('province', true);

        console.log("geojson:", geojson);
        console.log("g.nodes", g.nodes);

        var regionList = [];
        g.nodes.forEach(function (d, i) {
            // console.log(edge.target);
            regionList.push(d.region);
        })

        function aggregate(array) {
            var obj = {};
            array.forEach(function (val) {
                if (!obj[val])
                    obj[val] = 1;
                else
                    obj[val]++;
            });
            return obj;
        }

        var regionCal = aggregate(regionList);
        console.log("regionCal:", regionCal);

        var uniqueRegion = regionList.filter((v, i, a) => a.indexOf(v) === i);

        console.log("uniqueRegion:", uniqueRegion);

        circles
            .attr('cx', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.centroid[0] - d.r / 2 + 10;
                }
            })
            .attr('cy', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.centroid[1] - d.r / 2 + 10;
                }
            })
            .attr('r', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.r / 2 - 2;
                }
            });

        // labels
        var labels = geograph.selectAll('text')
            .data(geojson)
            .enter()
            .append('text')
            .classed('txt_province', true)
        labels
            .attr('x', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.x0 - d.r / 2 + 10;
                }
            })
            .attr('y', function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.y0 - d.r / 2 + 10;
                }
            })
            // .text(d=>d.properties.prov_name)
            .text(function (d) {
                if (uniqueRegion.includes(d.properties.reg_name)) {
                    return d.properties.reg_name;
                }
            })

        // create a force simulation and add forces to it
        // new force simulation creation	
        var simulationGeo = d3.forceSimulation()
            .velocityDecay(0.5)
            .force("cx", d3.forceX().x(d => d.x0).strength(0.7))
            .force("cy", d3.forceY().y(d => d.y0).strength(0.7))
            .force("x", d3.forceX().x(d => d.x0).strength(0.7))
            .force("y", d3.forceY().y(d => d.y0).strength(0.7))
            // .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(function (d) {
                // return d.r/2;
                return d.r / 1.8;
            }))
            .force('charge', d3.forceManyBody().strength(3)) //make nodes repulse away from each other
            .stop();

        // Apply these forces to the nodes and update their positions.
        // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
        simulationGeo
            .nodes(geojson)
            .on("tick", function (d) {
                circles
                    .attr("cx", function (d) {
                        return d.x;
                    })
                    .attr("cy", function (d) {
                        return d.y;
                    })
                labels
                    .attr("x", function (d) {
                        return d.x;
                    })
                    .attr("y", function (d) {
                        return d.y;
                    })
            });
        simulationGeo.alpha(1).restart();

        // add filter for the network data
        var filterReg, filterNewReg;

        // add mouseover effects on region circle
        circles.on('mouseover', function (d) {
                // Highlight on mouse over
                d3.select(this).classed('highlighted', true);
                console.log(this);
                prin_name.append('text')
                    .classed('province-label', true)
                    .attr('x', 0)
                    .attr('y', 0)
                    .text(d.properties.reg_name);

                filterReg = d.properties.reg_name;
            })
            .on('mouseout', function (d) {
                d3.select(this).classed('highlighted', false);
                prin_name.selectAll('text.province-label').remove();

                filterReg = null;
            });

        circles.exit().remove();

        // filter nodes
        function filterData() {
            var domainList = [];
            var links = [];

            // filter link
            g.links.forEach(function (d, i) {
                if (d.source.region === filterReg) {
                    links.push(d);
                }
            })

            g.links = links;

            // find corresponding domains
            links.forEach(function (d, i) {
                domainList.push(d.target.id);
            })

            domainList = domainList.filter((v, i, a) => a.indexOf(v) === i);

            // update nodes
            store.nodes.forEach(function (d, i) {
                if (!d.domain && d.region !== filterReg) {
                    g.nodes.forEach(function (n, i) {
                        if (d.id === n.id) {
                            g.nodes.splice(i, 1);
                        }
                    })
                } else if (d.domain && !domainList.includes(d.id)) {
                    console.log(d.id);
                    g.nodes.forEach(function (n, i) {
                        if (d.id === n.id) {
                            g.nodes.splice(i, 1);
                        }
                    })
                }
            })

            initGraph();
        }

        // display filter region
        var prin_selected = d3.select('.selected');

        prin_selected.append('text')
            .classed('.selected-label', true)
            .text("selected region: all");

        // toggle filter by event
        circles.on('click', function (d) {

            prin_selected.text("selected region: " + d.properties.reg_name);

            if (!filterNewReg) {

                filterNewReg = filterReg; // record current region name
                filterData();

            } else if (filterNewReg && filterNewReg !== filterReg) {
                // reset to have all nodes
                g.links = [];
                g.nodes = [];

                store.links.forEach(function (d, i) {
                    g.links.push($.extend(true, {}, d));
                });

                store.nodes.forEach(function (d) {
                    g.nodes.push($.extend(true, {}, d));
                })

                console.log("g.nodes:", g.nodes);

                initGraph();

                // filter by new region name
                filterNewReg = filterReg; // record current region name

                filterData();
            }
        })

        // reset network data
        var allCircles = d3.selectAll("circle");

        function equalToEventTarget() {
            return this == d3.event.target;
        }

        cartogram.on("click", function (d) {
            var outside = allCircles.filter(equalToEventTarget).empty();
            if (outside) {

                prin_selected.text("selected region: all");

                g.links = [];
                g.nodes = [];

                store.links.forEach(function (d, i) {
                    // g.nodes.splice(d,1)
                    g.links.push($.extend(true, {}, d));
                });

                store.nodes.forEach(function (d) {
                    // g.links.splice(d,1)
                    g.nodes.push($.extend(true, {}, d));
                })

                // console.log("g.nodes:", g.nodes);

                initGraph();
            }
        })


        // tree graph

        var positionLevel;

        var tree = d3.tree()
            .size([2 * Math.PI, radius])
            .separation(function (a, b) {
                return (a.parent == b.parent ? 1 : 2) / a.depth;
            });

        const depthScale = d3.scaleOrdinal()
            // .domain([0,5])
            // .range(['#F1F9FB','#314F94']);
            .domain([0, 1, 2, 3, 4, 5])
            .range(['white', '#F1F9FB', '#DDF1F2', '#BAD7EA', '#628ABF', '#314F94']);

        updateTree(treedata);

        function updateTree(data) {
            var root = tree(d3.hierarchy(data));
            console.log(root.descendants());

            var link = positiontree.selectAll(".link")
                .data(root.links())
                .enter().append("path")
                .attr("class", "treelink")
                .attr("d", d3.linkRadial()
                    .angle(function (d) {
                        return d.x;
                    })
                    .radius(function (d) {
                        return d.y;
                    }))
                .style("stroke-width", function (d) {
                    return 0.2;
                });

            var node = positiontree.selectAll(".node")
                .data(root.descendants())
                .enter().append("g")
                .attr("class", function (d) {
                    return "node" + (d.children ? "tree--internal" : "tree--leaf");
                })
                .attr("transform", function (d) {
                    return "translate(" + radialPoint(d.x, d.y) + ")";
                });

            node.append("circle")
                .attr("r", function (d) {
                    // return d.data.number;
                    return 1;
                })
                .attr("fill", "#fff")
                .style('opacity', 1);


            node.append("circle")
                .attr("r", function (d) {
                    // return d.data.number;
                    return 6;
                })
                .style('opacity', 0);


            // add mouseover effects on tree nodes
            var tree_name = d3.select('.position');

            // Highlight on mouse over
            node.on('mouseover', function (d) {
                    d3.select(this).classed('treehighlighted', true)
                    tree_name.append('text')
                        .classed('province-label', true)
                        .attr('x', 0)
                        .attr('y', 0)
                        .text(`${d.data.name},${d.data.position_name}`);

                    positionLevel = d.data.name;
                    console.log("positionLevel", positionLevel);
                })
                .on('mouseout', function (d) {
                    positionLevel = null;
                    d3.select(this).classed('treehighlighted', false);
                    tree_name.selectAll('text.province-label').remove();
                });
        }

        function radialPoint(x, y) {
            return [(y = +y) * Math.cos(x -= Math.PI / 2), y * Math.sin(x)];
        }

    })