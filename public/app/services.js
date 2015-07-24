(function(angular) {

    var app = angular.module('league');

    var naapi = 'https://na.api.pvp.net/api/lol/na';
    var apiKey = '?api_key=1fb7abdb-48e1-4526-b8f6-3cc8e15eea82';


    app.service('getSummoner', ['$http', '$q', function($http, $q) {
        return {
            getSummoner: function (entry) {
                var deferred = $q.defer();
                $http.get('http://localhost:3000/summoner/'+entry).success(function (response) {
                    var summonerName = entry.toLowerCase().replace(/ /g,'');
                    var summoner = response[summonerName];
                    return deferred.resolve(summoner);
                });
                return deferred.promise;
            }
        }
    }]);

    app.service('getTeams', ['$http', '$q', function($http, $q) {
        return {
            getTeams: function (summonerId) {
                var deferred = $q.defer();
                $http.get('http://localhost:3000/teams/'+summonerId).success(function (response) {
                    return deferred.resolve(response);
                });
                return deferred.promise;
            }
        }
    }]);

    app.service('getMatchDetails', ['$http', '$q', function($http, $q) {
        return {
            getMatchDetails: function (gameIds) {
                var def2 = $q.defer();
                var promises = [];
                angular.forEach(gameIds, function(gameId){
                    promises.push(
                        $http.get('http://localhost:3000/match/'+gameId)
                    );
                });

                $q.all(promises).then(function(promises){
                    return def2.resolve(promises);
                });

                return def2.promise;
            }
        }
    }]);

})(angular);