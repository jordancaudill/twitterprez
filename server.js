var express = require('express');
var request = require('request');
var q = require('q');
var app = express();

var port = 3000;

var naapi = 'https://na.api.pvp.net/api/lol/na';
var apiKey = '?api_key=1fb7abdb-48e1-4526-b8f6-3cc8e15eea82';

app.listen(port, function () {
    console.log('Jordans server is running on localhost: ' + port);
});

app.use(express.static('public'));

app.get('/summoner/:name', function (req, res){
    var name = req.params.name;
    request(naapi+'/v1.4/summoner/by-name/'+name+apiKey, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(body);
        }
    })
});

app.get('/teams/:summonerId', function (req, res){
    var summonerId = req.params.summonerId;
    request(naapi+'/v2.4/team/by-summoner/'+summonerId+apiKey, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(body);
        }
    })
});

app.get('/match/:gameId', function (req, res){
    var gameId = req.params.gameId;


    request(naapi+'/v2.2/match/'+gameId+apiKey, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.send(body);
        }
        if(error){
            console.log(error);
        }
    });



});



