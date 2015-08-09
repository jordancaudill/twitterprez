(function(angular) {

    var app = angular.module('league');

    var naapi = 'https://na.api.pvp.net/api/lol/na';
    var apiKey = '?api_key=1fb7abdb-48e1-4526-b8f6-3cc8e15eea82';

    var port = 3000;

    //var host = 'localhost';
    var host = '52.25.168.9';


    app.service('getSummoner', ['$http', '$q', function($http, $q) {
        return {
            getSummoner: function (summonerName) {
                var deferred = $q.defer();
                $http.get('http://'+host+':'+port+'/summoner/'+summonerName).success(function (response) {
                    return deferred.resolve(response);
                });
                return deferred.promise;
            }
        }
    }]);

    app.service('getTeams', ['$http', '$q', function($http, $q) {
        return {
            getTeams: function (summonerId) {
                var deferred = $q.defer();
                $http.get('http://'+host+':'+port+'/teams/'+summonerId).success(function (response) {
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
                        $http.get('http://'+host+':'+port+'/match/'+gameId)
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