URL = "https://colonist.io";

const PLAYERS = {};
ROBBED_SOMETHING = [];

function Player() {
    // this.resources = {
    //     color: '',
    //     resources: {
    //         lumber: 0,
    //         brick: 0,
    //         wool: 0,
    //         grain: 0,
    //         ore: 0,
    //     }
    // };
    this.lumber = 0;
    this.brick = 0;
    this.wool = 0;
    this.grain = 0;
    this.ore = 0;
    return this;
}

// Track unknown stolen cards until they are revealed.

// What to reduce by
const BUILDINGS = {
    settlement: {
        lumber: 1,
        brick: 1,
        wool: 1,
        grain: 1,
    },
    development_card: {
        wool: 1,
        grain: 1,
        ore: 1,
    },
    road: {
        lumber: 1,
        brick: 1,
    },   
    city: {
        grain: 2,
        ore: 3
    }
}

// chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//     chrome.tabs.sendMessage(tabs[0].id, {greeting: "hello"}, function(response) {
//       console.log(response);
//     });
// });

// Receive from content script
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log('request received: ', request);
    //   console.log(sender.tab ?
    //               "from a content script:" + sender.tab.url :
    //               "from the extension");
    if (request.type === 'reset players') {
        for (var player of Object.keys(PLAYERS)) {
            delete PLAYERS[player];
            // if (!request.players.includes(player)) {
            //     delete PLAYERS[player];
            // }
        }
    }  else if (request.type === 'got') {
        for (var r of request.resources) {
            incrementResource(request.player, r);
        }
      } else if(request.type === 'gave bank') {
        // Reduce the given resources
        for (var r of request.gaveResources) {
            decrementResource(request.player, r, 1);
        }
        // Increment the received resources
        for (var r of request.gotResources) {
            incrementResource(request.player, r);
        }
      } else if (request.type === 'bought') {
        // development card => development_card
        var resources = BUILDINGS[request.item.toLowerCase().replace(/[ ]/g,'_')];
        console.log('resources: ', resources);
        for (var entry of Object.entries(resources)) {
            decrementResource(request.player, entry[0], entry[1]);
        }
            
      } else if (request.type === 'took from bank') {
        for (var r of request.resources) {
            incrementResource(request.player, r);
        }
      
      } else if (request.type === 'discarded') {
        for (var r of request.resources) {
            decrementResource(request.player, r, 1);
        }
      } else if (request.type === 'traded') {
        // Reduce the given resources for player 1
        for (var r of request.gaveResources) {
            decrementResource(request.player1, r, 1);
        }
        // Increment the given resources for player 2.
        for (var r of request.gaveResources) {
            incrementResource(request.player2, r);
        }
        // Increment the received resources for player 1
        for (var r of request.gotResources) {
            incrementResource(request.player1, r);
        }
        // Decrement the received resources for player 2.
        for (var r of request.gotResources) {
            decrementResource(request.player2, r, 1);
        }
      } else if (request.type === 'starting resources') {
        for (var r of request.resources) {
            incrementResource(request.player, r);
        }
      } else if (request.type === 'built') {
        var resources = BUILDINGS[request.built];
        console.log('resources: ', resources);
        for (var entry of Object.entries(resources)) {
            decrementResource(request.player, entry[0], entry[1]);
        }
      } else if (request.type === 'monopoly') {
        for (var i=0;i<request.amount;i++) {
            incrementResource(request.player, resource);
        }
      } else if (request.type === 'robberUnknown') {
        robUnknownResource(request.playerStealing, request.playerStolenFrom);
      } else if (request.type === 'robberKnown') {
        // var player = getPlayerFromColor(request.playerStealingColor);
        incrementResource(request.playerStealing, request.resource);
        decrementResource(request.playerStolenFrom, request.resource, 1);
      }
      console.log('players: ', PLAYERS);
        sendResponse({
            robs: ROBBED_SOMETHING,
            players: PLAYERS
        });
    }
);

var incrementResource = (player, resource) => {
    if (!player) {
        console.error('UNDEFINED PLAYER!!!');
    }
    if (!PLAYERS[player]) {
        PLAYERS[player] = new Player();
    }
    resource = resource.trim();
    // PLAYERS[player].resources[resource] += 1;
    PLAYERS[player][resource] += 1;
    console.log("incremented: ", player, resource, PLAYERS[player]);
}

var decrementResource = (player, resource, amount) => {
    if (!PLAYERS[player]) {
        PLAYERS[player] = new Player();
    }
    resource = resource.trim();
    PLAYERS[player][resource] -= amount;
    console.log("decremented: ", player, resource, PLAYERS[player]);
    if (PLAYERS[player][resource] < 0) {
        resolveSteal(player);
    }
}

var resolveSteal = (player) => {
    // Find all instances where this player robbed.
    var robs = ROBBED_SOMETHING.filter(f => f.playerStealing === player);
    for (var rob of robs) {
        // if (rob.probability)
        print('rob to resolve: ', rob);
    }
}

/*
    - If the stealer uses a card they don't have, resolve this card deficit.
    - If you steal a card from them they don't have, resolve as well.
    - If stolen player uses cards and goes to 0, resolve the deficit.
    - If anything goes under 0, resolve the deficit.

    If a player has 4 cards, 
    lumber, brick, wool, grain,
    and robs another brick.
    they have:
    lumber, brick, wool, grain, unknown.
    then they make a settlement, and are left with:
    brick OR unknown.

    However, if they had lumber, wool, wool, grain
    and stole a brick.
    They have: 
    lumber, wool, wool, grain, unknown
    However, after they make a settlement, their resources drop to
    lumber:0, brick: -1, wool: 1, grain: 0
    What they stole can be deduced as a brick, because -1 resources is impossible.

    Every deduction, check if there is a -1, and then that is the stolen resource.
*/
var robUnknownResource = (playerStealing, playerStolenFrom) => {
    // Get possible resources that were robbed.
    /*
    If player has:
    lumber, brick, wool
    And one is stolen, stolen resources are:
    [lumber, brick, wool]
    and a marker is added to stolen player to signify that one of these is missing.
    */
   var resources = [];
   var total = 0;
   for (var resource of ['lumber','brick','wool','grain','ore']) {
       // Calculate probability of a resource having been stolen.
       if (PLAYERS[playerStolenFrom][resource] > 0) {
            total += PLAYERS[playerStolenFrom][resource];
            for (var i=0;i<PLAYERS[playerStolenFrom][resource];i++) {
                resources.push(resource);
            }
       }
   }
    ROBBED_SOMETHING.push({
        playerStealing: playerStealing,
        playerStolenFrom: playerStolenFrom,
        resources: resources,
        total: total,
    });
}

// Robbing a known resource
var robKnownResource = (playerStealing, playerStolenFrom, resource) => {
    if (!PLAYERS[playerStealing]) {
        PLAYERS[playerStealing] = new Player();
    }
    if (!PLAYERS[playerStolenFrom]) {
        PLAYERS[playerStolenFrom] = new Player();
    }
    PLAYERS[playerStealing][resource] =+ 1;
    PLAYERS[playerStolenFrom][resource] -= 1;

}



// chrome.tabs.query({
//     active: true,
//     currentWindow: true
// }, function(tabs) {
//     console.log(tabs);
//     var tab = tabs[0];
//     var url = tab.url;
//     console.log(tab, url);
// });

// chrome.tabs.onActivated.addListener( function(activeInfo){
//     chrome.tabs.get(activeInfo.tabId, function(tab){
//         y = tab.url;
//         console.log("you are here: "+y);
//         chrome.tabs.executeScript(tabId, {
//             file: 'js/colonist_script.js'
//         }, () => {
//             //
//         });
//     });
// });

// chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
//     if (tab.active && change.url) {
//         console.log("URL updated: "+change.url);           
//         chrome.tabs.executeScript(null, {
//             file: 'js/colonist_script.js'
//         }, () => {
//             //
//         });
//     }
// });

// document.addEventListener('DOMContentLoaded', function () { 
//     document.getElementById('button').addEventListener("click", function() {
//       chrome.tabs.query({active:true, currentWindow:true},function(tab){
//         // Just doing it like this to make it fit on the page
//         console.log(tab);
//         // var newUrl = "http://www.mydestination.com/index.php?url=" + tab[0].url;
//         // chrome.tabs.create({url:newUrl});
//       });
//     }); 
// });

// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     console.log(tabId, changeInfo, tab, window.location);
//     if (changeInfo.status === 'complete' && tab.url.includes(URL)) {
//         chrome.tabs.executeScript(tabId, {
//             file: 'js/colonist_script.js'
//         }, () => {
//             //
//         });
//     }
// });