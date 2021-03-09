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
    .force("charge", d3.forceManyBody().strength(-10))
    .force("collide", d3.forceCollide().strength(0.2).radius(0.5))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .alphaTarget(0)

var transform = d3.zoomIdentity;

d3.json("./data/proto_data.json", function (error, graph) {
    if (error) throw error;

    initGraph(graph)

    function initGraph(tempData) {

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

    function ticked() {
        context.save();

        context.clearRect(0, 0, width, height);
        context.translate(transform.x, transform.y)
        context.scale(transform.k, transform.k)
        // context.translate(width / 2, height / 2);

        for (const node of graph.nodes) {
            context.beginPath();
            drawNode(node);
            // console.log(node);
            if (node.domain) {
                context.fillStyle = "rgba(255, 255, 255, 0.5)";
                context.arc(node.x, node.y, node.degree * 0.004, 0, 2 * Math.PI);
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

        //add conditions for tooltips
        if (closeNode) {
            context.beginPath();
            for (const edge of graph.links) {
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
            }

            drawNode(closeNode);

            context.fillStyle = "rgba(10, 171, 179, 0.5)";
            context.arc(closeNode.x, closeNode.y, closeNode.degree * 0.004, 0, 2 * Math.PI);
            context.fill();

            // set font based on degree
            function getFont() {
                // var ratio = 0.003;
                var size = Math.log(closeNode.degree) * 2;
                return (size|0) + "px roboto";
            }

            if (closeNode.domain) {
                context.fillStyle = "rgba(240, 240, 240, 1)";
                context.font = getFont();
                context.fillText(closeNode.id, closeNode.x + 20, closeNode.y + 10);
            } else {
                context.fillStyle = "rgba(255, 255, 255, 1)";
                context.font = "10px roboto";
                context.fillText(closeNode.id, closeNode.x + 20, closeNode.y - 10);
            }
        }

        context.restore();
    }

    //add tooltips for nodes
    var closeNode;
    d3.select(canvas).on("mousemove", function () {
        var p = d3.mouse(this);
        var pZoom = transform.invert(p);
        closeNode = simulation.find(pZoom[0],pZoom[1]);
        // console.log(p);
        ticked();
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
});

function drawLink(d) {
    context.moveTo(d.source.x, d.source.y);
    context.lineTo(d.target.x, d.target.y);
}

function drawNode(d) {
    context.moveTo(d.x + 3, d.y);
}