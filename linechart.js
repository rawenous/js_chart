date1 = "2017-08-17T09:18:01Z";
date2 = "2017-08-17T11:18:01Z";
minDate = d3.isoParse(date1).getTime();
maxDate = d3.isoParse(date2).getTime();

// minDate = d3.isoParse("2015-01-05T21:55:43.702900257Z").getTime();
// maxDate = d3.isoParse("2015-03-05T21:55:43.702900257Z").getTime();

DATABASE = "epgdb";

// Set the dimensions of the canvas / graph
this.MARGINS = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 50
};

// Default width and height
WIDTH = 600;
HEIGHT = 270;

// Set the ranges
xScale = d3.scaleTime().range([MARGINS.left, WIDTH - MARGINS.right]);
yScale = d3.scaleLinear().range([HEIGHT - MARGINS.top, MARGINS.bottom]);

// Define the axes
xAxis = d3.axisBottom(xScale).ticks(5);
yAxis = d3.axisLeft(yScale).ticks(5);

// Default lineGen function
lineGen = d3.line()
    .x(function(d) {
        return xScale(d3.isoParse(d[0]).getTime());

    })
    .y(function(d) {
        return yScale(d[1]);
    });

// Create color array which will give each line a different color
var lineColor = d3.scaleOrdinal(d3.schemeCategory10);

function build_dashboard(dash_data) {

    console.log("dash_data:" + dash_data);
    graphs = dash_data.graphs;
    var id = 0;

    graphs.forEach(function (d) {
        var graphId = "graph_" + id;
        addChart(d, graphId);
        testReq(d, graphId, addChartData);
        id++;
    });
}

function parseMeasurementData(graph_query) {
    // return getMeasurement(graph_query).then(JSON.parse).then(function(response) {
    //     console.log("yay json!" + response.results[0].series[0]);
    // });

    return getMeasurement(graph_query).then(JSON.parse);
}
function getMeasurement(graph_query) {
    return new Promise(
        function(resolve, reject) {

            var httpRequest = new XMLHttpRequest();
            var query = `select ${graph_query.field_key} from ${graph_query.measuerment} where time >= '${date1}' and time <= '${date2}'`;
            console.log("db query: " + query);
            var url = `http://localhost:8086/query?db=${DATABASE}&q=${query}`;
            httpRequest.open('GET', url);

            httpRequest.onload = function() {
                if (httpRequest.status === 200) {
                    // Perfect!
                    console.log(httpRequest.response);
                    resolve(httpRequest.response);
                } else {
                    // Otherwise reject with the status text
                    // which will hopefully be a meaningful error
                    reject(Error(httpRequest.statusText));
                }
            };

            // Handle network errors
            httpRequest.onerror = function() {
                reject(Error("Network Error"));
            };
            // Make the request
            httpRequest.send();
        });
}

function testReq(graph, id, chartDataFunction, depth) {
    var promises = [];
    graph.queries.forEach(function(graph_query) {
        promises.push(parseMeasurementData(graph_query));
    });

    Promise.all(promises)
        .then(function(data) {
            //data.forEach(function(measurement_data) {
            chartDataFunction(graph, id, data, depth);
            console.log("response:" + data);
            //});
    }).catch(function(error) {
        console.log("db query failed: " + error);
    });


}

function addChart(graphInfo, id) {

    // Adds the svg canvas
    var vis = d3.select("body")
        .append("svg")
        .attr("id", id)
        .attr("class", id)
        .attr("width", WIDTH)
        .attr("height", HEIGHT);

        // Add chart text description
        vis.append("text")
            .attr("x", WIDTH/2)
            .attr("y", MARGINS.top)
            .text(graphInfo.name)
            .attr("font-size", "13px")
            .attr("text-anchor", "top");

}

function getChartByName(chartName) {

    var chart = null;

    for(var i = 0; i < graphs.length; i++) {
        if (chartName == graphs[i].name) {
            chart = graphs[i];
            break;
        }
    }
    return chart;
}

function addChartData(graphInfo, id, data_list, depth) {

    console.log("entering addChartData");

    var maxValue = 0;
    var graphData = [];

    data_list.forEach(function(json_data) {
        var results = json_data.results;
        for(var i = 0; i < results.length; i++) {
            var curValues = results[i].series[0].values;

            graphData.push({"name" : results[i].series[0].columns[1],
                            "values" : curValues});

            // Find largest value so we can scale the y axis
            for(var j = 0; j < curValues.length; j++) {
                var value = curValues[i][1];
                if (maxValue < value) {
                    maxValue = value;
                }

            }
        }
    });

    console.log("maxvalue:" + maxValue);

    // Scale the range of the data
    xScale.domain([minDate, maxDate]);
    yScale.domain([0, maxValue]);

    // And override with new chart name
    console.log("graphinfo=" + graphInfo.name + ", id=" + id);
    d3.select("." + id).select("text")
        .text(graphInfo.name);

    var vis = d3.select("." + id);

    // Add the valueline path.
    for (var k = 0; k < graphData.length; k++) {
        // Add larger strokewidth to drilldown line
        var strokeWidth = 2;
        if  (graphInfo.queries[k].drilldown != "") {
            strokeWidth = 3;
        }

        console.log("woho curvalues" + graphData[k].values);

        vis.append("path")
            .attr("class", "line_" + k)
            .attr("d", lineGen(graphData[k].values))
            .attr("stroke", function() {
                return lineColor(k);
            })
            .attr("stroke-width", strokeWidth)
            .attr("fill", "none")

            .on("click", function() {
                if (graphInfo.queries[k].drilldown != "") {
                    depth++;
                    testReq(getChartByName(graphInfo.queries[k].drilldown), id, updateChartData, depth);
                }
            });
    }

    // Add the X Axis
    vis.append("g")
        .attr("class", "x_axis")
        .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
        .call(xAxis);

    // Add the Y Axis
    vis.append("g")
        .attr("class", "y_axis")
        .attr("transform", "translate(" + (MARGINS.left) + ",0)")
        .call(yAxis);


        // TODO: I cant get append and select combined with the data/enter functions to work.
        // console.log("about to draw data! graphData.length=" + graphData.length);
        // for (var k = 0; k < graphData.length; k++) {
        //     // Add larger strokewidth to drilldown line
        //     var strokeWidth = 2;
        //     if  (graphInfo.queries[0][1] != 0) {
        //         strokeWidth = 3;
        //     }
        //     var vis = d3.select("." + id);
        //     var update = vis.selectAll("path.line_" + k)
        //         .data(graphData[k].values, function(d) {
        //             console.log(d3.isoParse(d[0]).getTime());
        //             return d3.isoParse(d[0]).getTime(); // Return timestamp as key
        //         });
        //     var enter = update.enter()
        //         .append("path")
        //         .attr("class", "line_" + k)
        //         .attr("d", lineGen(graphData[k].values))
        //         .attr("stroke", function() {
        //             console.log("adding drill down function for=" + graphInfo.name);
        //             return lineColor(k);
        //         })
        //         .attr("stroke-width", strokeWidth)
        //         .attr("fill", "none")
        //         .on("click", function() {

        //             console.log("onclick!");

        //             var id2 = 0;
        //             graphs.forEach(function (d) {
        //                 var graphId = "graph_" + id2;
        //                 id2++;
        //                 console.log("subchart: " + graphInfo.queries[0][1]);
        //                 if (graphInfo.queries[0][1] == d.name) {
        //                     // Second item in queries is the subchart for this line
        //                     console.log("update data!");
        //                     updateData(d, id);
        //                 }
        //             });
        //         });

        //     var exit = update.exit();
        //     exit.style("stroke", "red");
        //     update.style("stroke", "black");
        //     enter.style('stroke', 'green');
        //     exit.style('stroke', 'red')
        //         .remove();
        //     update.merge(enter);

        // }

}


function updateChartData(graphInfo, id, data_list, depth) {

    if(graphInfo == null) {
        return;
    }

        var maxValue = 0;
        var graphData = [];


    data_list.forEach(function(json_data) {

        var results = json_data.results;
        for(var i = 0; i < results.length; i++) {
            var curValues = results[i].series[0].values;
            graphData.push({"name" : results[i].series[0].name,
                            "values" : curValues});

            // Find largest value so we can scale the y axis
            for(var j = 0; j < curValues.length; j++) {
                var value = curValues[i][1];
                if (maxValue < value) {
                    maxValue = value;
                }

            }
        }
    });


        // Scale the range of the data
        xScale.domain([minDate, maxDate]);
        yScale.domain([0, maxValue]);

        // Save current chart name
        currentChartName = d3.select("." + id).select("text")
            .html();

        // And override with new chart name
        d3.select("." + id).select("text")
            .text(graphInfo.name);

        // Select the section we want to apply our changes to
        // TODO: Why didn't select by id work? Because you should've done like this
        // d3.select("#" + id)
        var svg = d3.select("." + id);

        // Add circle that goes back when you click it
        if (depth != 0) {
        var svg_back = d3.select("." + id).append("circle")
            .attr("r", 10)
            .attr("cx", WIDTH - MARGINS.right)
            .attr("cy", MARGINS.top)
            .attr("fill", "purple")
            .on("click", function(d) {
                depth--;
                testReq(getChartByName(currentChartName), id, updateChartData, depth);
                d3.select(this).remove();
            });
        }
        // Add the valueline path.
        for (var k = 0; k < graphData.length; k++) {

            // Add the drilldown functionality for this chart
            svg.select(".line_" + k)
                .on("click", function() {
                    // Second item in queries is the subchart for this line

                    if (graphInfo.queries[k].drilldown != "") {
                        depth++;
                        testReq(getChartByName(graphInfo.name), id, updateChartData, depth);
                    }
                });

            svg.select(".line_" + k)
                .transition()
                .duration(750)
                .attr("d", lineGen(graphData[k].values))
                .attr("stroke", function() {
                    return lineColor(k);
                })
                .attr("stroke-width", 2)
                .attr("fill", "none");

            svg.select(".x_axis") // change the x axis
                .transition()
                .duration(750)
                .call(xAxis);
            svg.select(".y_axis") // change the y axis
                .transition()
                .duration(750)
                .call(yAxis);

        }
}

d3.json("dashboard.json", function(d) {
    build_dashboard(d); }
       );
