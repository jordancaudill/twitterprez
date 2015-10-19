(function(angular) {

    var app = angular.module('league');

    //how long I want to store data in local storage for
    //first number is minutes * 60000 makes it milliseconds
    var STORAGE_TIME = 30 * 60000;

    app.service('getSummoner', ['$http', '$q', '$location', function($http, $q, $location) {
        return {
            getSummoner: function (summonerName, region) {
                var def = $q.defer();

                //grab from localstorage if the summonerId was stored less than 30 mins ago
                if(localStorage[summonerName] && JSON.parse(localStorage[summonerName]).region == region && ((new Date().getTime() - (JSON.parse(localStorage[summonerName]).storageTime)) <= STORAGE_TIME)){
                    var response = [];
                    response[summonerName] = JSON.parse(localStorage[summonerName]);
                    def.resolve(response);
                }

                else {
                    var host = $location.$$host+':'+$location.$$port;

                    $http.get('http://'+host+'/summoner/'+region+'/'+summonerName).success(function (response) {

                        //request was successful
                        if (response[summonerName]) {
                            var summoner = {};
                            summoner.storageTime = new Date().getTime();
                            summoner.id = response[summonerName].id;
                            summoner.region = region;
                            summoner = JSON.stringify(summoner);
                            localStorage.setItem(summonerName, summoner);

                        }
                        return def.resolve(response);

                    });
                }
                return def.promise;
            }
        }
    }]);

    app.service('getTeams', ['$http', '$q', '$location', function($http, $q, $location) {
        return {
            getTeams: function (summonerId, summonerName, region ) {
                var def = $q.defer();

                //grab from localstorage if the teams were stored less than 30 mins ago
                if(JSON.parse(localStorage[summonerName]).teams && ((new Date().getTime() - (JSON.parse(localStorage[summonerName]).storageTime)) <= STORAGE_TIME)){
                    var teams = JSON.parse(localStorage[summonerName]).teams;
                    def.resolve(teams);
                }
                else {
                    var host = $location.$$host+':'+$location.$$port;

                    $http.get('http://'+host+'/teams/'+region+'/'+summonerId).success(function (response) {
                        var summoner = JSON.parse(localStorage[summonerName]);
                        summoner.teams = response[summonerId];
                        summoner = JSON.stringify(summoner);
                        localStorage.setItem(summonerName, summoner);


                        return def.resolve(response[summonerId]);
                    });
                }
                return def.promise;
            }
        }
    }]);

    app.service('getMatchDetails', ['$http', '$q', '$location', function($http, $q, $location) {
        return {
            getMatchDetails: function (matchIds, teamName, region) {
                var def = $q.defer();
                var promises = [];


                //if the team is in local storage and less than STORAGE_TIME mins have passed, get from local storage
                if (localStorage[teamName] && ((new Date().getTime() - (JSON.parse(localStorage[teamName]).storageTime)) <= STORAGE_TIME)) {
                    $q.all(promises).then(function() {
                        var matches = JSON.parse(localStorage[teamName]).matches;
                        return def.resolve(matches);
                    });
                }

                else{
                    var host = $location.$$host+':'+$location.$$port;

                    angular.forEach(matchIds, function(matchId){
                        promises.push(
                            $http.get('http://'+host+'/match/'+region+'/'+matchId)
                        );
                    });

                    $q.all(promises).then(function(response){
                        if (response[response.length - 1].data.matchType) {
                            for (i = 0; i < response.length; i++){
                                response[i] = response[i]['data'];
                            }
                            var matchStorage = {};
                            matchStorage.storageTime = new Date().getTime();
                            matchStorage.matches = response;
                            matchStorage = JSON.stringify(matchStorage);
                            localStorage.setItem(teamName, matchStorage);
                        }

                        return def.resolve(response);
                    });
                }

                return def.promise;
            }
        }
    }]);

    app.service('convertToCamelCase', ['$http', '$q', function($http, $q) {
        return {
            convertToCamelCase: function (string) {
                string = string.replace(/\s+/g, '');
                string = string.charAt(0).toLowerCase() + string.substring(1);
                return string;
            }
        }
    }]);

    app.service('convertToReadable', ['$http', '$q', function($http, $q) {
        return {
            convertToReadable: function (string) {
                string = string.replace(/([a-z])([A-Z])/g, '$1 $2');
                string = string.charAt(0).toUpperCase() + string.substring(1);
                return string;
            }
        }
    }]);

})(angular);