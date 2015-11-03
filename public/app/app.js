(function(angular) {
    var app = angular.module('league', ['ngRoute']);

    app.config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: 'partials/search.html'
                }).
                when('/teams', {
                    templateUrl: 'partials/teams.html'

                }).
                when('/chart', {
                    templateUrl: 'partials/chart.html'
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

    app.controller('TeamController', [ '$q', '$scope', 'shareData', 'getMatchDetails', '$location', '$timeout', function($q, $scope, shareData, getMatchDetails, $location){
        this.summoner = shareData.getSummoner();
        if(!this.summoner){
            $location.path('/');
        }
        var DESIRED_GAMES = shareData.getDesiredGames();

        //get the game information for the last (DESIRED_GAMES) in the user match history
        this.getMatches = function(selectedTeam, region) {

            if(selectedTeam.matchHistory){
                //if the team has less matches played than the amount I want to grab, we want to grab all the matches
                if (selectedTeam.matchHistory.length < DESIRED_GAMES){
                    DESIRED_GAMES = selectedTeam.matchHistory.length;
                }

                //array that holds the ids for each game in the match history
                var matchIds = [];
                var opposingTeamNames = [];

                //gathers the match Ids from match history
                for (var i = 0; i < selectedTeam.matchHistory.length; i++) {
                    var match = selectedTeam.matchHistory[i];
                    //if it's played on summoner's rift and we haven't hit the max amount of DESIRED_GAMES
                    if(match.mapId == 11 && matchIds.length < DESIRED_GAMES){
                        opposingTeamNames.push(match.opposingTeamName);
                        matchIds.push(match.gameId);
                    }
                }
                //need to reverse the order of the team names and matches so the most recent is at the end of the array
                matchIds.reverse();
                opposingTeamNames.reverse();
            }

            //if there are no matches played on summoners rift
            if(!matchIds || matchIds.length == 0 ){
                $scope.error = selectedTeam.name + ' has not played any Ranked 5v5 matches recently.';
            }
            else{
                var myPromise = getMatchDetails.getMatchDetails(matchIds, selectedTeam.name, region);
                //runs once a response has been received for every matchDetails request
                myPromise.then(function(response){
                    //if getting the matches is successful
                    if (response[response.length - 1].matchType) {
                        shareData.setTeam(selectedTeam);
                        shareData.setMatches(response);
                        shareData.setOpposingTeamNames(opposingTeamNames);
                        $location.path('/chart');
                    }
                    //currently have it set so that it will display error if a single match request is unsuccessful
                    else{
                        $scope.error = response[response.length - 1].data;
                    }
                }.bind(this));

            }

        };

    }]);

    app.controller('ChartController', ['$q', 'shareData', 'getSummoner', 'getTeams', 'getMatchDetails', '$location', '$timeout', function($q, shareData, getSummoner, getTeams, getMatchDetails, $location, $timeout){
        var matches = shareData.getMatches();
        var opposingTeamNames = shareData.getOpposingTeamNames();
        this.selectedTeam = shareData.getTeam();

        //the stats i want to display to the user
        this.statNameList = [
            'Kill Participation',
            'Deaths per min.',
            'Assists per min.',
            'Kills per min.',
            'Wards Placed per min.',
            'Wards Killed per min.',
            'Damage to Champions per min.',
            'CS per min.',
            'Gold Earned per min.'
        ];

        //gets the team member ids of the players CURRENTLY on the team
        var getMembers = function(selectedTeam, matches) {
            var members = {};
            var memberCount = 0;
            var roster = selectedTeam.roster.memberList;

            angular.forEach(matches, function(match){
                if(match.queueType == 'RANKED_TEAM_5x5'){
                    for(var x = 0; x < match.participantIdentities.length; x++){
                        var participant = match.participantIdentities[x];
                        angular.forEach(roster, function(rosterMember){
                            if (participant.player.summonerId == rosterMember.playerId && x <= 4){
                                for(var p = 0; p <= 4; p++){
                                    var member = match.participantIdentities[p];
                                    if(!members[member.player.summonerName]){
                                        members[member.player.summonerName] = {};
                                        members[member.player.summonerName]['summonerName'] = member.player.summonerName;
                                        members[member.player.summonerName]['summonerId'] = member.player.summonerId;
                                    }
                                }
                            }
                            else if (participant.player.summonerId == rosterMember.playerId && x >= 5){
                                for(var k = 5; k >= 9 ; k++){
                                    var member = match.participantIdentities[k];
                                    if(!members[member.player.summonerName]){
                                        members[member.player.summonerName] = {};
                                        members[member.player.summonerName]['summonerName'] = member.player.summonerName;
                                        members[member.player.summonerName]['summonerId'] = member.player.summonerId;
                                    }
                                }
                            }
                        });
                    }
                }
            });
            return members;
        };

        //figure out whether a single match was a victory for the selected team. return bool
        var getVictory = function(match, team){
            var victory = '';
            angular.forEach(team.members, function(member){
                for(var x = 0; x < match.participantIdentities.length; x++) {
                    if (match.participantIdentities[x].player.summonerName == member.summonerName) {
                        if (x < 5){
                            var teamId = 100;
                        }
                        else{
                            var teamId = 200;
                        }
                        return angular.forEach(match.teams, function(matchTeam){
                            if(matchTeam.teamId == teamId){
                                victory = matchTeam.winner;
                            }
                        });

                    }
                }
            });
            return victory;
        };

        //add a color to each member
        var addColors = function(team) {
            var colors = [ '#F44336',
                '#4CAF50',
                '#00BCD4',
                '#9C27B0',
                '#3F51B5',
                '#FF9800',
                '#CDDC39',
                '#FF5722',
                '#673AB7',
                '#2196F3',
                '#FFEB3B',
                '#8BC34A',
                '#009688',
                '#E91E63',
                '#03A9F4'];

            //these darkColors corresponds with colors
            var darkColors = [ '#D32F2F',
                '#388E3C',
                '#0097A7',
                '#7B1FA2',
                '#303F9F',
                '#F57C00',
                '#CDDC39',
                '#E64A19',
                '#512DA8',
                '#1976D2',
                '#FBC02D',
                '#689F3',
                '#00796B',
                '#C2185B',
                '#0288D1'];



            var i = 0;
            angular.forEach(team.members, function(member){
                member['color'] = colors[i];
                member['darkColor'] = darkColors[i];
                i++;
            });

            return team;
        };

        //get a stat directly from the match objects
        var getStat = function(team, matches, statName){

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

        var getStatPerMin = function(team, statName) {
            var statNamePerMin = statName+'PerMin';
            team.stats[statNamePerMin] = {};
            team.stats[statNamePerMin]['perMatch'] = [];

            angular.forEach(team.members, function(member) {

                member.stats[statNamePerMin] = {};
                member.stats[statNamePerMin]['perMatch'] = [];

                for(var x = 0; x < member.stats[statName].perMatch.length; x++){
                    if(member.stats[statName].perMatch[x] == null){
                        var stat = null;
                    }
                    else {
                        var stat = parseFloat((member.stats[statName].perMatch[x] / team.stats.matchDurations[x]).toFixed(2));
                    }
                    member.stats[statNamePerMin].perMatch.push(stat);
                    if(!team.stats[statNamePerMin].perMatch[x]){
                        team.stats[statNamePerMin].perMatch.push(stat);
                    }
                    else{
                        team.stats[statNamePerMin].perMatch[x] += (stat);
                    }
                }
                member.stats[statNamePerMin]['average'] = getAverage(member.stats[statNamePerMin].perMatch);
            });

            team.stats[statNamePerMin]['average'] = getAverage(team.stats[statNamePerMin].perMatch);

            return team;

        };

        //averages whatever stat you send in
        var getAverage = function(statPerMatch){

            var total = 0;
            var dividend = 0;

            angular.forEach(statPerMatch, function(value){
                if(value || value === 0){
                    total += value;
                    dividend++;
                }
            });


            //return a number that is the average for the given stat
            return parseFloat((total / dividend)).toFixed(2) || 0;
        };

        //toggles whether or not to show the averages (bar or line chart)
        this.toggleAverage = function(){
            var averageButton = document.getElementById('average');
            if(this.average == false){
                this.average = true;
                averageButton.removeAttribute('style');
                averageButton.setAttribute('style', 'opacity: 1;');

            }
            else{
                this.average = false;
                averageButton.removeAttribute('style');
            }
        };

        //toggle the data for a chart
        this.toggleData = function(selectedMember, selectedStat){

            var memberButton = document.getElementById(selectedMember.summonerId);
            angular.forEach(team.members, function (member){
               if(member.summonerId == selectedMember.summonerId){
                   if(member.showData == true){
                       var disabledStyle = 'background-color: '+member.color+'; opacity: 0.4;';
                       member.showData = false;
                       memberButton.removeAttribute('style');
                       memberButton.setAttribute('style', disabledStyle);
                   }
                   else{
                       var enabledStyle = 'background-color: '+member.color+';';
                       memberButton.removeAttribute('style');
                       memberButton.setAttribute('style', enabledStyle);
                       member.showData = true;
                   }
               }
            });

            this.makeChart(selectedStat, team, false)
        };

        this.makeChart = function(statName, team, animation){
            var average = this.average;

            switch(statName){
                case 'Kill Participation':
                    statName = 'killParticipation';
                    break;
                case 'Deaths per min.':
                    statName = 'deathsPerMin';
                    break;
                case 'Assists per min.':
                    statName = 'assistsPerMin';
                    break;
                case 'Wards Placed per min.':
                    statName = 'wardsPlacedPerMin';
                    break;
                case 'Wards Killed per min.':
                    statName = 'wardsKilledPerMin';
                    break;
                case 'Damage to Champions per min.':
                    statName = 'totalDamageDealtToChampionsPerMin';
                    break;
                case 'CS per min.':
                    statName = 'minionsKilledPerMin';
                    break;
                case 'Kills per min.':
                    statName = 'killsPerMin';
                    break;
                case 'Gold Earned per min.':
                    statName = 'goldEarnedPerMin';
                    break;
                default:
                    break;
            }

            //need to reset the canvas
            var chart = $('#chart');
            if(chart){
                chart.remove();
            }
            $('#chartContainer').append('<canvas id="chart"></canvas>');

            var ctx = document.getElementById("chart").getContext("2d");

            //a line chart with each members stats over all the games
            if(!average){
                var data = {};
                data.datasets = [];
                data.labels = [];

                for(var i = 0; i < opposingTeamNames.length; i++)
                {
                    if(team.stats.victories[i] == true){
                        var result = 'Victory';
                    }
                    else{
                        var result = 'Defeat';
                    }
                    data.labels[i] =  result+' - vs '+opposingTeamNames[i];
                }

                angular.forEach(team.members, function (member) {
                    if(member.showData == true) {
                        var playerData = {};
                        playerData['label'] = member.summonerName;
                        playerData['strokeColor'] = member.color;
                        playerData['pointColor'] = member.color;
                        playerData['pointStrokeColor'] = member.darkColor;
                        playerData['pointHighlightFill'] = member.darkColor;
                        playerData['data'] = member.stats[statName].perMatch;
                        data.datasets.push(playerData);
                    }
                });


                new Chart(ctx).Line(data, {
                    //define chart options here
                    animation: animation,
                    responsive: true,
                    datasetFill : false,
                    bezierCurve : false,
                    scaleGridLineColor : "#000000",
                    scaleFontSize: 16,
                    tooltipFontSize: 18,
                    scaleFontColor: "#000000",
                    tooltipFontFamily: "'Roboto', 'Helvetica', 'Arial', 'sans-serif'",
                    scaleFontFamily: "'Roboto', 'Helvetica', 'Arial', 'sans-serif'",
                    tooltipTitleFontFamily: "'Roboto', 'Helvetica', 'Arial', 'sans-serif'",
                    pointDotRadius: 7,
                    pointDotStrokeWidth: 3,
                    datasetStrokeWidth: 6

                });
            }

            //a bar chart showing the average for a stat for each member
            else if(average){
                var data = {};
                data['labels'] = ['Averages'];
                data.datasets = [];
                angular.forEach(team.members, function (member) {
                    if(member.showData == true) {
                        var datasets = data.datasets;
                        var playerData = {};
                        playerData['label'] = member.summonerName;
                        playerData['fillColor'] = member.color;
                        playerData['strokeColor'] = member.darkColor;
                        playerData['data'] = [];
                        playerData.data.push(member.stats[statName].average);
                        datasets.push(playerData);
                    }
                });
                new Chart(ctx).Bar(data, {
                    //define chart options here
                    animation: animation,
                    responsive: true,
                    animationEasing: "easeOutQuint",
                    scaleFontSize: 16,
                    scaleGridLineColor : "#000000",
                    barValueSpacing: 0,
                    barStrokeWidth: 3,
                    tooltipFontSize: 18,
                    scaleFontColor: "#000000",
                    tooltipFontFamily: "'Roboto', 'Helvetica', 'Arial', 'sans-serif'",
                    scaleFontFamily: "'Roboto', 'Helvetica', 'Arial', 'sans-serif'",
                    tooltipTitleFontFamily: "'Roboto', 'Helvetica', 'Arial', 'sans-serif'"

                });
            }
        };

        if(!matches){
            $location.path('/');
        }
        else{
            //this is the main object that contains the stats i want to gather and organize for the whole team
            var team = {};

            //get all team members that have played in matches from the match history
            team['members'] = getMembers(this.selectedTeam, matches);

            //add colors to the team object so the legend can be dynamically generated
            team = addColors(team);

            //create stats for the entire team total
            team['stats'] = {};

            //get the match durations
            team.stats['matchDurations'] = [];
            team.stats['victories'] = [];
            angular.forEach(matches, function(match){
                team.stats.victories.push(getVictory(match, team));
                team.stats.matchDurations.push(match.matchDuration / 60);
            });


            //create stats object for each member
            angular.forEach(team.members, function(member){
                member['stats'] = {};
                member['showData'] = true;
            });

            //put all the stats into the object
            team = getStat(team, matches, 'deaths');
            team = getStat(team, matches, 'assists');
            team = getStat(team, matches, 'totalDamageDealtToChampions');
            team = getStat(team, matches, 'kills');
            team = getStat(team, matches, 'wardsPlaced');
            team = getStat(team, matches, 'wardsKilled');
            team = getStat(team, matches, 'minionsKilled');
            team = getStat(team, matches, 'goldEarned');

            team = getKillParticipation(team);
            team = getStatPerMin(team, 'kills');
            team = getStatPerMin(team, 'deaths');
            team = getStatPerMin(team, 'assists');
            team = getStatPerMin(team, 'wardsPlaced');
            team = getStatPerMin(team, 'wardsKilled');
            team = getStatPerMin(team, 'minionsKilled');
            team = getStatPerMin(team, 'totalDamageDealtToChampions');
            team = getStatPerMin(team, 'goldEarned');

            this.team = team;

            this.makeChart(this.statNameList[0], team, true);

        }

    }]);

}(angular));

