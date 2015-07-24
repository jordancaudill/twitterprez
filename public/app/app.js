/**
 * Created by Jordan on 5/31/2015.
 */
(function(angular) {
    var app = angular.module('league', []);

    //controller definition
    app.controller('UserController', ['$scope', '$q', 'getSummoner', 'getTeams', 'getMatchDetails', function($scope, $q,  getSummoner, getTeams, getMatchDetails){

        var RATE_LIMIT = 10;

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

            var DESIRED_GAMES = 8;

            if (selectedTeam.matchHistory.length < DESIRED_GAMES){
                DESIRED_GAMES = selectedTeam.matchHistory.length;
            }

            //object containing all team stats
            var teamStats = {};

            var gameIds = [];

            //gathers the game Ids from match history
            //currently using only 8 games to avoid hitting rate limit
            for (i = 0; i < DESIRED_GAMES; i++) {
                var match = selectedTeam.matchHistory[i];
                gameIds[i] = match.gameId;
            }

            //do if statement heres so u dont gotta f with promise?
            var myPromise = getMatchDetails.getMatchDetails(gameIds, selectedTeam);


            //runs once a response has been received for every matchDetails request
            myPromise.then(function(responseObjects){
                var games = [];
                var count = 0;

                angular.forEach(responseObjects, function(responseObject){
                    games[count] = responseObject.data;
                    count++;
                });

                localStorage.setItem(selectedTeam, games);

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
                console.log(teamStats);

            }.bind(this));




        };
    }]);
}(angular));