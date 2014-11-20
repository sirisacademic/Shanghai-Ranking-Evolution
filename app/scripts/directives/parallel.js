/*
  The scope of the directive expects an object for the settings if the chart, as follows:
      $scope.parallelproperties = {
      lineProperties:
      {
        strokeWith: 1,
        curvedPath: true,
        fgColor: 'steelblue'  //color for the foreground lines
      },
      draggableAxis:false,
      axisDirection: 'asc', //direction of the color scale: asc (0, bottom - 100, top), desc (100, bottom - 0, top)
      yDomain = [0, 100]    [bottom, top] (cartesian axis)
    }

    This objects are stored in parallelproperties property of the scope.
*/



'use strict';

angular.module('arwuApp')
  .directive('parallel', function () {
    return {
      //We restrict its use to an element
      //as usually  <bars-chart> is semantically
      //more understandable
      restrict: 'E',
      scope : {
        'data': '=',
        'dimensions': '=',          //dimensions of the axis
        'height': '=',              //height for the svg
        'width': '=',               //width for the svg
        'margin': '=',
        'institutionfieldname': '=',
        'countryfieldname': '=?' ,
        'tooltipfields': '=',       //Array of dimensions
        'parallelproperties': '=?'
      },

      //this is important,
      //we don't want to overwrite our directive declaration
      //in the HTML mark-up
      replace: false, 
      link: function (scope, element, attrs) {

        var props = scope.parallelproperties;

        //get the tooltip
        scope.tooltip = d3.select("#tooltip")
            .style("visibility", "hidden")
            .style("background-color", "#ffffff");

        scope.$watch('data', function() {
          draw();
        })

        //listen for filtering by country event
        scope.$root.$on('filterByCountry', function(event, selectedCountry)
        {
          if(scope.countryfieldname == undefined)
            return;
          filterByCountry(selectedCountry);
        });

        //listen for filtering by university name
        scope.$root.$on('filterByName', function(event, filterText)
        {
          filterByName(filterText);
        });

        //listen for data to be be compared against the current data
        scope.$root.$on('compareData', function(event, compareData)
        {
          
        });


        //listen for outside events to highligh/unhighlight nodes
        scope.$root.$on('modifyNode', function(event, data)
        {
          // highlighted the corresponding element given a datum
          if(data.action == 'highlight')
          {
            var selectedElement = foreground.filter(function(d) 
            {
              return d[scope.institutionfieldname] == data.node[scope.institutionfieldname];
            })          
            highlightLine(selectedElement.node());
          }              
          else
          {
            unHighlightLine();
          }
        });

        scope.clearBrushes = function() {
          d3.selectAll(".brush").each(function(d) { d3.select(this).call(y[d].brush.clear()); });
          brush();
        }      

        var x = d3.scale.ordinal().rangePoints([0, scope.width], 1),
            y = {},
            dragging = {};        

        var line = d3.svg.line(),
            axisLeft = d3.svg.axis()
                    .orient("left")
                    .ticks(8),
            axisRight = d3.svg.axis()
                    .orient("right")
                    .ticks(8),
            axis = d3.svg.axis()
                    .orient("left")
                    .ticks(0),
            background,
            foreground,
          strokeWidth,
          defaultDomain = [0, 100],
          yDomain,
          fgColor;

        //get the setting from the directive declaration or apply default values
        getProperties();
        
        var svg = d3.select(element[0]).append("svg")
            .attr('width', scope.width + scope.margin.left + scope.margin.right)
            .attr('height', scope.height + scope.margin.top + scope.margin.bottom)
          .append('g')
            .attr('transform', 'translate(' + scope.margin.left + ',' + scope.margin.top + ')')        
        

        function update()
        {
          svg.selectAll(".background").selectAll("path")
            .attr("d", path);

          svg.selectAll(".foreground").selectAll("path")
            .attr("d", path)
            .attr("stroke", fgColor)
            .attr("stroke-width", strokeWidth + 'px');

          svg.selectAll(".circleText")
            .attr("display", "none")
            .attr("transform", function(d){return "translate("+x(d)+",80)"});

          svg.selectAll(".circleText").selectAll("circle")
            .attr("r", 11)
            .attr("stroke","red")
            .attr("fill", "white");
        }


        function draw() 
        {          
          x.domain(scope.dimensions);
          scope.dimensions.forEach(function(d) {
            y[d] = d3.scale.linear()        
                .domain(yDomain)
                .range([0, scope.height]);
          })     

          // Add grey background lines for context.
          background = svg.append("svg:g")
              .attr("class", "background")
            .selectAll("path")
              .data(scope.data)
              .enter().append("svg:path");             

          // Add blue foreground lines for focus.
          foreground = svg.append("svg:g")
              .attr("class", "foreground")
            .selectAll("path")
              .data(scope.data, function(d) { return d[scope.institutionfieldname]; })
            .enter().append("svg:path")              
            .on("mouseover", function(d) {
              var tooltipStr = "<font size='2'>";
              for(var i=0; i<scope.tooltipfields.length; i++)
              {
                  tooltipStr += d[scope.tooltipfields[i]] + " · ";
              }
              tooltipStr = tooltipStr.substring(0,tooltipStr.length-3);
              tooltipStr += "</font>";

              scope.tooltip
                  .html(tooltipStr)
                  .style("visibility", "visible");                  
                  
              highlightLine(this);
              })
              .on("mousemove", function(){
                // d3.event must be used to retrieve pageY and pageX. While this is not needed in Chrome, it is needed in Firefox
                scope.tooltip.style("top", (d3.event.pageY - 20)+"px").style("left",(d3.event.pageX + 5)+"px");        
              })
              .on("mouseout", function(){
                scope.tooltip.style("visibility", "hidden");
                
                d3.select(this)
                    .style("stroke", fgColor)
                    .style('stroke-width', strokeWidth);
                d3.selectAll(".circleText")
                      .attr("display", "none");

                svg.selectAll(".compareground")
                  .selectAll("path")
                  .style('visibility', 'hidden'); 
              });

          // Add a group element for each dimension.
          var g = svg.selectAll(".dimension")
              .data(scope.dimensions)
            .enter().append("svg:g")
              .attr("class", "dimension")
              .attr("transform", function(d) { return "translate(" + x(d) + ")"; });

          try
          { 
            if(props.draggableAxis == true)
            {

              g.call(d3.behavior.drag()
                .on("dragstart", function(d) {
                  dragging[d] = this.__origin__ = x(d);
                  background.attr("visibility", "hidden");
                })
                .on("drag", function(d) {
                  dragging[d] = Math.min(scope.width, Math.max(0, this.__origin__ += d3.event.dx));
                  foreground.attr("d", path)
                            .attr("stroke-width", strokeWidth);
                  scope.dimensions.sort(function(a, b) { return position(a) - position(b); });
                  x.domain(scope.dimensions);
                  g.attr("transform", function(d) { return "translate(" + position(d) + ")"; })
                })
                .on("dragend", function(d) {
                  delete this.__origin__;
                  delete dragging[d];
                  transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
                  transition(foreground)
                      .attr("d", path)
                      .attr("stroke-width", strokeWidth);
                  background
                      .attr("d", path)
                      .attr("stroke-width", strokeWidth)
                      .transition()
                      .delay(500)
                      .duration(0)
                      .attr("visibility", null);
                }));
            }
           }
           catch(e) {
            console.log(e, "no draggable property");
           }


          var compareline = svg.append("svg:g")
              .attr("class", "compareground")
              .append("svg:path");

          // Add an axis and title.
          g.append("svg:g")
              .attr("class", "axis")
              .each(function(d, i) {
                if (i == (scope.dimensions.length - 1))
                  return d3.select(this).call(axisRight.scale(y[d]));
                else if (i == 0) 
                  d3.select(this).call(axisLeft.scale(y[d])); 
                else
                  d3.select(this).call(axis.scale(y[d])); 
              })
            .append("svg:text")
              .attr("text-anchor", "middle")
              .attr("y", -9)
              .text(String);

          // Add and store a brush for each axis.
          g.append("svg:g")
              .attr("class", "brush")
              .each(function(d) { d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush)); })
            .selectAll("rect")
              .attr("x", -8)
              .attr("width", 16);

          var circleElements = svg.selectAll("g circleText")
              .data(scope.dimensions)
              .enter()
              .append("g")
                .attr("class", "circleText")
                .attr("display", "none");                

          circleElements    
              .append("circle");        
              
          circleElements.append("text")
                .attr("text-anchor", "middle")
                .attr("font-size", "9px")
                .style("dominant-baseline", "central");

          update();   
        };

        function position(d) {
          var v = dragging[d];
          return v == null ? x(d) : v;
        }

        function transition(g) {
          return g.transition().duration(500);
        }

        // Returns the path for a given data point.
        function path(d) {
          return line(scope.dimensions.map(function(p) 
            { 
              return [position(p), y[p](d[p])]; 
            }));          
        }

        function filterByCountry(selectedCountry) {
          foreground.style("display", function(d) {
            d.filter_country = (selectedCountry == "All Countries") ? true : d[scope.countryfieldname] == selectedCountry;
            return (d.filter_country && d.filter_brush  && d.filter_name) ? null : "none";
          });

        }

        function checkMultiCountryBS(d) {
          var cs = d[$scope.country_field_name].split('/');
          for (var i = 0; i<cs.length; i++)
            cs[i] = cs[i].trim();

          return $.inArray(selectedCountry, cs) > -1
        }

        function filterByName(filterText) {  
          foreground.style("display", function(d) {
            d.filter_name = d[scope.institutionfieldname].toLowerCase().indexOf(filterText) > -1;

            return (d.filter_country && d.filter_brush  && d.filter_name) ? null : "none";
          });

        }

        function getActiveDimensions() {
          return scope.dimensions.filter(function(p) { return !y[p].brush.empty(); })
        }

        // Handles a brush event, toggling the display of foreground lines.
        function brush() {
          var actives = getActiveDimensions(),
              extents = actives.map(function(p) { return y[p].brush.extent(); });

          if (actives.length == 0) {
            foreground.style("display", function(d) {    
                d.filter_brush = true;
                return (d.filter_country && d.filter_brush  && d.filter_name) ? null : "none";
            });
          } else {
            foreground.style("display", function(d) {    
              d.filter_brush = actives.every(function(p, i) {      
                return extents[i][0] <= d[p] && d[p] <= extents[i][1];
              });
              return (d.filter_country && d.filter_brush  && d.filter_name) ? null : "none";
            });
          } 

          d3.select("#clearBrushesBtn").attr("disabled", function() {
            return (actives.length > 0) ? null : "";
          })
        }

        function highlightLine(svgContainer) {
          var d = d3.select(svgContainer).data()[0];
          d3.select(svgContainer)
              .style("stroke", "red")
              .style('stroke-width', strokeWidth + 1);
          var sel = d3.select(svgContainer);
          sel.moveToFront();

          var circles = d3.selectAll(".circleText")
            .attr("display", true)
            .attr("transform", function(p) {
              return "translate("+x(p)+"," + y[p](d[p]) + ")"
            })

          circles.selectAll("text")
            .text(function(p) {
              return (d[p] == 0) ? '-' : d[p];
            });
        }

        function unHighlightLine() {
          foreground
              .style("stroke", fgColor)
              .style('stroke-width', strokeWidth);
            d3.selectAll(".circleText")
                  .attr("display", "none");

            svg.selectAll(".compareground")
                    .selectAll("path")
                    .style('visibility', 'hidden'); 
        }

        function getProperties() 
        {
          //define all the available settings
          var defaultStrokeWidth = (scope.height / scope.data.length) * 0.8;
          try {
              strokeWidth = (props.lineProperties.strokeWith == undefined)? defaultStrokeWidth : props.lineProperties.strokeWith;
          }
          catch(e) {
            strokeWidth = defaultStrokeWidth;          
          }

          var defaultFgColor = 'steelblue';
          try {
              fgColor = (props.lineProperties.fgColor == undefined)? defaultFgColor : props.lineProperties.fgColor;
          }
          catch(e) {
            fgColor = defaultFgColor;          
          }

          try {
            if(props.lineProperties.curvedPath == true)
              line.interpolate("monotone");
          }
          catch(e) {
          }

          try
          {
            yDomain = (props.yDomain != undefined)? props.yDomain : defaultDomain;
          }
          catch(e)
          {
            yDomain = defaultDomain;          
          }
          try {
            if(props.axisDirection == 'desc')
              yDomain.reverse();
          }
          catch(e)
          {
          }

        }
      }
    };
  });
