'use strict';

angular.module('arwuApp')
  .controller('MainCtrl', function ($scope, $compile, $http, data, $StringUtils) {    

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
      draggableAxis:false,
      axisDirection: 'asc', //direction of the color scale: asc (0, bottom - 100, top), desc (100, bottom - 0, top)
      yDomain:[0, 100]    //[bottom, top] (cartesian axis)
    }

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

    $scope.filtered;
    $scope.countries = [];
    $scope.selectedCountry = "All Countries";

    //get all the countries from the data
    $scope.countries = d3.set(data.map(function(d) 
      { 
        return d[$scope.country_field_name]; 
      })).values();

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
          $scope.selectedCountry = $scope.selectedCountry;

          //send event of filterByCountry
          $scope.$root.$broadcast('filterByCountry', $scope.selectedCountry);

          //refresh the table with the filtered data
          $scope.update_table_data(
              ($scope.selectedCountry == "All Countries")? data : data.filter(function(d)
              {
                return d[$scope.country_field_name] == $scope.selectedCountry;
              })
            );
        })

    //enable filtering by name
    d3.select("#input_school")
      .on("keyup", function(d) {
        if(this.value == undefined)
          return;

        var filterText = this.value;
        
        //send event of filterByName
        $scope.$root.$broadcast('filterByName', filterText.toLowerCase());

        //refresh the table with the filtered data
          $scope.update_table_data(
              (filterText.length == 0)? data : data.filter(function(d)
              {
                return (d[$scope.name].toLowerCase().indexOf(filterText.toLowerCase()) > -1);
              })
            );
      })


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

      $scope.table_data = theData.map( function(node)
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

    $scope.update_table_data(data);
    

    // saving the loaded data into the scope so the directives can draw it
    $scope.data = data;    

    // extending selections with the ability to be moved in front of the rest
    d3.selection.prototype.moveToFront = function() {
        return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };      
      

    d3.select("#clearBrushesBtn")
      .on("click", function(d) {
        try {
          $scope.clearBrushes();
        } catch(err) {                    
        } 
      });
  });
