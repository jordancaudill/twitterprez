/**
 * Created by Jordan on 5/31/2015.
 */
(function(angular) {
    var app = angular.module('league', []);

    //controller definition
    app.controller('UserController', ['$scope', '$q', 'getSummoner', 'getTeams', 'getMatchDetails', function($scope, $q,  getSummoner, getTeams, getMatchDetails){

        var RATE_LIMIT = 10;

        //how many games I want to grab from a match history
        var DESIRED_GAMES = 3;

        //how long I want to store data in local storage for
        // first number is minutes * 60000 makes it milliseconds
        var STORAGE_TIME = 30 * 60000;


        $scope.master = function() {
            //call to service to get summoner by summoner name
            getSummoner.getSummoner($scope.entry).then(function(summoner) {
                $scope.summonerId = summoner.id;
                var summonerId = summoner.id;

                getUserTeams(summonerId);
            });
        };

        //call to service to get teams by summoner ID
        var getUserTeams = function(summonerId) {
            $scope.gotTeams = true;
            getTeams.getTeams($scope.summonerId).then(function(teams) {
                $scope.teams = teams[summonerId];
            });
        };

        //gets the team member ids of the players CURRENTLY on the team
        var getMemberNames = function(selectedTeam, games) {
            var currentMembers = {};
            currentMembers['memberNames'] = [];
            currentMembers['memberIds'] = [];
            var rosterIds = [];

            for (i = 0; i < selectedTeam.roster.memberList.length; i++) {
                var member = selectedTeam.roster.memberList[i];
                rosterIds[i] = member.playerId;
            }

            angular.forEach(games, function(game){
                angular.forEach(game.participantIdentities, function(participant){
                    angular.forEach(rosterIds, function(aRosterId){
                        if (participant.player.summonerId == aRosterId && $.inArray(participant.player.summonerName, currentMembers.memberNames) == -1){
                            currentMembers.memberNames.push(participant.player.summonerName);
                            currentMembers.memberIds.push(participant.player.summonerId);
                        }
                    });
                });
            });
            return currentMembers;
        };


        /*
         *  Gets the user and his allies for a single game.
         *  Necessary because a player may have since left the team
         *  after this game.
         *
         *  should be cleaned up...
         *
         *  Returns an array of summonerIds
         */
        var getAllies = function(memberIds, game) {
            var allies = [];
            var teamFound = false;
            for(p = 0; p < memberIds.length; p++){
                var aMemberId = memberIds[p];
                if (!teamFound){
                    for (k = 0; k < game.participantIdentities.length; k++) {
                        var participantIdentity = game.participantIdentities[k];
                        if (participantIdentity.player.summonerId == aMemberId && k + 1 <= (game.participantIdentities.length) / 2) {
                            var playerTeam = 1;
                            teamFound = true;
                        }
                        else if (participantIdentity.player.summonerId == aMemberId && k + 1 > (game.participantIdentities.length) / 2) {
                            var playerTeam = 2;
                            teamFound = true;
                        }
                    }
                }

            }

            // if the player is on team 1, gets the summoner Ids of everyone on the first half of the participantidentities list
            if (playerTeam == 1){
                for (t = 0; t < (game.participantIdentities.length / 2); t++) {
                    var participantIdentity = game.participantIdentities[t];
                    allies[t] = participantIdentity.player.summonerId;
                }
            }

            // if the player is on team 1, gets the summoner Ids of everyone on the second half of the participantidentities list
            else if (playerTeam == 2){
                var j = 0;
                for (r = (game.participantIdentities.length / 2); r < game.participantIdentities.length; r++) {
                    var participantIdentity = game.participantIdentities[r];
                    allies[j] = participantIdentity.player.summonerId;
                    j++;
                }
            }

            return allies;
        };

        //gets the total kills of the allied team for the game/match
        var getTotalTeamKills = function(game, teamMemberIds) {
            var totalTeamKills = 0;
            for (k = 0; k < game.participantIdentities.length; k++) {
                var participantIdentity = game.participantIdentities[k];
                var participant = game.participants[k];
                for (j = 0; j < teamMemberIds.length; j++) {
                    if (participantIdentity.player.summonerId == teamMemberIds[j]) {
                        totalTeamKills = totalTeamKills + participant.stats.kills;
                    }
                }
            }
            //console.log('total team kills = ' + totalTeamKills);
            return totalTeamKills;
        };

        //get the kill participation for a single player in a single game
        var getKillParticipation = function(game, memberObject, totalTeamKills) {
                for (k = 0; k < game.participantIdentities.length; k++) {
                    var participantIdentity = game.participantIdentities[k];
                    if (participantIdentity.player.summonerName == memberObject.summonerName){
                        var participant = game.participants[k];
                        var playerName = participantIdentity.player.summonerName;
                        var playerKills = participant.stats.kills;
                        var playerAssists = participant.stats.assists;
                        var killParticipation = ((((playerKills + playerAssists) / totalTeamKills) * 100).toFixed(1));
                        killParticipation = parseFloat(killParticipation);
                        //console.log(playerName + ' had this many kills: ' + playerKills);
                        //console.log(playerName + ' had this many assists: ' + playerAssists);
                        //console.log('There were this many total team kills: ' + totalTeamKills);
                        //console.log(playerName + ' kill participation: ' + killParticipation);
                        return killParticipation;
                    }
                }
        };

        //organizes all the data grabbed from matches into an easy to navigate object
        var processData = function(teamGames, selectedTeam, dateDiff){

            //a list of all possible stats that will be shown in a graph
            var graphStats = ['Kill Participation', 'Kill Participation Averages'];
            $scope.graphStats = graphStats;

            var teamName = selectedTeam.name;
            //this is the main object that contains the stats i want to gather and organize for the whole team
            var teamStats = {};
            var games = [];
            var count = 0;

            angular.forEach(teamGames, function(teamGame){
                if(teamGame['data']){
                    games[count] = teamGame['data'];
                    count++;
                }
                else{
                    games[count] = teamGame;
                    count++;
                }
            });

            if (localStorage[teamName] && dateDiff > STORAGE_TIME){
                localStorage.removeItem(teamName);
                localStorage.removeItem(teamName+'Date');
            }

            if (!(localStorage[teamName]) || localStorage[teamName] && dateDiff > STORAGE_TIME){
                var storageDate = new Date().getTime();
                localStorage.setItem(teamName+'Date', storageDate);

                //stringify games object to store in local Storage.
                var gamesString = JSON.stringify(games);
                localStorage.setItem(teamName, gamesString);
            }

            var currentMembers = getMemberNames(selectedTeam, games);
            var gameNameList = [];

            for(m = 0; m < currentMembers.memberNames.length; m++){
                var memberName = currentMembers.memberNames[m];
                teamStats[memberName] = {};
                var memberStats = teamStats[memberName];
                memberStats.killParticipation = [];
                memberStats.summonerName = memberName;
                memberStats.summonerId = currentMembers.memberIds[m];
            }
            for (i = 0; i < DESIRED_GAMES; i++){
                gameNameList[i] = 'Game ' + (i + 1);
                var allyIds = getAllies(currentMembers.memberIds, games[i]);
                //calculate total Team Kills for this game
                var totalTeamKills = getTotalTeamKills(games[i], allyIds);

                angular.forEach(teamStats, function(memberObject){
                    var thisMemberKP = memberObject.killParticipation;
                    thisMemberKP[i] = getKillParticipation(games[i], memberObject, totalTeamKills);
                });
            }

            getAverage(currentMembers, teamStats, selectedTeam, 'killParticipation', DESIRED_GAMES);

            $scope.teamStats = teamStats;
            $scope.gameNameList = gameNameList;
            makeChart(teamStats, gameNameList);
            console.log(teamStats);


        };

        var makeChart = function(teamStats, gameNameList){
            var data = {
                // A labels array that can contain any sort of values
                // Our series array that contains series objects or in this case series data arrays
            };
            data.series = [];
            data.labels = [];

            angular.forEach(teamStats, function(member){
                data.series.push(member.killParticipationAverage);
                data.labels.push(member.summonerName);
            });

            // Create a new line chart object where as first parameter we pass in a selector
            // that is resolving to our chart container element. The Second parameter
            // is the actual data object.

            var options = {
                distributeSeries: true

            };

            new Chartist.Bar('.ct-chart', data, options);
        };

        //averages whatever stat you send in
        var getAverage = function(currentMembers, teamStats, selectedTeam, statToAverage, DESIRED_GAMES){

            var averageName = statToAverage.concat('Average');
            var count = 0;

            angular.forEach(teamStats, function(member){
                //console.log(member);
                var thisMemberStat = member[statToAverage];
                var totalStat= 0;
                var playedGames = 0;
                for (i = 0; i < DESIRED_GAMES; i++) {
                    //only add that game to the list if it exists
                    if (thisMemberStat[i] != undefined) {
                        playedGames++;
                        totalStat += thisMemberStat[i];
                    }
                }
                //MAKE THE NAME PART OF OBJECT????
                //console.log(member);
                //console.log(totalStat);
                //console.log(playedGames);
                member[averageName] = (totalStat / playedGames).toFixed(1);
                member[averageName] = parseFloat(member[averageName]);
                count++;
            });

            //it will be statToAverage + Averages
            //$scope[averageName] = averages;

        };

        $scope.getGames = function(selectedTeam) {

            $scope.teamClicked = true;

            var teamName = selectedTeam.name;

            if (selectedTeam.matchHistory.length < DESIRED_GAMES){
                DESIRED_GAMES = selectedTeam.matchHistory.length;
            }

            var gameIds = [];

            //gathers the game Ids from match history
            //currently using only 8 games to avoid hitting rate limit
            for (i = 0; i < DESIRED_GAMES; i++) {
                var match = selectedTeam.matchHistory[i];
                gameIds[i] = match.gameId;
            }

            var date = new Date().getTime();
            if (localStorage[teamName]){
                var dateDiff = date - localStorage[teamName+'Date'];
                console.log('It has been '+(dateDiff/60000).toFixed(0)+' minutes since a request was made for this team.');
            }

            //if there is a team store and the difference between this time and the time it was stored is greater than 30 mins...
            if (localStorage[teamName] && dateDiff <= STORAGE_TIME){
                console.log('lets grab from localStorage');
                var storedGames = JSON.parse(localStorage[teamName]);

                processData(storedGames, selectedTeam, dateDiff);
            }
            else{
                console.log('lets make a request');
                var myPromise = getMatchDetails.getMatchDetails(gameIds, selectedTeam);
                //runs once a response has been received for every matchDetails request
                myPromise.then(function(teamGames){
                    processData(teamGames, selectedTeam, dateDiff);
                }.bind(this));
            }
        };
    }]);
}(angular));