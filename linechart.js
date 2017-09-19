minDate = d3.isoParse("2015-01-05T21:55:43.702900257Z").getTime();
maxDate = d3.isoParse("2015-03-05T21:55:43.702900257Z").getTime();

// Create color array which will give each line a different color
var lineColor = d3.scaleOrdinal(d3.schemeCategory10);

function build_dashboard(dash_data) {
    var graphs = dash_data.graphs;
    var id = 0;

    graphs.forEach(function (d) {
        var chart = new LineChart();
        var graphId = "graph_" + id;
        chart.addChart(d, graphs, graphId);
        id++;
    });
}

function LineChart() {

    // Set the dimensions of the canvas / graph
    this._MARGINS = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 50
    };

    this._WIDTH = 600;
    this._HEIGHT = 270;


    // // Set the ranges
    this._xScale = d3.scaleTime().range([this._MARGINS.left, this._WIDTH - this._MARGINS.right]);
    this._yScale = d3.scaleLinear().range([this._HEIGHT - this._MARGINS.top, this._MARGINS.bottom]);

    // Define the axes
    this._xAxis = d3.axisBottom(this._xScale).ticks(5);
    this._yAxis = d3.axisLeft(this._yScale).ticks(5);

    var _this = this;

    // Define the line
    this.lineGen = d3.line()
        .x(function(d) {
            return _this._xScale(d3.isoParse(d[0]).getTime());

        })
        .y(function(d) {
            return _this._yScale(d[1]);
        });
 
    this.addChart = function(graphInfo, allGraphs, id) {

        var _this = this;

        // Adds the svg canvas
        var vis = d3.select("body")
            .append("svg")
            .attr("id", id)
            .attr("class", id)
            .attr("width", this._WIDTH)
            .attr("height", this._HEIGHT);

          

        var myXscale = this._xScale;
        var myYscale = this._yScale;

        var promise = new Promise(function(resolve, reject) {
            // Get the data
            d3.json(graphInfo.queries[0][0], function(data) {
                resolve(data);
            });
        });

        promise.then(function(json_data) {
            // This function will have 'this' on the global scope thus we need to save 'this' to '_this'.
            // TODO: investigate d3.nest
            var results = json_data.results;
            var maxValue = 0;
            var graphData = [];
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

            // Scale the range of the data
            _this._xScale.domain([minDate, maxDate]);
            _this._yScale.domain([0, maxValue]);

            // Add the valueline path.
            for (var k = 0; k < graphData.length; k++) {

                // Add larger strokewidth to drilldown line
                var strokeWidth = 2;
                if  (graphInfo.queries[0][1] != 0) {
                    strokeWidth = 3;
                }

                vis.append("path")
                    .attr("class", "line_" + k)
                    .attr("d", _this.lineGen(graphData[k].values))
                    .attr("stroke", function() {
                        return lineColor(k);
                    })
                    .attr("stroke-width", strokeWidth)
                    .attr("fill", "none")
                    .on("click", function() {
                        // Second item in queries is the subchart for this line
                        _this.updateData(graphInfo.queries[0][1], allGraphs, id);
                    });

            };

            // Add the X Axis
            vis.append("g")
                .attr("class", "x.axis")
                .attr("transform", "translate(0," + (_this._HEIGHT - _this._MARGINS.bottom) + ")")
                .call(_this._xAxis);

            // Add the Y Axis
            vis.append("g")
                .attr("class", "y.axis")
                .attr("transform", "translate(" + (_this._MARGINS.left) + ",0)")
                .call(_this._yAxis);
        });
    };


    this.updateData = function(subChartName, allGraphs, id) {
        if (subChartName != "" ) {

            var _this = this;
            console.log("subchart: " + subChartName);
            allGraphs.forEach(function(d) {
                if (d.name == subChartName) {


                    d3.json(d.queries[0][0], function(d2) {
                        var maxValue = 0;
                        var graphData = [];
                        var results = d2.results;

                        console.log("results length: " + results.length);

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

                        console.log("new maxvalue:" + maxValue);

                        // Scale the range of the data
                        _this._xScale.domain([minDate, maxDate]);
                        _this._yScale.domain([0, maxValue]);

                        // Select the section we want to apply our changes to
                        // TODO: Why didn't select by id work?
                        var svg = d3.select("." + id).transition().duration(750);

                        // console.log("svg: " + svg);
                        // console.log("id: "+ id);
                        // console.log("Update graphData.length: " + graphData.length);

                        // Add the valueline path.
                        for (var k = 0; k < graphData.length; k++) {
                            //console.log(graphData[k].values);
                            svg.select(".line_" + k)
                                .attr("d", _this.lineGen(graphData[k].values))
                                .attr("stroke", function() {
                                    return lineColor(k);
                                })
                                .attr("stroke-width", 2)
                                .attr("fill", "none");

                            // TODO: alter this functions drill down chart?
                            // TODO: Back button?

                            svg.select(".x.axis") // change the x axis
                                .call(_this._xAxis);
                            svg.select(".y.axis") // change the y axis
                                .call(_this._yAxis);

                        }
                    });
                }
            });
        }
    };
}
d3.json("dashboard.json", function(d) {
    build_dashboard(d); }
       );
