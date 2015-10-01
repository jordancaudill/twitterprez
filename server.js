var express = require('express');
var request = require('request');
var q = require('q');
var app = express();

var port = 3000;

var apiKey = '?api_key=1fb7abdb-48e1-4526-b8f6-3cc8e15eea82';

app.all("/*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
    return next();
});

app.listen(port, function () {
    console.log('Jordans server is running on localhost: ' + port);
});
app.use(express.static('public'));

app.get('/summoner/:region/:name', function (req, res){
    var name = req.params.name;
    var region = req.params.region;
    region = region.toLowerCase();
    console.log('Request made for summoner: '+name);
    request('https://'+region+'.api.pvp.net/api/lol/'+region+'/v1.4/summoner/by-name/'+name+apiKey, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('request successful');
            res.send(body);
        }
        else if(error){
            console.log('error caught');
            res.send(error);
        }
        else if(response.statusCode == 404){
            console.log('404 Not Found');
            res.send('Could not find Summoner');
        }
        else if(response.statusCode == 429){
            console.log('rate limit exceeded');
            res.send('Team Statter is receiving a lot of requests right now. Please try again in 10 seconds.');
        }
        else if(response.statusCode == 503){
            console.log('API Offline');
            res.send('Sorry, the League of Legends API is offline right now.');
        }
        else {
            console.log('unknown error');
            res.send('Unknown error occurred. Please report this to Jordan.')
        }
    })
});

app.get('/teams/:region/:summonerId', function (req, res){
    var summonerId = req.params.summonerId;
    var region = req.params.region;
    region = region.toLowerCase();

    request('https://'+region+'.api.pvp.net/api/lol/'+region+'/v2.4/team/by-summoner/'+summonerId+apiKey, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('request for team successful');
            res.send(body);
        }
        else if(error){
            res.send(error);
        }
        else if(response.statusCode == 404){
            console.log('404 Not Found: teams');
            res.send('Could not find teams');
        }
        else if(response.statusCode == 429){
            console.log('rate limit exceeded');
            res.send('Team Statter is receiving a lot of requests right now. Please try again in 10 seconds.');
        }
        else if(response.statusCode == 503){
            console.log('API Offline');
            res.send('Sorry, the League of Legends API is offline right now.');
        }
        else {
            res.send('Unknown error occurred. Please report this to Jordan.')
        }
    })
});

app.get('/match/:region/:matchId', function (req, res){
    var matchId = req.params.matchId;
    var region = req.params.region;
    region = region.toLowerCase();


    request('https://'+region+'.api.pvp.net/api/lol/'+region+'/v2.2/match/'+matchId+apiKey, function (error, response, body) {

        if (!error && response.statusCode == 200) {
            console.log('match request successful');
            res.send(body);
        }
        else if(error){
            res.send(error);
        }
        else if(response.statusCode == 404){
            console.log('404 Not Found');
            res.send('Could not find games');
        }
        else if(response.statusCode == 429){
            console.log('rate limit exceeded');
            res.send('Team Statter is receiving a lot of requests right now. Please try again in 10 seconds.');
        }
        else if(response.statusCode == 503){
            console.log('API Offline');
            res.send('Sorry, the League of Legends API is offline right now.');
        }
        else {
            res.send('Unknown error occurred. Please report this to Jordan.')
        }
    });



});



