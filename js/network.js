var width = window.innerWidth;
var height = window.innerHeight;

var canvas = d3.select("#graph").append("canvas")
    .attr("width", width + "px")
    .attr("height", height + "px")
    .node();

var context = canvas.getContext("2d");

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function (d) {
        return d.id;
    }))
    .force("charge", d3.forceManyBody().strength(-6))
    .force("collide", d3.forceCollide().strength(0.2).radius(0.5))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .alphaTarget(0)

var transform = d3.zoomIdentity;

d3.json("./data/proto_data.json", function (error, graph) {
    if (error) throw error;

    initGraph(graph)

    var degree;

    function initGraph(tempData) {

        // calculate degree simultaneously
        var degreeList = [];
        for (const edge of graph.links) {
            degreeList.push(edge.target);
        }

        function aggregate(array) {
            var obj = {};
            array.forEach(function (val) {
                if (!obj[val])
                    // create new property if property is not found
                    obj[val] = 1;
                else
                    // increment matched property by 1
                    obj[val]++;
            });
            return obj;
        }

        var degreeData = aggregate(degreeList);
        degree = Object.keys(degreeData).map(key => ({
            id: key,
            weight: degreeData[key]
        }));

        // create zooming
        function zoomed() {
            transform = d3.event.transform;
            ticked();
        }

        d3.select(canvas)
            .call(d3.drag().subject(dragsubject).on("start", dragstarted).on("drag", dragged).on("end", dragended))
            .call(d3.zoom().scaleExtent([1 / 10, 8]).on("zoom", zoomed))

        simulation
            .nodes(tempData.nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(tempData.links);

        simulation.force("collide").radius((d) => {
            return d.degree * 0.007
        })

    }

    console.log(degree);

    function ticked() {

        // set font based on degree
        function getFont(val) {
            var size = Math.log(val.degree) * 1.5;
            return (size | 0) + "px roboto";
        }

        // draw nodes and edges
        context.save();
        context.clearRect(0, 0, width, height);
        context.translate(transform.x, transform.y)
        context.scale(transform.k, transform.k)

        for (const node of graph.nodes) {
            context.beginPath();
            drawNode(node);
            // console.log(node);
            if (node.domain) {

                var newDegree = degree.find(o => o.id === node.id);

                context.fillStyle = "rgba(255, 255, 255, 0.5)";
                context.arc(node.x, node.y, newDegree.weight * 0.004, 0, 2 * Math.PI);
                context.fill();

                // context.fillStyle = "rgba(255, 255, 255, 1)";
                // context.font = "18px roboto";
                // context.fillText(node.id, node.x + 20, node.y - 10);
            } else {
                context.arc(node.x, node.y, 1, 0, 2 * Math.PI);
                context.fillStyle = "rgba(255, 255, 255, 0.2)";
                context.fill();
            }
        }

        //add draw conditions for tooltips
        if (closeNode && filterValue === 'default') {
            context.beginPath();
            for (const edge of graph.links) {
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
                    context.arc(edge.target.x, edge.target.y, edge.target.degree * 0.004, 0, 2 * Math.PI);
                    context.fillStyle = "rgba(10, 171, 179, 1)";
                    context.fill();
                }
            }

            drawNode(closeNode);

            context.fillStyle = "rgba(10, 171, 179, 0.5)";
            context.arc(closeNode.x, closeNode.y, closeNode.degree * 0.004, 0, 2 * Math.PI);
            context.fill();

            if (closeNode.domain) {
                context.fillStyle = "rgba(240, 240, 240, 1)";
                context.font = getFont(closeNode);
                context.fillText(closeNode.id, closeNode.x + 20, closeNode.y + 10);
            } else {
                context.fillStyle = "rgba(255, 255, 255, 1)";
                context.font = "10px roboto";
                context.fillText(closeNode.id, closeNode.x + 20, closeNode.y - 10);
            }
        }

        //add draw conditions based on group filter
        if (filterValue === "gender") {
            for (const node of graph.nodes) {
                context.beginPath();
                drawNode(node);

                if (!node.domain) {
                    if (node.sex === "F") {
                        context.fillStyle = "rgba(255, 253, 41, 0.3)";
                        context.arc(node.x, node.y, 1, 0, 2 * Math.PI);
                        context.fill();
                    } else {
                        context.fillStyle = "rgba(196, 71, 255, 0.3)";
                        context.arc(node.x, node.y, 1, 0, 2 * Math.PI);
                        context.fill();
                    }
                } else {
                    context.fillStyle = "rgba(240, 240, 240, 0.8)";
                    context.font = getFont(node);
                    context.fillText(node.id, node.x + 20, node.y + 10);
                }
            }
        }

        context.restore();
    }

    //add tooltips for nodes
    var closeNode;
    d3.select(canvas).on("mousemove", function () {
        var p = d3.mouse(this);
        var pZoom = transform.invert(p);
        closeNode = simulation.find(pZoom[0], pZoom[1]);
        // console.log(p);
    });
    d3.select(canvas).on("mouseout", function () {
        closeNode = NaN;
    })

    // for (const edge of graph.links) {
    //   // console.log(edge.target)
    //   if (edge.target.id === "Advisory") {
    //     // console.log(edge.id);
    //     context.beginPath();
    //     drawLink(edge);
    //     context.lineWidth = 0.05;
    //     context.strokeStyle = "red";
    //     context.stroke();

    //     drawNode(edge.source);
    //     context.arc(edge.source.x, edge.source.y, 1, 0, 2 * Math.PI);
    //     context.fillStyle = "red";
    //     context.fill();

    //     drawNode(edge.target);
    //     context.arc(edge.target.x, edge.target.y, edge.target.degree * 0.004, 0, 2 * Math.PI);
    //     context.fillStyle = "red";
    //     context.fill();
    //   }
    // }

    function dragsubject() {
        var i,
            x = transform.invertX(d3.event.x),
            y = transform.invertY(d3.event.y),
            dx,
            dy;
        for (i = graph.nodes.length - 1; i >= 0; --i) {
            node = graph.nodes[i];
            dx = x - node.x;
            dy = y - node.y;

            if (dx * dx + dy * dy < 5 * 5) {
                node.x = transform.applyX(node.x);
                node.y = transform.applyY(node.y);

                return node;
            }
        }
    }

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
    console.log(filterValue);
    $('#group').change(function () {

        context.save();
        context.clearRect(0, 0, width, height);
        context.translate(transform.x, transform.y)
        context.scale(transform.k, transform.k)

        filterValue = $(this).val();
        console.log(filterValue);
    })
});

function drawLink(d) {
    context.moveTo(d.source.x, d.source.y);
    context.lineTo(d.target.x, d.target.y);
}

function drawNode(d) {
    context.moveTo(d.x + 3, d.y);
}