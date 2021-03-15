var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

var color = d3.scaleOrdinal(d3.schemeCategory10);

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function (d) {
        return d.id;
    }))
    .force("charge", d3.forceManyBody().strength(-50))
    .force("collide", d3.forceCollide())
    .force("center", d3.forceCenter(width / 2, height / 2));

var link = svg.append("g").selectAll("g");
var node = svg.append("g").selectAll("g");

var g, store, addNodes, addLinks;

d3.json("./data/graph_agrigento.json", function (error, graph) {
    if (error) throw error;

    g = graph;
    store = $.extend(true, {}, graph);

    update();

    // slice specific age
    addNodes = g.nodes.filter(d => {
        return d.age_group === "40-49"
    })
    addLinks = g.links.filter(d => {
        return d.age_group === "40-49"
    })
    // g.nodes.forEach(function(d){
    //     newAge.nodes.splice(d,1);
    //     if(d.age_group === "40-49"){
    //         newAge.nodes.push($.extend(true, {},d));
    //     };
    // })
    // g.links.forEach(function(d){
    //     newAge.links.splice(d,1);
    //     if(d.source.age_group === "40-49"){
    //         newAge.links.push($.extend(true, {},d));
    //     }
    // })

    console.group("age40-49");
    console.log(addNodes);
    console.log(addLinks);
    console.groupEnd();

    // reset
    $("#reset").on("click", function () {
        store.nodes.forEach(function(d){
            g.nodes.splice(d,1)
            g.nodes.push($.extend(true, {}, d))
        });
        store.links.forEach(function(d){
            g.links.splice(d,1)
            g.links.push($.extend(true, {}, d))
        })
        console.log(g);
        update();
    });

});

// filter
$("#filter").on("click", function () {
    store.nodes.forEach(function () {
        g.nodes.forEach(function (d, i) {
            if (d.age_group === "40-49") {
                g.nodes.splice(i, 1);
            }
        });
    })

    store.links.forEach(function () {
        g.links.forEach(function (d, i) {
            if (d.source.age_group === "40-49") {
                g.links.splice(i, 1);
            }
        });
    })
    console.group('g')
    console.log(g.nodes)
    console.groupEnd()

    update();
});

// add back specific age group
$("#add").on("click", function () {
    var count = 0;

    g.nodes.forEach(function (d, i) {
        if (d.age_group === "40-49") {
            count++;
        }
    });

    console.group('g')
    console.log(g.nodes)
    console.groupEnd()

    if (count === 0) {
        console.log("count= " + count)
        for (var i = 0; i < addNodes.length; i++) {
            g.nodes.push(addNodes[i]);
        }
        for (var i = 0; i < addLinks.length; i++) {
            g.links.push(addLinks[i]);
        }
        console.group('g')
        console.log(g)
        console.groupEnd()

        update();
    } else {
        console.log("count= " + count)
    }
});


function update() {
    // update link
    link = link.data(g.links, function (d) {
        return d.id;
    });

    console.log("link1:" + link);

    link.exit().remove();

    var newLink = link
        .enter().append("line")
        .attr("class", "links")
        .attr("stroke-width", function(d){
            if (d.source === "43239"){
                return 0.1;
            }
        })
        .attr("stroke", function(d){
            if (d.target === "Procurement & Cost Management"){
                return;
            }
        })
    .attr("stroke-width", function (d) {
        return Math.sqrt(d.degree)
    });

    //console.log(newLink)

    link = link.merge(newLink);

    console.log("link2:" + link);

    // update node
    node = node.data(g.nodes, function (d) {
        return d.id;
    });

    node.exit().remove();

    var newNode = node
        .attr("class", "nodes")
        .enter().append("g")

    newNode.append("circle")
        .attr("r", function (d) {
            if (d.domain) {
                return (0.1*d.degree);
            } else {
                return 0.5;
            }
        })
        .attr("fill", function (d) {
            if (d.id === "Procurement & Cost Management") {
                return '#c0c0c0';
            } else if (d.domain) {
                return '#c0c0c0';
            }else {
                return '#c0c0c0';
            }
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))

    // newNode.append("text")
    //     .text(function (d) {
    //         if (d.domain) {
    //             return d.id;
    //         }
    //     })
    //     .attr('x', 6)
    //     .attr('y', 3)
    //     .attr('fill','white');

    node = node.merge(newNode);

    //console.log(newNode)

    // update simulation nodes
    simulation
        .nodes(g.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(g.links);

    simulation.alpha(0.2).alphaTarget(0).restart();

    simulation.alphaDecay();
}

function ticked() {
    node
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })

    link
        .attr("x1", function (d) {
            return d.source.x;
        })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        });
}

function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}
