function create_graph(data) {

    var parseDate = d3.timeParse("%Y-%m-%dT%H:%M:%S.%L");
    var results = data.results;

    var minDate = d3.isoParse("2015-01-05T21:55:43.702900257Z").getTime();
    var maxDate = d3.isoParse("2015-03-05T21:55:43.702900257Z").getTime();
    var graphs = [];
    var maxValue = 0;

    console.log(results.length);

    for(var i = 0; i < results.length; i++) {
        var curValues = results[i].series[0].values;
        graphs.push({"name" : results[i].series[0].name,
                     "values" : curValues});

        console.log(results[i].series[0].name);
        console.log(curValues);

        // Find largest value so we can scale the y axis
        for(var j = 0; j < curValues.length; j++) {
            var value = curValues[i][1];

            if (maxValue < value) {
                maxValue = value;
            }
        }
    }

    var WIDTH = 800;
    var HEIGHT = 500;

    var vis = d3.select("body")
        .append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT),
        MARGINS = {
            top: 20,
            right: 20,
            bottom: 20,
            left: 50
        },

        xScale = d3.scaleTime().range([MARGINS.left, WIDTH - MARGINS.right]).domain([minDate, maxDate]),
        yScale = d3.scaleLinear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([0, maxValue]),
        xAxis = d3.axisBottom(xScale).ticks(5),
        yAxis = d3.axisLeft(yScale).ticks(5);

    vis.append("svg:g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
        .call(xAxis);


    vis.append("svg:g")
        .attr("class", "axis")
        .attr("transform", "translate(" + (MARGINS.left) + ",0)")
        .call(yAxis);


    var lineGen = d3.line()
        .x(function(d) {
            // console.log("time:" + d[0]);
            // console.log("xtime:" + d3.isoParse(d[0]).getTime());
            // console.log("xscale:" + xScale(
            //     d3.isoParse(d[0]).getTime())
            // );
            return xScale(d3.isoParse(d[0]).getTime());
        })
        .y(function(d) {
            // console.log("yval:" + d[1]);
            // console.log("yscale:" + yScale(d[1]));
            return yScale(d[1]);
        });

    var lineColor = d3.scaleOrdinal(d3.schemeCategory10);

    for (var k = 0; k < graphs.length; k++) {
        //console.log(graphs[k].values);
        vis.append("svg:path")
            .attr("d", lineGen(graphs[k].values))
            .attr("class" , "linez")
            .attr("stroke", function() {
                return lineColor(k);
            })
            .attr("stroke-width", 2)
            .attr("fill", "none")
            .on("click", function() {
                alert("clicked"); }
               );
    }
 }

d3.json("testdata.json", function(d) {
    create_graph(d); }
       );
