/**
 * Created by Jordan on 5/31/2015.
 */
(function(angular) {
    var app = angular.module('league', []);

    //controller definition
    app.controller('UserController', ['$scope', '$q', 'getSummoner', 'getTeams', 'getMatchDetails', 'convertToReadable', 'convertToCamelCase', function($scope, $q,  getSummoner, getTeams, getMatchDetails, convertToReadable, convertToCamelCase){

        //how many games I want to grab from a match history
        var DESIRED_GAMES = 8;

        //this list should have stat names that are exactly the same as the ones we grab from the league api
        var statList = [
            'kills',
            'deaths',
            'assists',
            'goldEarned',
            'wardsPlaced',
            'wardsKilled',
            'totalDamageDealtToChampions',
            'killParticipation'
        ];

        var statNameList = [];
        //convert the statlist from camelCase to readable text for the chart and dropdown box
        for(var x = 0; x < statList.length; x++){
            statNameList[x] = convertToReadable.convertToReadable(statList[x]);
        }
        $scope.statNameList = statNameList;
        //the chart we want to display when the user first clicks a team
        $scope.defaultStat = statNameList[0];

        // Redraws the chart if the width of the browser window changes between one of
        // Bootstrap's predefined sizes (xs, sm, md, lg)
        var checkWidth = function(){
            $(document).ready(function (){
                $scope.size1 = '';
                var width = $(window).width();
                if(width < 768){
                    $scope.size1 = 'xs';
                }
                else if(width >= 768 && width < 992){
                    $scope.size1 = 'sm';
                }
                else if(width >= 992 && width < 1200){
                    $scope.size1 = 'md';
                }
                else if(width >= 1200){
                    $scope.size1 = 'lg';
                }

            });
            $(window).on('resize', function () {
                var size2 = '';
                var width = $(window).width();
                if(width < 768){
                    size2 = 'xs';
                }
                else if(width >= 768 && width < 992){
                    size2 = 'sm';
                }
                else if(width >= 992 && width < 1200){
                    size2 = 'md';
                }
                else if(width >= 1200){
                    size2 = 'lg';
                }
                if(size2 != $scope.size1){
                    $scope.size1 = size2;
                    $scope.makeChart($scope.selectedStat, $scope.average, $scope.teamTotal);
                }
            });

            return true;
        };

        //keep track of browser widths and redraw charts if necessary
        checkWidth();

        $scope.searchSummoner = function(summoner) {
            var summonerName = summoner.toLowerCase().replace(/ /g,'');
            //call to service to get summoner by summoner name
            getSummoner.getSummoner(summonerName).then(function(summonerId) {
                if(summonerId){
                    getUserTeams(summonerId, summonerName);
                }
                else{
                    $scope.error = response;
                    $scope.isError = true;
                }

            });
        };

        //call to service to get teams by summoner ID
        var getUserTeams = function(summonerId, summonerName) {
            $scope.gotTeams = true;
            getTeams.getTeams(summonerId, summonerName).then(function(teams) {
                if(teams){
                    $scope.teams = teams;
                }
                else{
                    $scope.error = response;
                    $scope.isError = true;
                }
            });
        };



        //get the game information for the last (DESIRED_GAMES) in the user match history
        //make whatever chart is the default
        $scope.getMatches = function(selectedTeam) {


            $scope.selectedTeam = selectedTeam.name;
            $scope.teamClicked = true;

            var teamName = selectedTeam.name;

            //if the team has less matches played than the amount I want to grab, we want to grab all the matches
            if (selectedTeam.matchHistory.length < DESIRED_GAMES){
                DESIRED_GAMES = selectedTeam.matchHistory.length;
            }

            //array that holds the ids for each game in the match history
            var matchIds = [];

            //gathers the match Ids from match history
            for (i = 0; i < DESIRED_GAMES; i++) {
                var match = selectedTeam.matchHistory[i];
                matchIds[i] = match.gameId;
            }


            var myPromise = getMatchDetails.getMatchDetails(matchIds, teamName);
            //runs once a response has been received for every matchDetails request
            myPromise.then(function(matches){
                processData(matches, selectedTeam);
            }.bind(this));

        };

        //organizes all the data grabbed from matches into an easy to navigate object
        var processData = function(matches, selectedTeam){
            //console.log(matches);

            //HERE we want to go through each match, and throw out any that aren't on summoners rift or < 10 players
            //this way, we can be only looking at ranked 5v5s

            //this is the main object that contains the stats i want to gather and organize for the whole team
            var team = {};

            //get all team members that have played in matches from the match history
            team['members'] = getMembers(selectedTeam, matches);

            //add colors to the team object so the legend can be dynamically generated
            team = addColors(team);



            //put all the stats into the object
            team = getStats(team, matches, statList);

            //console.log(team);

            $scope.team = team;


            $scope.makeChart($scope.defaultStat, $scope.average, $scope.teamTotal);

        };

        //gets the team member ids of the players CURRENTLY on the team
        var getMembers = function(selectedTeam, matches) {
            var members = {};
            var rosterIds = [];

            for (i = 0; i < selectedTeam.roster.memberList.length; i++) {
                var member = selectedTeam.roster.memberList[i];
                rosterIds[i] = member.playerId;
            }

            angular.forEach(matches, function(match){
                angular.forEach(match.participantIdentities, function(participant){
                    angular.forEach(rosterIds, function(aRosterId){
                        if (participant.player.summonerId == aRosterId){
                            members[participant.player.summonerName] = {};
                            members[participant.player.summonerName]['summonerName'] = participant.player.summonerName;
                            members[participant.player.summonerName]['summonerId'] = participant.player.summonerId;
                        }
                    });
                });
            });
            return members;
        };

        $scope.makeChart = function(statName, average, teamTotal){

            statName = convertToCamelCase.convertToCamelCase(statName);


            //need to reset the canvas
            $scope.resetCanvas();
            var ctx = document.getElementById("chart").getContext("2d");





            //average determines what type of chart to make as well as where to get data
            //teamTotal determines where to get data

            //a line chart with each members stats over all the games
            if(!average && !teamTotal){
                var data = {};
                data.datasets = [];
                data.labels = [];

                for(var i = 0; i < DESIRED_GAMES; i++)
                {
                    data.labels[i] = 'Game ' + (i + 1);
                }

                angular.forEach($scope.team.members, function (member) {
                    var playerData = {};
                    playerData['label'] = member.summonerName;
                    playerData['strokeColor'] = member.color;
                    playerData['pointColor'] = member.color;
                    playerData['pointHightlightFill'] = member.color;
                    playerData['data'] = member.stats[statName].perMatch;
                    data.datasets.push(playerData);
                });

                new Chart(ctx).Line(data, {
                    //define chart options here
                    datasetFill : false,
                    bezierCurve : false,
                    scaleGridLineColor : "#666666",
                    datasetStrokeWidth : 3,
                    animationEasing: "easeOutQuint"
                });
            }

            //a pie chart showing the average for a stat for each member
            else if(average && !teamTotal){
                var data = [];
                angular.forEach($scope.team.members, function (member) {
                    var playerData = {};
                    playerData['label'] = member.summonerName;
                    playerData['color'] = member.color;
                    playerData['value'] = member.stats[statName].average;
                    data.push(playerData);
                });
                new Chart(ctx).Pie(data, {
                    //define chart options here
                });
            }

            //a line chart showing the team total of a stat for each game
            else if(!average && teamTotal){
                var data = {};
                data.datasets = [];
                data.labels = [];

                for(var i = 0; i < DESIRED_GAMES; i++)
                {
                    data.labels[i] = 'Game ' + (i + 1);
                }

                var playerData = {};
                playerData['label'] = 'some team';
                playerData['strokeColor'] = '#a748ca';
                playerData['pointColor'] = '#a748ca';
                playerData['pointHightlightFill'] = '#a748ca';
                playerData['data'] = $scope.team.stats[statName].perMatch;
                data.datasets.push(playerData);

                new Chart(ctx).Line(data, {
                    //define chart options here
                    datasetFill : false,
                    bezierCurve : false,
                    scaleGridLineColor : "#666666",
                    datasetStrokeWidth : 3,
                    animationEasing: "easeOutQuint"
                });
            }

            //a bar chart (basically just a number) for the team total average of a stat
            else if(average && teamTotal){
                var data = {};
                data.datasets = [];
                data.labels = [];
                data.labels.push('Average');

                var playerData = {};
                playerData['label'] = 'some team';
                playerData['strokeColor'] = '#a748ca';
                playerData['fillColor'] = '#a748ca';
                playerData['data'] = [];
                playerData.data.push($scope.team.stats[statName].average);
                data.datasets.push(playerData);

                new Chart(ctx).Bar(data, {
                    //define chart options here
                });
            }


        };

        //reset the canvas so we can have a new chart
        $scope.resetCanvas = function () {
            if($('#chart')){
                $('#chart').remove();
            }
            if($scope.teamClicked){
                $('#chartContainer').append('<canvas ng-show="teamClicked" id="chart"></canvas>');
            }
        };

        //add a color to each member
        var addColors = function(team) {
            var colors = [ '#A03550',
                           '#27765A',
                           '#AF603A',
                           '#5C9A33',
                           '#35357B',
                           '#36C9BB',
                           '#0544d3',
                           '#6b0392',
                           '#f05b4f',
                           '#dda458',
                           '#eacf7d',
                           '#86797d',
                           '#b2c326',
                           '#6188e2',
                           '#a748ca'];

            var i = 0;
            angular.forEach(team.members, function(member){
                member['color'] = colors[i];
                i++;
            });

            return team;
        };

        //get the ultimate super jumbo awesome stats put into the team object. returns a team object with stats
        var getStats = function(team, matches, statList){

            //create stats for the entire team total
            team['stats'] = {};

            //create stats for each member
            angular.forEach(team.members, function(member){
                member['stats'] = {};
            });


            angular.forEach(statList, function(statName){
                team.stats[statName] = {};
                team.stats[statName]['perMatch'] = [];

                angular.forEach(team.members, function(member) {
                    member.stats[statName] = {};
                    member.stats[statName]['perMatch'] = [];
                });

                angular.forEach(matches, function(match){
                    //variable to hold the total for a single match, which will then be pushed to team.stats[statName].perMatch
                    var statTotal = 0;

                    angular.forEach(team.members, function(member){


                        var foundMember = false;

                        for(var k = 0; k < match.participantIdentities.length; k ++){
                            var participantIdentity = match.participantIdentities[k];
                            var participant = match.participants[k];
                            if (participantIdentity.player.summonerId == member.summonerId) {
                                member.stats[statName].perMatch.push(participant.stats[statName]);
                                foundMember = true;
                                statTotal += participant.stats[statName];
                            }
                        }
                        if (foundMember == false){
                            member.stats[statName].perMatch.push(null);
                        }

                        //get the average for the stat from all games
                        member.stats[statName]['average'] = getAverage(member.stats[statName].perMatch);
                    });
                    team.stats[statName].perMatch.push(statTotal);

                });

                team.stats[statName]['average'] = getAverage(team.stats[statName].perMatch);

            });

            team = getKillParticipation(team);

            //return the team object with all the new data!
            return team;
        };

        //calculate the kill participation for the entire team and every member of the team individually
        var getKillParticipation = function(team){
            team.stats['killParticipation'] = {};
            team.stats.killParticipation['perMatch'] = [];

            angular.forEach(team.members, function(member) {

                member.stats['killParticipation'] = {};
                member.stats.killParticipation['perMatch'] = [];

                for(var x = 0; x < member.stats.kills.perMatch.length; x++){

                    if(team.stats.killParticipation.perMatch[x] == null) {
                        team.stats.killParticipation.perMatch[x] = 0;
                    }

                    var kills = member.stats.kills.perMatch[x];
                    var assists = member.stats.assists.perMatch[x];
                    var totalTeamKills = team.stats.kills.perMatch[x];

                    var killParticipation = (((kills + assists) / totalTeamKills) * 100).toFixed(2);
                    killParticipation = parseFloat(killParticipation);


                    team.stats.killParticipation.perMatch[x] += killParticipation;


                    //if the member did not play in that game, kill participation should be null.
                    if(kills == null){
                        killParticipation = null;
                    }

                    member.stats.killParticipation.perMatch[x] = killParticipation;
                }
                member.stats.killParticipation['average'] = getAverage(member.stats.killParticipation.perMatch);
            });



            team.stats.killParticipation['average'] = getAverage(team.stats.killParticipation.perMatch);

            //return a team object than contains an average property and an array of kill
            return team;
        };

        //averages whatever stat you send in
        var getAverage = function(statPerMatch){

            var total = 0;
            var dividend = 0;

            angular.forEach(statPerMatch, function(value){
                if(value){
                    total += value;
                    dividend++;
                }
            });


            //return a number that is the average for the given stat
            return parseFloat((total / dividend).toFixed(2));
        };

    }]);
}(angular));