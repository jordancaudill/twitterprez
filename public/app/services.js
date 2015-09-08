(function(angular) {

    var app = angular.module('league');

    //var host = 'localhost:3000';
    var host = 'teamstatter.com';

    //how long I want to store data in local storage for
    //first number is minutes * 60000 makes it milliseconds
    var STORAGE_TIME = 30 * 60000;

    app.service('getSummoner', ['$http', '$q', function($http, $q) {
        return {
            getSummoner: function (summonerName) {
                var def = $q.defer();

                //grab from localstorage if the summonerId was stored less than 30 mins ago
                if(localStorage[summonerName] && ((new Date().getTime() - (JSON.parse(localStorage[summonerName]).storageTime)) <= STORAGE_TIME)){
                    var summonerId = JSON.parse(localStorage[summonerName]).summonerId;
                    def.resolve(summonerId);
                }

                else {
                    $http.get('http://'+host+'/summoner/'+summonerName).success(function (response) {

                        var summoner = {};
                        summoner.storageTime = new Date().getTime();
                        summoner.summonerId = response[summonerName].id;
                        summoner = JSON.stringify(summoner);
                        localStorage.setItem(summonerName, summoner);

                        return def.resolve(response[summonerName].id);
                    });
                }
                return def.promise;
            }
        }
    }]);

    app.service('getTeams', ['$http', '$q', function($http, $q) {
        return {
            getTeams: function (summonerId, summonerName) {
                var def = $q.defer();


                //grab from localstorage if the teams were stored less than 30 mins ago
                if(JSON.parse(localStorage[summonerName]).teams && ((new Date().getTime() - (JSON.parse(localStorage[summonerName]).storageTime)) <= STORAGE_TIME)){
                    var teams = JSON.parse(localStorage[summonerName]).teams;
                    def.resolve(teams);
                }
                else {
                    $http.get('http://'+host+'/teams/'+summonerId).success(function (response) {
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

    app.service('getMatchDetails', ['$http', '$q', function($http, $q) {
        return {
            getMatchDetails: function (matchIds, teamName) {
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

                    angular.forEach(matchIds, function(matchId){
                        promises.push(
                            $http.get('http://'+host+'/match/'+matchId)
                        );
                    });

                    $q.all(promises).then(function(matches){
                        for (i = 0; i < matches.length; i++){
                            matches[i] = matches[i]['data'];
                        }
                        var matchStorage = {};
                        matchStorage.storageTime = new Date().getTime();
                        matchStorage.matches = matches;
                        matchStorage = JSON.stringify(matchStorage);

                        localStorage.setItem(teamName, matchStorage);

                        return def.resolve(matches);
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