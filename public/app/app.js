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
            'Deaths',
            'Assists',
            'Kills',
            'Wards Placed per Minute',
            'Wards Killed per Minute',
            'Total Damage Dealt To Champions',
            'CS per Minute',
            'Gold Earned'
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

            //these darkColors corresponds with colors
            var darkColors = [ '#7E1630',
                '#115D42',
                '#893D18',
                '#3D7916',
                '#1D1D61',
                '#009888',
                '#04329D',
                '#410158',
                '#AE1D12',
                '#996117',
                '#9C7F25',
                '#31272A',
                '#697600',
                '#2051C1',
                '#7B07A5'];



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

        var getMinionsKilledPerMin= function(team){
            team.stats['minionsKilledPerMin'] = {};
            team.stats.minionsKilledPerMin['perMatch'] = [];

            angular.forEach(team.members, function(member) {

                member.stats['minionsKilledPerMin'] = {};
                member.stats.minionsKilledPerMin['perMatch'] = [];

                for(var x = 0; x < member.stats.minionsKilled.perMatch.length; x++){
                    if(member.stats.minionsKilled.perMatch[x] == null){
                        var minionsKilledPerMin = null;
                    }
                    else {
                        var minionsKilledPerMin = parseFloat((member.stats.minionsKilled.perMatch[x] / team.stats.matchDurations[x]).toFixed(2));
                    }
                    member.stats.minionsKilledPerMin.perMatch.push(minionsKilledPerMin);
                    if(!team.stats.minionsKilledPerMin.perMatch[x]){
                        team.stats.minionsKilledPerMin.perMatch.push(minionsKilledPerMin);
                    }
                    else{
                        team.stats.minionsKilledPerMin.perMatch[x] += (minionsKilledPerMin);
                    }
                }
                member.stats.minionsKilledPerMin['average'] = getAverage(member.stats.minionsKilledPerMin.perMatch);
            });

            team.stats.minionsKilledPerMin['average'] = getAverage(team.stats.minionsKilledPerMin.perMatch);

            return team;
        };

        var getWardsKilledPerMin= function(team){
            team.stats['wardsKilledPerMin'] = {};
            team.stats.wardsKilledPerMin['perMatch'] = [];

            angular.forEach(team.members, function(member) {

                member.stats['wardsKilledPerMin'] = {};
                member.stats.wardsKilledPerMin['perMatch'] = [];

                for(var x = 0; x < member.stats.wardsKilled.perMatch.length; x++){
                    if(member.stats.wardsKilled.perMatch[x] == null){
                        var wardsKilledPerMin = null;
                    }
                    else {
                        var wardsKilledPerMin = parseFloat((member.stats.wardsKilled.perMatch[x] / team.stats.matchDurations[x]).toFixed(2));
                    }
                    member.stats.wardsKilledPerMin.perMatch.push(wardsKilledPerMin);
                    if(!team.stats.wardsKilledPerMin.perMatch[x]){
                        team.stats.wardsKilledPerMin.perMatch.push(wardsKilledPerMin);
                    }
                    else{
                        team.stats.wardsKilledPerMin.perMatch[x] += (wardsKilledPerMin);

                    }

                }
                member.stats.wardsKilledPerMin['average'] = getAverage(member.stats.wardsKilledPerMin.perMatch);
            });

            team.stats.wardsKilledPerMin['average'] = getAverage(team.stats.wardsKilledPerMin.perMatch);

            return team;
        };

        var getWardsPlacedPerMin= function(team){
            team.stats['wardsPlacedPerMin'] = {};
            team.stats.wardsPlacedPerMin['perMatch'] = [];

            angular.forEach(team.members, function(member) {

                member.stats['wardsPlacedPerMin'] = {};
                member.stats.wardsPlacedPerMin['perMatch'] = [];

                for(var x = 0; x < member.stats.wardsPlaced.perMatch.length; x++){
                    if(member.stats.wardsPlaced.perMatch[x] == null){
                        var wardsplacedPerMin = null;
                    }
                    else {
                        var wardsplacedPerMin = parseFloat((member.stats.wardsPlaced.perMatch[x] / team.stats.matchDurations[x]).toFixed(2));
                    }

                    member.stats.wardsPlacedPerMin.perMatch.push(wardsplacedPerMin);
                    if(!team.stats.wardsPlacedPerMin.perMatch[x]){
                        team.stats.wardsPlacedPerMin.perMatch.push(wardsplacedPerMin);
                    }
                    else{
                        team.stats.wardsPlacedPerMin.perMatch[x] += (wardsplacedPerMin);
                    }

                }
                member.stats.wardsPlacedPerMin['average'] = getAverage(member.stats.wardsPlacedPerMin.perMatch);
            });

            team.stats.wardsPlacedPerMin['average'] = getAverage(team.stats.wardsPlacedPerMin.perMatch);

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

        //toggle the data for a chart
        this.toggleData = function(selectedMember, selectedStat){

            var memberButton = document.getElementById(selectedMember.summonerId);
            angular.forEach(team.members, function (member){
               if(member.summonerId == selectedMember.summonerId){
                   if(member.showData == true){
                       var disabledStyle = 'background-image: -webkit-linear-gradient('+member.color+', '+member.darkColor+'); background-image: -o-linear-gradient('+member.color+', '+member.darkColor+'); background-image: -moz-linear-gradient('+member.color+', '+member.darkColor+'); background-image: linear-gradient('+member.color+', ' +member.darkColor+'); opacity: 0.4;';
                       member.showData = false;
                       memberButton.removeAttribute('style');
                       memberButton.setAttribute('style', disabledStyle);
                   }
                   else{
                       var enabledStyle = 'background-image: -webkit-linear-gradient('+member.color+', '+member.darkColor+'); background-image: -o-linear-gradient('+member.color+', '+member.darkColor+'); background-image: -moz-linear-gradient('+member.color+', '+member.darkColor+'); background-image: linear-gradient('+member.color+', ' +member.darkColor+');';
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
                case 'Deaths':
                    statName = 'deaths';
                    break;
                case 'Assists':
                    statName = 'assists';
                    break;
                case 'Wards Placed per Minute':
                    statName = 'wardsPlacedPerMin';
                    break;
                case 'Wards Killed per Minute':
                    statName = 'wardsKilledPerMin';
                    break;
                case 'Total Damage Dealt To Champions':
                    statName = 'totalDamageDealtToChampions';
                    break;
                case 'CS per Minute':
                    statName = 'minionsKilledPerMin';
                    break;
                case 'Kills':
                    statName = 'kills';
                    break;
                case 'Gold Earned':
                    statName = 'goldEarned';
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
                    data.labels[i] = 'vs. '+opposingTeamNames[i];
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
                    scaleGridLineColor : "#666666",
                    scaleFontSize: 14,
                    tooltipFontSize: 16,
                    scaleFontColor: "#cccccc",
                    tooltipFontFamily: "'PT Serif', 'Helvetica', 'Arial', 'sans-serif'",
                    scaleFontFamily: "'PT Serif', 'Helvetica', 'Arial', 'sans-serif'",
                    tooltipTitleFontFamily: "'PT Serif', 'Helvetica', 'Arial', 'sans-serif'",
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
                    scaleGridLineColor : "#666666",
                    barValueSpacing: 0,
                    barStrokeWidth: 3,
                    tooltipFontSize: 16,
                    scaleFontColor: "#cccccc",
                    scaleFontFamily: "'PT Serif', 'Helvetica', 'Arial', 'sans-serif'",
                    tooltipFontFamily: "'PT Serif', 'Helvetica', 'Arial', 'sans-serif'",
                    tooltipTitleFontFamily: "'PT Serif', 'Helvetica', 'Arial', 'sans-serif'"

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
            angular.forEach(matches, function(match){
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
            team = getMinionsKilledPerMin(team);
            team = getWardsKilledPerMin(team);
            team = getWardsPlacedPerMin(team);

            this.team = team;

            this.makeChart(this.statNameList[0], team, true);

        }

    }]);


    }(angular));

