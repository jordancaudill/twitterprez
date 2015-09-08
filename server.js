var express = require('express');
var request = require('request');
var timeout = require('connect-timeout');
var q = require('q');
var app = express();

var port = 3000;

var naapi = 'https://na.api.pvp.net/api/lol/na';
var apiKey = '?api_key=1fb7abdb-48e1-4526-b8f6-3cc8e15eea82';

app.listen(port, function () {
    console.log('Jordans server is running on localhost: ' + port);
});
app.use(express.static('public'));
app.use(timeout(5000));

app.get('/summoner/:name', function (req, res){
    var name = req.params.name;
    console.log('Request made for summoner: '+name);
    request(naapi+'/v1.4/summoner/by-name/'+name+apiKey, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('request successful');
            res.send(body);
        }
        else if(error){
            console.log('error caught');
            res.send(error);
        }
        else if(req.timedout){
            console.log('timeout');
            res.send('Request has timed out.');
        }
        else if(response.statusCode = 404){
            console.log('404 Not Found');
            res.send('Could not find Summoner');
        }
        else {
            console.log('unknown error');
            res.send('Unknown error occurred. Please report this to Jordan.')
        }
    })
});

app.get('/teams/:summonerId', function (req, res){
    var summonerId = req.params.summonerId;
    request(naapi+'/v2.4/team/by-summoner/'+summonerId+apiKey, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(body);
        }
        else if(error){
            res.send(error);
        }
        else if(req.timedout){
            res.send('Request has timed out.');
        }
        else if(response.statusCode = 404){
            console.log('404 Not Found');
            res.send('Could not find teams');
        }
        else {
            res.send('Unknown error occurred. Please report this to Jordan.')
        }
    })
});

app.get('/match/:matchId', function (req, res){
    var matchId = req.params.matchId;


    request(naapi+'/v2.2/match/'+matchId+apiKey, function (error, response, body) {

        if (!error && response.statusCode == 200) {
            console.log('match request successful');
            res.send(body);
        }
        else if(error){
            res.send(error);
        }
        else if(req.timedout){
            res.send('Request has timed out.');
        }
        else if(response.statusCode = 404){
            console.log('404 Not Found');
            res.send('Could not find games');
        }
        else {
            res.send('Unknown error occurred. Please report this to Jordan.')
        }
    });



});



