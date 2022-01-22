URL = "https://colonist.io";

const PLAYERS = {};
const ROBS = {};

const EMPTY_PLAYER_OBJECT = {
    // name: '',
    color: '',
    resources: {
        lumber: 0,
        brick: 0,
        wool: 0,
        grain: 0,
        ore: 0,
    }
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
      if (request.type === 'got') {
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
        decrementResource(request.playerStolenFrom, request.resource);
      }
      console.log('new players: ', PLAYERS);
        sendResponse(PLAYERS);
    }
);

var incrementResource = (player, resource) => {
    if (!player) {
        console.error('UNDEFINED PLAYER!!!');
    }
    if (!PLAYERS[player]) {
        PLAYERS[player] = Object.assign(EMPTY_PLAYER_OBJECT, {});
    }
    resource = resource.trim();
    PLAYERS[player].resources[resource] += 1;
    console.log("incremented: ", player, resource, PLAYERS[player].resources);
}

var decrementResource = (player, resource, amount) => {
    if (!PLAYERS[player]) {
        PLAYERS[player] = Object.assign(EMPTY_PLAYER_OBJECT, {});
    }
    resource = resource.trim();
    PLAYERS[player].resources[resource] -= amount;
    console.log("decremented: ", player, resource, PLAYERS[player].resources);
}

var robUnknownResource = (playerStealing, playerStolenFrom) => {
    // ROBS
    /*
    1. Give the probability of the resource type, based on what the player currently holds.
    2. Create a flow of that probability from stolen to stealer.
    3. If the stealer uses a card they don't have, resolve this card deficit.
    4. If stolen player uses cards and goes to 0, resolve the deficit.
    */
}

// Robbing a known resource
var robKnownResource = (playerStealing, playerStolenFrom, resource) => {
    if (!PLAYERS[playerStealing]) {
        PLAYERS[playerStealing] = Object.assign(EMPTY_PLAYER_OBJECT, {});
    }
    if (!PLAYERS[playerStolenFrom]) {
        PLAYERS[playerStolenFrom] = Object.assign(EMPTY_PLAYER_OBJECT, {});
    }
    PLAYERS[playerStealing].resources[resource] =+ 1;
    PLAYERS[playerStolenFrom].resources[resource] -+ 1;

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