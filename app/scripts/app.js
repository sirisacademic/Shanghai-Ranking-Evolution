'use strict';

angular
  .module('arwuApp', [
    'sirislab.siris-tableview',
    'sirislab.siris-stringUtils',
    'sirislab.siris-parallel',
    'ngResource',
    'ngRoute'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        reloadOnSearch: false,
        resolve: {
          data: ['$http', function($http) {
            return $http.get('data/shanghai_ranking.csv').then(function(response) {
              // console.log(response.data)
              return d3.csv.parse(response.data);
            })
          }
          ]
        }
      })
      .otherwise({
        redirectTo: '/'
      });
  });