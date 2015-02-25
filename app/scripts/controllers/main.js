'use strict';

var app = angular.module('arwuApp')
  .controller('MainCtrl', function ($scope, $compile, $http, data, $StringUtils, $location, $timeout, $route, $rootScope) {    

    $scope.$root.TABLE_COLUMN_NAME = "University";
    $scope.$root.TABLE_COLUMN_COUNTRY = "Country";    
    $scope.$root.TABLE_COLUMN_2003 = "2003";
    $scope.$root.TABLE_COLUMN_2004 = "2004";
    $scope.$root.TABLE_COLUMN_2005 = "2005";
    $scope.$root.TABLE_COLUMN_2006 = "2006";
    $scope.$root.TABLE_COLUMN_2007 = "2007";
    $scope.$root.TABLE_COLUMN_2008 = "2008";
    $scope.$root.TABLE_COLUMN_2009 = "2009";
    $scope.$root.TABLE_COLUMN_2010 = "2010";
    $scope.$root.TABLE_COLUMN_2011 = "2011";
    $scope.$root.TABLE_COLUMN_2012 = "2012";
    $scope.$root.TABLE_COLUMN_2013 = "2013";

    $scope.$root.COLUMN_PROPERTIES = new ColumnsProperties();   
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_NAME,1,20, "left"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_COUNTRY,0, 7, "left"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2003,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2004,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2005,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2006,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2007,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2008,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2009,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2010,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2011,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2012,1,undefined, "center"));
    $scope.$root.COLUMN_PROPERTIES.addColumnProperties(new ColumnProperties($scope.$root.TABLE_COLUMN_2013,1,undefined, "center"));

    $scope.parallelproperties = {
      lineProperties:
      {
        curvedPath: true,
        fgColor: 'steelblue'  //color for the foreground lines
      },
      draggableAxis:true,
      axisDirection: 'asc', //direction of the color scale: asc (0, bottom - 100, top), desc (100, bottom - 0, top)
      yDomain:[0, 100]    //[bottom, top] (cartesian axis)
    }
    $scope.hide_interface = true;

    // Extract the list of scope.dimensions and create a scale for each.
    $scope.dimensions = d3.range(2003,2014);
    var yearData;

    data.forEach(function(d) {
      d.filter_country = true;
      d.filter_brush = true;
      d.filter_name = true;
    })

    data.sort(function(a,b) {
      return a["2013"] - b["2013"];
    });

    function getMaxValueFromMetric(metric) {
      return d3.max(data, function(d) {
          return d3.max(d3.values(d.data).map(function(p) {    
            return (p[metric] == undefined) ? 0 : p[metric];
          }));
        });
    }

    // Set proper margins, width and height
    $scope.margin = { top: 30, right: 0, bottom: 10, left: 0 };
    $scope.width = 960 - $scope.margin.left - $scope.margin.right;
    $scope.height = 420 - $scope.margin.top - $scope.margin.bottom;
    $scope.country_field_name = "Country";
    $scope.name = "University";
    $scope.tooltip_fields = [$scope.name, $scope.country_field_name];

    ////////////////////////////////////////////////////////////////////////
    /// FILTERING 
    $scope.$FILTER_BY_COUNTRY = 0;
    $scope.$FILTER_BY_TEXT = 1;
    $scope.$FILTER_BY_BRUSH = 2;
    $scope.filtered;
    $scope.countries = [];
    $scope.$FILTER_COUNTRY_ALL = "All Countries";
    $scope.selectedCountry = $scope.$FILTER_COUNTRY_ALL;
    $scope.filterText = "";

    //get all the countries from the data
    $scope.countries = d3.set(data.map(function(d) 
      { 
        return d[$scope.country_field_name]; 
      })).values();

    //listern for the filtering coming from parallel brushes
    $scope.$on('onParallelBrushEvent', function(event, data)
    {
      updateURLBrushParams(data);
      updateDataFromFiltersValues($scope.$FILTER_BY_BRUSH, data);
    });

    $scope.$on('onParallelBrushEndEvent', function(event,data)
    {
        updateURLBrushParams(data);
    });
  


    function updateURLBrushParams(data)
    {
      var urlParams = [];

      //check is a brush does not exist anymore on the UI, if so set it as null so it will be removed
      $scope.dimensions.forEach(function(dimension)
      {
          if(data.actives.indexOf(dimension) == -1)
            urlParams.push([dimension, null]);
      });
      
      //add the brush values to the params
      data.actives.forEach(function(dim, i)
      {
        urlParams.push([dim, Math.round(data.extents[i][0]).toString() + ":" + Math.round(data.extents[i][1]).toString()]);
      });

      updateURLParams(urlParams);
    } 



    function updateURLParams(urlParams) //param, value)
    {
        urlParams.forEach(function(urlParam)
        {
          $location.search(urlParam[0], (urlParam[1] == null || urlParam[1] == undefined || urlParam[1] == '')? null:urlParam[1]);
        });
          
        //NOTE: changes coming from the DOM event were not correctly synch with the location update. Angular 
        //was updating a previous change when a new one appeared, so:
        //Note that the setters don't update window.location immediately. Instead, the $location service 
        //is aware of the scope life-cycle and coalesces multiple $location mutations into one "commit" to the 
        //window.location object during the scope $digest phase. Since multiple changes to the $location's state 
        //will be pushed to the browser as a single change, it's enough to call $apply to update it correctly
        //More at: https://docs.angularjs.org/guide/$location
        $rootScope.$apply();
    }



    function updateDataFromFiltersValues(filterType, filterData)
    {
      data.forEach(function(d) 
      {
        //update filter flags on each datum of data
        //country flag
        if(filterType == $scope.$FILTER_BY_COUNTRY)
          d.filter_country = ($scope.selectedCountry == $scope.$FILTER_COUNTRY_ALL)? 
            true : (d[$scope.country_field_name] == $scope.selectedCountry);
        
        //text filter flag
        else if(filterType == $scope.$FILTER_BY_TEXT)          
          d.filter_name = ($scope.filterText == "")? 
            true : (d[$scope.name].toLowerCase().indexOf($scope.filterText.toLowerCase()) > -1);
        
        //brush filter flag
        else if(filterType == $scope.$FILTER_BY_BRUSH)
        {
          if (filterData.actives.length == 0)
            d.filter_brush = true;
          else
            d.filter_brush = filterData.actives.every(function(p, i) {      
              return filterData.extents[i][0] <= d[p] && d[p] <= filterData.extents[i][1];
            });
        }
      });

      //refresh the table with the filtered data
      $scope.update_table_data(data);

      //update results summary
      var l = data.filter(function(d) 
            { return d.filter_country && d.filter_brush && d.filter_name;
            }).length;
      d3.select("#numResults")
        .text(l + " institutions (" + ((l / data.length)*100).toFixed(1) + "%) match the criteria");
    }

    //set the countries as model for the countriesCombo
    d3.select("#countriesCombo")      
      .selectAll("option")
      .data($scope.countries.sort())
      .enter()
        .append("li")              
        .append("a")
          // .attr("href", function() { return ''; })
          .attr("value", function(d) { return d;})
          .text(function(d) { return d;});    

    d3.select("#countriesCombo")
      .selectAll("li")
        .on("click", function(d) {
          $scope.selectedCountry = d3.select(this).selectAll("a").text().trim()
          d3.select("#countriesButton").text($scope.selectedCountry);
          updateDataFromFiltersValues($scope.$FILTER_BY_COUNTRY);          
          updateURLParams([['country', ($scope.selectedCountry == $scope.$FILTER_COUNTRY_ALL)? null:$scope.selectedCountry]]);
        })

    //enable filtering by name
    d3.select("#input_school")
      .on("keyup", function(d) {
        if(this.value == undefined)
          return;
        $scope.filterText = this.value;      
        updateDataFromFiltersValues($scope.$FILTER_BY_TEXT);
        updateURLParams([["university", this.value]]);
      });


    /////////////
    // function that prepares the data to be consumed by the table
    // called everytime the data is updated (p.ex, filtered)
    $scope.update_table_data = function(theData)
    {
      //filter data for the table, just the necessary columns
      var cloneWithProps = function(object, keys)
      {
        var newObject = {};
        keys.forEach(function(key)
        {
          newObject[key] = object[key];
        });
        return newObject;
      }

      $scope.table_data = theData
      .filter(function(d)
      {
        return d.filter_country && d.filter_brush && d.filter_name;
      })
      .map( function(node)
      {
        //the headers used for the table will be the properties to extract from the objects in the data
        return cloneWithProps(node, $scope.$root.COLUMN_PROPERTIES.columns.map(
            function(columnProperty)
            {
              return columnProperty.header;
            }
          ));
      });  

      if(!$scope.$$phase) 
        $scope.$apply();
    }

    updateDataFromFiltersValues();
    $scope.update_table_data(data);

    // saving the loaded data into the scope so the directives can draw it
    $scope.data = data;    

    // extending selections with the ability to be moved in front of the rest
    d3.selection.prototype.moveToFront = function() {
        return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };
        
    $scope.tooltip = d3.select("#tooltip")
            .style("visibility", "hidden")
            .style("background-color", "#ffffff");

    d3.select("#clearBrushesBtn")
      .on("click", function(d) 
      {
        try 
        {
          $scope.$emit('clearBrushes');
        } 
        catch(err) 
        {
        } 
      });

    ////////////////////////////////////////////////////////////////////////
    // Check if the url has filters to be applied
    if(d3.map($location.search()).keys().length == 0)
    {
      $scope.hide_interface = false;
    }
    else
    {
        $timeout(function()
        {
            ////////////////////////////////////////////////////////////////////////
            //search for filter params coming from the URL  
            var params = d3.map();
            var dims = $scope.$root.COLUMN_PROPERTIES.columns.map(function(column)
            {
              return column.header.toLowerCase();
            });
            var invalidParams = [];

            angular.forEach($location.search(), function(value,key)
            {
              if(dims.indexOf(key) > -1)
              {
                //check if param is a single value or a range
                //check if the param is well formetted "bottomValue,topValue"
                var values = value.split(":")
                if(values.length == 1)
                {
                  //param is Country or Uni name
                  if(key.toLowerCase() == $scope.$root.TABLE_COLUMN_COUNTRY.toLowerCase() && 
                      $scope.countries
                        .map( function(d) { return d.toLowerCase()})
                        .some(function(d) { return d.localeCompare(value.toLowerCase()) == 0; })
                  )
                    params.set(key.toLowerCase(), value);
                  else if(key.toLowerCase() == $scope.$root.TABLE_COLUMN_NAME.toLowerCase() && 
                      data.map(function(d) { return d[$scope.$root.TABLE_COLUMN_NAME].toLowerCase(); })
                      .some(function(d) { return d.indexOf(value.toLowerCase()) > -1; })
                  )
                    params.set(key.toLowerCase(), value);
                }
                else if(values.length == 2)
                {
                  //if filter is not valid, remove it. Otherwise store it as array of values
                  if(values.every(function(e) { return parseInt(e) != NaN; }) && parseInt(values[0]) < parseInt(values[1]))
                    params.set(key, values.map(function(e) { return parseInt(e);}));
                  else
                    console.log("url parameter not valid");
                }
              }
              else
              {
                //remove from the url the invalid params
                invalidParams.push([key, null]);
                updateURLParams(invalidParams);
              }
            });

            //filter with these valid params
            //by country
            if( params.get($scope.$root.TABLE_COLUMN_COUNTRY.toLowerCase()) != undefined )
            {
              $scope.selectedCountry =  
                $scope.countries[
                  $scope.countries
                    .map( function(d) { return d.toLowerCase()})
                    .indexOf(params.get($scope.$root.TABLE_COLUMN_COUNTRY.toLowerCase()).toLowerCase())
                ];
              d3.select("#countriesButton").text($scope.selectedCountry);
              updateDataFromFiltersValues($scope.$FILTER_BY_COUNTRY);  
            }

            //by university name
            if( params.get($scope.$root.TABLE_COLUMN_NAME.toLowerCase()) != undefined)
            {
              $scope.filterText = params.get($scope.$root.TABLE_COLUMN_NAME.toLowerCase());
              d3.select("#input_school").attr('value', $scope.filterText);
              updateDataFromFiltersValues($scope.$FILTER_BY_TEXT);
            }

            //by year dimensions
            $scope.dimensions.forEach(function(dim)
            {
              var dims = []
              if(params.get(dim) != undefined)
              {
                  dims.push({"dim":dim, "values":params.get(dim)});
              }

              if(dims.length > 0)
                $scope.$emit('createBrush', dims); 
            });

            $scope.hide_interface = false;
        }, 1500); //end timeout
    }    
  });