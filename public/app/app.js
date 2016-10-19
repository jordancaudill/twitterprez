(function(angular) {
    var app = angular.module('prez', ['ngRoute']);

    app.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: 'partials/search.html'
                }).
                otherwise({
                    redirectTo: '/'
                });
        }]);

    app.controller('SearchController', ['$q', '$scope', 'getSummoner', 'getTeams', 'shareData', 'getMatchDetails', '$location', '$timeout', function($q, $scope,  getSummoner, getTeams, shareData, getMatchDetails, $location){
        this.regions = [
            'NA',
            'EUW',
            'KR',
            'BR',
            'EUNE',
            'LAN',
            'LAS',
            'OCE',
            'RU',
            'TR'
        ];
        this.searchSummoner = function(summoner, region) {
            var summonerName = summoner.toLowerCase().replace(/ /g,'');
            getSummoner.getSummoner(summonerName, region).then(function(response) {
                if(response[summonerName]){
                    this.summoner = response[summonerName];
                    getUserTeams(response[summonerName].id, summonerName, region);
                }
                else{
                    $scope.error = response;
                }
            });
        };

        getUserTeams = function(summonerId, summonerName, region) {
            getTeams.getTeams(summonerId, summonerName, region).then(function(response) {
                if(response){
                    this.summoner.teams = response;
                    shareData.setSummoner(this.summoner);
                    $location.path('/teams');
                }
                else{
                    $scope.error = 'Could not find teams.';
                }
            });
        };
    }]);

}(angular));