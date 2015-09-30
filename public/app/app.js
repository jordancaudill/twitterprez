/**
 * Created by Jordan on 5/31/2015.
 */
(function(angular) {
    var app = angular.module('league', []);

    //controller definition
    app.controller('UserController', ['$scope', '$q', 'getSummoner', 'getTeams', 'getMatchDetails', 'convertToReadable', 'convertToCamelCase', function($scope, $q,  getSummoner, getTeams, getMatchDetails, convertToReadable, convertToCamelCase){

        //how many games I want to grab from a match history
        var DESIRED_GAMES = 5;

        $scope.regions = [
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


        //the stats i want to display to the user
        var statNameList = [
            'Kill Participation',
            'Deaths',
            'Assists',
            'Wards Placed per Minute',
            'Wards Killed per Minute',
            'Total Damage Dealt To Champions',
            'CS per Minute',
            'CS @ 10 Minutes'
        ];

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

        $scope.searchSummoner = function(summoner, region) {
            $scope.searched = true;
            $scope.isError = false;
            var summonerName = summoner.toLowerCase().replace(/ /g,'');
            //call to service to get summoner by summoner name
            getSummoner.getSummoner(summonerName, region).then(function(response) {
                if(response[summonerName]){
                    $scope.summonerId = response[summonerName].id;
                    getUserTeams(response[summonerName].id, summonerName, region);
                }
                else{
                    $scope.error = response;
                    $scope.isError = true;
                }

            });
        };

        //call to service to get teams by summoner ID
        var getUserTeams = function(summonerId, summonerName, region) {
            $scope.gotTeams = true;
            $scope.isError = false;
            getTeams.getTeams(summonerId, summonerName, region).then(function(teams) {
                if(teams){
                    $scope.teams = teams;
                }
                else{
                }
            });
        };

        //get the game information for the last (DESIRED_GAMES) in the user match history
        //make whatever chart is the default
        $scope.getMatches = function(selectedTeam, region) {
            $scope.isError = false;

            $scope.selectedTeam = selectedTeam.name;

            var teamName = selectedTeam.name;

            //if the team has less matches played than the amount I want to grab, we want to grab all the matches
            if (selectedTeam.matchHistory.length < DESIRED_GAMES){
                DESIRED_GAMES = selectedTeam.matchHistory.length;
            }

            //array that holds the ids for each game in the match history
            var matchIds = [];
            $scope.opposingTeamNames = [];

            //gathers the match Ids from match history
            for (var i = 0; i < selectedTeam.matchHistory.length; i++) {
                var match = selectedTeam.matchHistory[i];
                //if it's played on summoner's rift and we haven't hit the max amount of DESIRED_GAMES
                if(match.mapId == 11 && matchIds.length < DESIRED_GAMES){
                    $scope.opposingTeamNames.push(match.opposingTeamName);
                    matchIds.push(match.gameId);
                }

            }

            //if there are no matches played on summoners rift
            if(matchIds.length == 0){
                $scope.error = selectedTeam.name + ' has not played any Ranked 5v5 matches recently.';
                $scope.isError = true;
                $scope.teamClicked = false;
            }



            var myPromise = getMatchDetails.getMatchDetails(matchIds, teamName, region);
            //runs once a response has been received for every matchDetails request
            myPromise.then(function(response){
                $scope.isError = false;
                //if getting the matches is successful
                if (response[response.length - 1].matchType) {
                    processData(response, selectedTeam);
                }
                //currently have it set so that it will display error if every desired game is not gotten
                else{
                    $scope.error = response[response.length - 1].data;
                    $scope.isError = true;
                    $scope.teamClicked = false;
                }
            }.bind(this));

        };

        //organizes all the data grabbed from matches into an easy to navigate object
        var processData = function(matches, selectedTeam){

            $scope.selectedStat = $scope.defaultStat;

            //go through each match, and if it isn't a 5v5 match, remove it from the matches array
            var x = 0;
            angular.forEach(matches, function(match){
               if(match.queueType != 'RANKED_TEAM_5x5'){
                   matches.splice(x, 1);
                   DESIRED_GAMES = matches.length;
               }
                x++;
            });


            //this is the main object that contains the stats i want to gather and organize for the whole team
            var team = {};

            //get all team members that have played in matches from the match history
            team['members'] = getMembers(selectedTeam, matches);


            //add colors to the team object so the legend can be dynamically generated
            team = addColors(team);

            //create stats for the entire team total
            team['stats'] = {};

            //get the match durations
            team.stats['matchDurations'] = [];
            angular.forEach(matches, function(match){
                team.stats.matchDurations.push(match.matchDuration / 60);
            });

            console.log(selectedTeam);

            //create stats object for each member
            angular.forEach(team.members, function(member){
                member['stats'] = {};
            });


            //put all the stats into the object
            team = getStat(team, matches, 'deaths');
            team = getStat(team, matches, 'assists');
            team = getStat(team, matches, 'totalDamageDealtToChampions');
            team = getStat(team, matches, 'kills');
            team = getStat(team, matches, 'wardsPlaced');
            team = getStat(team, matches, 'wardsKilled');
            team = getStat(team, matches, 'minionsKilled');

            team = getKillParticipation(team);
            team = getMinionsKilledPerMin(team);
            team = getWardsKilledPerMin(team);
            team = getWardsPlacedPerMin(team);
            team = getMinionsKilledAt10Min(team, matches);

            $scope.team = team;
            console.log(team);
            console.log(matches);

            //if there are members on the team
                $scope.teamClicked = true;
                $scope.makeChart($scope.defaultStat, $scope.average, $scope.teamTotal);
            ////if the team has no members a.k.a. no 5v5 games played
            //else {
            //    $scope.error = selectedTeam.name + ' has not played any Ranked 5v5 matches recently.';
            //    $scope.isError = true;
            //    $scope.teamClicked = false;
            //}
        };

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

        $scope.makeChart = function(statName, average){

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
                case 'CS @ 10 Minutes':
                    statName = 'minionsKilledAt10Min';
                    break;
                default:
                    break;
            }
            //need to reset the canvas
            $scope.resetCanvas();
            var ctx = document.getElementById("chart").getContext("2d");


            //a line chart with each members stats over all the games
            if(!average){
                var data = {};
                data.datasets = [];
                data.labels = [];

                for(var i = 0; i < $scope.opposingTeamNames.length; i++)
                {
                    data.labels[i] = $scope.opposingTeamNames[i];
                }

                angular.forEach($scope.team.members, function (member) {
                    var playerData = {};
                    playerData['label'] = member.summonerName;
                    playerData['strokeColor'] = member.color;
                    playerData['pointColor'] = member.color;
                    playerData['pointStrokeColor'] = member.darkColor;
                    playerData['pointHighlightFill'] = member.darkColor;
                    playerData['data'] = member.stats[statName].perMatch;
                    data.datasets.push(playerData);
                });


                new Chart(ctx).Line(data, {
                    //define chart options here
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
                angular.forEach($scope.team.members, function (member) {
                    var datasets = data.datasets;
                    var playerData = {};
                    playerData['label'] = member.summonerName;
                    playerData['fillColor'] = member.color;
                    playerData['strokeColor'] = member.darkColor;
                    playerData['data'] = [];
                    playerData.data.push(member.stats[statName].average);
                    datasets.push(playerData);
                });
                new Chart(ctx).Bar(data, {
                    //define chart options here
                    animationEasing: "easeOutQuint",
                    scaleFontSize: 16,
                    scaleBeginAtZero: false,
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

        var getMinionsKilledAt10Min = function(team, matches){
            team.stats['minionsKilledAt10Min'] = {};
            team.stats.minionsKilledAt10Min['perMatch'] = [];

            angular.forEach(team.members, function(member) {
                member.stats['minionsKilledAt10Min'] = {};
                member.stats.minionsKilledAt10Min['perMatch'] = [];
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
                            var csTimeline = participant.timeline.creepsPerMinDeltas;
                            if(csTimeline.thirtyToEnd){
                                var csMinAtEnd = participant.stats.minionsKilled / (match.matchDuration / 60);
                                var csMinAt30 = csMinAtEnd / ((csTimeline.thirtyToEnd / 100) + 1);
                                var csMinAt20 = csMinAt30 / ((csTimeline.twentyToThirty / 100) + 1);
                                var csMinAt10 = csMinAt20 / ((csTimeline.tenToTwenty / 100) + 1);
                                var csAt10 = parseFloat((csMinAt10 * 10).toFixed(0));
                            }
                            else if (csTimeline.twentyToThirty){
                                var csMinAtEnd = participant.stats.minionsKilled / (match.matchDuration / 60);
                                var csMinAt20 = csMinAtEnd / ((csTimeline.twentyToThirty / 100) + 1);
                                var csMinAt10 = csMinAt20 / ((csTimeline.tenToTwenty / 100) + 1);
                                var csAt10 = parseFloat((csMinAt10 * 10).toFixed(0));
                            }
                            else if (csTimeline.tenToTwenty){
                                var csMinAtEnd = participant.stats.minionsKilled / (match.matchDuration / 60);
                                var csMinAt10 = csMinAtEnd / ((csTimeline.tenToTwenty / 100) + 1);
                                var csAt10 = parseFloat((csMinAt10 * 10).toFixed(0));
                            }
                            member.stats.minionsKilledAt10Min.perMatch.push(csAt10);
                            statTotal += csAt10;
                            foundMember = true;
                        }
                    }
                    if (foundMember == false){
                        member.stats.minionsKilledAt10Min.perMatch.push(null);
                    }

                    //get the average for the stat from all games
                    member.stats.minionsKilledAt10Min['average'] = getAverage(member.stats.minionsKilledAt10Min.perMatch);
                });
                team.stats.minionsKilledAt10Min.perMatch.push(statTotal);

            });

            team.stats.minionsKilledAt10Min['average'] = getAverage(team.stats.minionsKilledAt10Min.perMatch);



            //return the team object with all the new data!
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

    }]);
}(angular));