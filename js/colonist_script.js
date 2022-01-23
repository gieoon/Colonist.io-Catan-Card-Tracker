// UI container

const getLoggedInUser = () => {
    var username = document.querySelector('#header_profile_username').textContent;
    // console.log("got username: ", username);
    return username;
}

username = getLoggedInUser();

var createUIContainer = () => {
    var d = document.createElement('div');
    d.id = 'colonist_powerup_wrapper'
    d.innerHTML = `
        <div style="position: absolute;">
        </div>
    `;
    document.body.appendChild(d);
}

var updateUI = (serverResponse) => {
    var players = serverResponse.players;
    var robs = serverResponse.robs;
    var wrapper = document.getElementById('colonist_powerup_wrapper');
    var str = '';
    for (var playerEntry of Object.entries(players)) {
        var playerName = playerEntry[0];
        var playerResources = playerEntry[1];
        str += `<div class="player_wrapper">${playerName}`;
        for (var r of Object.entries(playerResources)) {
            var resourceName = r[0];
            var resourceAmount = r[1];
            var imgString = `../dist/images/card_${resourceName}.svg?v124`
            if (resourceAmount > 0) {
                str += `<div class="card_group">`;
            }
            for (var i=0;i<resourceAmount;i++) {
                str += `<div class="player_card">
                    <img src="${imgString}"/>`

                // If last one in iteration, add count
                if (i === resourceAmount - 1) {
                    str += `<span class="count">${resourceAmount}</span>`;
                }
                str += `</div>`;
            }
            if (resourceAmount > 0) {
                str += `</div>`;
            }
        } 
        // Add mystery card if robs exist.
        var mysteryCardString = `../dist/images/card_rescardback.svg?v124`;
        for (var rob of robs) {
            // str += `<img src="${mysteryCardString}"/>`;    
            var resources = calculateRobbedPercentageForCard(rob.resources, rob.total);
            if (rob.playerStealing === playerName) {
                str += `<div class="mystery_card_group">`;
            
                for (var resourceEntry of Object.entries(resources)) {
                    str += '<div class="mystery_card">';
                    var resourceName = resourceEntry[0];
                    var probability = resourceEntry[1].probability;
                    var imgString = `../dist/images/card_${resourceName}.svg?v124`;
                    if (probability > 0) {
                        str += `<img src="${imgString}"/>`
                        str += `<span>${probability}%</span>`
                    }
                    str += '</div>';
                }
                str += '</div>';
            }
            
        }

        // <span>x ${r[1]}</span>
        str += '</div>';
        wrapper.innerHTML = str;
    }
}

// Given a card, card distributions, and totals, calculate and return the percentage likelihood of this card.
var calculateRobbedPercentageForCard = (resources, total) => {
    const out = resources.reduce((out, r) => {
        return out[r] ? ++out[r].count : out[r] = {count: 1, probability: 0}, out
    }, {});
    for (var resource of Object.keys(out)) {
        out[resource].probability = out[resource].count / total * 100;
        out[resource].probability = out[resource].probability.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];
    }
    console.log('out: ', out);
    return out;
}

var container = document.getElementById('game-log-text');
// game room is not defined by url, so periodically check until a game text container is found.
var timer = setInterval(() => {
    // console.log('container: ', container);
    if (!container || container === null || container === 'null') {
        container = document.getElementById('game-log-text');
    } else {
        clearInterval(timer);
        if(container) {
            // console.log(Array.from(container.querySelectorAll('.message_post')).length, ' messages');
            handleMessage(container);        
            createUIContainer();
        }
    }
}, 500);

// Handle messages.
var handleMessage = (container) => {
    var callback = () => {
        var latestMessage = container.lastChild;
        var messageColor = latestMessage.style.color;

        // String comparison to classify message type.
        if (latestMessage.textContent.includes('built a')) {
            var startIndex = latestMessage.innerHTML.indexOf('built a');
            var playerString = latestMessage.innerHTML.substring(0, startIndex);
            var resourceText = latestMessage.innerHTML.substring(startIndex);
            var resources = getResourceImages(resourceText);
            sendToBackground({
                type: 'built',
                player: stripImageFromPlayerString(playerString),
                built: resources[0],
            });
        }
        else if (latestMessage.textContent.includes(" got: ")) {
            // Retrieve images coming after 'got: ' (to ignore player images)
            var startIndex = latestMessage.innerHTML.indexOf(' got: ');
            var imageText = latestMessage.innerHTML.substring(startIndex);
            var resourceTypes = getResourceImages(imageText);
            var playerString = latestMessage.innerHTML.substring(0, startIndex);
            // console.log(stripImageFromPlayerString(playerString), 'got: ', resourceTypes);
            sendToBackground({
                type: 'got',
                player: stripImageFromPlayerString(playerString),
                resources: resourceTypes,
            });
        } else if (latestMessage.textContent.includes("took from bank:")) {
            // year of plenty,
            var startIndex = latestMessage.innerHTML.indexOf('took from bank:');
            var playerString = latestMessage.innerHTML.substring(0, startIndex);
            var resources = getResourceImages(latestMessage.innerHTML.substring(startIndex));
            sendToBackground({
                type: 'took from bank',
                player: stripImageFromPlayerString(playerString),
                resources: resources,
            });
        } else if (latestMessage.textContent.includes(" bought ")) {
            var startIndex = latestMessage.innerHTML.indexOf(' bought ');
            var playerString = latestMessage.innerHTML.substring(0, startIndex);
            var resources = getResourceImages(latestMessage.innerHTML.substring(startIndex));
            sendToBackground({
                type: 'bought',
                player: stripImageFromPlayerString(playerString),
                item: resources[0],
            });
        
        } else if (latestMessage.textContent.includes("starting resources")) {
            var startIndex = latestMessage.innerHTML.indexOf('received starting resources');
            var resourceImages = latestMessage.innerHTML.substring(startIndex);
            var resourceTypes = getResourceImages(resourceImages);
            var playerString = latestMessage.innerHTML.substring(0, startIndex);
            // console.log(stripImageFromPlayerString(playerString), ' starting resources: ', resourceTypes);
            sendToBackground({
                type: 'starting resources',
                player: stripImageFromPlayerString(playerString),
                resources: resourceTypes,
            });
        } else if (latestMessage.textContent.includes(" discarded: ")) {
            var startIndex = latestMessage.innerHTML.indexOf(' discarded: ');
            var imageText = latestMessage.innerHTML.substring(startIndex);
            var resourceTypes = getResourceImages(imageText);
            var playerString = latestMessage.innerHTML.substring(0, startIndex);
            // console.log(stripImageFromPlayerString(playerString), 'discarded: ', resourceTypes);
            sendToBackground({
                type: 'discarded',
                player: stripImageFromPlayerString(playerString),
                resources: resourceTypes,
            });
        }  else if (latestMessage.textContent.includes(" gave bank: ")) {
            var startIndex = latestMessage.innerHTML.indexOf(' gave bank: ');
            var endIndex = latestMessage.innerHTML.indexOf(' and took');
            var gaveImageText = latestMessage.innerHTML.substring(startIndex, endIndex);
            var gotImageText = latestMessage.innerHTML.substring(endIndex);
            var gaveResources = getResourceImages(gaveImageText);
            var gotResources = getResourceImages(gotImageText);
            var playerString = latestMessage.innerHTML.substring(0, startIndex);
            // console.log(stripImageFromPlayerString(playerString), 'gave bank: ', gaveResources);
            // console.log(stripImageFromPlayerString(playerString), 'took from bank: ', gotResources);
            sendToBackground({
                player: stripImageFromPlayerString(playerString),
                type: 'gave bank',
                gaveResources: gaveResources,
                gotResources: gotResources,
            });
        } else if (latestMessage.textContent.includes(" traded:")) {
            
            /*
                <img src="../dist/images/icon_player.svg?v124" alt="Guest" height="20" width="20">
                NACHO#5480 traded:  
                <img src="../dist/images/card_grain.svg?v124" alt="grain" height="20" width="14.25" class="lobby-chat-text-icon">
                for:  <img src="../dist/images/card_brick.svg?v124" alt=" brick" height="20" width="14.25" class="lobby-chat-text-icon">
                <img src="../dist/images/card_brick.svg?v124" alt=" brick" height="20" width="14.25" class="lobby-chat-text-icon">
                with: Peanut#0012
            */
            var tradedStartIndex = latestMessage.innerHTML.indexOf(' traded:');
            var tradedEndIndex = latestMessage.innerHTML.indexOf('for: ');
            var traded2StartIndex = latestMessage.innerHTML.indexOf('for: ') + 'for: '.length;
            var traded2EndIndex = latestMessage.innerHTML.indexOf(' with: ') + ' with: '.length;
            var player1String = latestMessage.innerHTML.substring(0, tradedStartIndex);
            var player2String = latestMessage.innerHTML.substring(traded2EndIndex);
            var gaveTradeText = getResourceImages(latestMessage.innerHTML.substring(tradedStartIndex, tradedEndIndex));
            var gotTradeText = getResourceImages(latestMessage.innerHTML.substring(traded2StartIndex, traded2EndIndex));
            // console.log(stripImageFromPlayerString(player1String), stripImageFromPlayerString(player2String), gaveTradeText, gotTradeText);
            sendToBackground({
                type: 'traded',
                player1: stripImageFromPlayerString(player1String),
                player2: stripImageFromPlayerString(player2String),
                gaveResources: gaveTradeText,
                gotResources: gotTradeText,
            });
        } else if (latestMessage.textContent.match(/stole ([0-9]+):/) !== null) {
            // monopoly stole X resources
            var m = latestMessage.textContent.match(/stole ([0-9]+):/);
            var playerString = latestMessage.innerHTML.substring(0, m.index);
            var resourceAmount = m[1];
            var resource = getResourceImages(latestMessage.innerHTML.substring(m.index));
            sendToBackground({
                type: 'monopoly',
                player: stripImageFromPlayerString(playerString),
                amount: resourceAmount,
                resource: resource
            });
        } else if (latestMessage.textContent.includes('You stole:')) {
            // You steal from someone.
            var startIndex = latestMessage.innerHTML.indexOf('You stole:');
            var playerStealing = stripImageFromPlayerString(latestMessage.innerHTML.indexOf(startIndex));
            var playerStolenFromIndex = latestMessage.innerHTML.indexOf(' from:');
            var playerStolenFrom = stripImageFromPlayerString(latestMessage.innerHTML.substring(playerStolenFromIndex + ' from:'.length));
            var resources = getResourceImages(latestMessage.innerHTML.substring(startIndex, playerStolenFromIndex));
            sendToBackground({
                type: 'robberKnown',
                // playerStealingColor: messageColor, 
                playerStealing: username,
                playerStolenFrom: playerStolenFrom,
                resource: resources[0],
            });
        } else if (latestMessage.textContent.includes('from you')) {
            var playerStealingIndex = latestMessage.innerHTML.indexOf('stole: ');
            var playerStealing = stripImageFromPlayerString(latestMessage.innerHTML.substring(0, playerStealingIndex));
            var resources = getResourceImages(latestMessage.innerHTML.substring(playerStealingIndex));
            sendToBackground({
                type: 'robberKnown',
                playerStealing: playerStealing,
                playerStolenFrom: username,
                resource: resources[0],
            });
            // robber steal from you, the resource is known.
        } else if (latestMessage.textContent.includes(' stole ')) {
            // Robber unknown steal
            var startIndex = latestMessage.innerHTML.indexOf(' stole ');
            var playerStealingString = stripImageFromPlayerString(latestMessage.innerHTML.substring(0, startIndex));
            var playerStolenFromIndex = latestMessage.innerHTML.indexOf(' from: ');
            var playerStolenFromString = stripImageFromPlayerString(latestMessage.innerHTML.substring(playerStolenFromIndex + 'from: '.length));
            sendToBackground({
                type: 'robberUnknown',
                playerStealing: playerStealingString,
                playerStolenFrom: playerStolenFromString,
            });
        }
    }
    const observer = new MutationObserver(callback);
    const config = { attributes: true, childList: true, subtree: true };
    observer.observe(container, config);
}


// Retrieve the child elements.
var getResourceImages = (imagesText) => {
    return imagesText.match(/alt="(.+?)(?=")/g).map(m => {
        // Strip alt=" and ' at end.
        return m.replace(/alt="|'/g, '');
    });
}

var getPlayerColor = (el) => {
    return el.style.color;
}

var stripImageFromPlayerString = (playerString) => {
    var d = document.createElement('div');
    d.innerHTML = playerString;
    return d.textContent.trim();
}

// Refresh background script to remove other players.
const resetPlayersInRoom = () => {
    var players = Array.from(document.querySelectorAll('.room_player_info > div:nth-child(1) > span'));
    const out = [];
    for (var player of players) {
        if (player.textContent.trim() !== 'Player') {
            out.push(player.textContent.trim());
        }
    }
    sendToBackground({
        type: 'reset players',
        players: out,
    });
};

var sendToBackground = (obj) => {
    console.log(obj, obj.resources);
    chrome.runtime.sendMessage(obj, (res) => {
        console.log('BACKGROUND => players: ', res);
        updateUI(res);
    })
}

resetPlayersInRoom();

// Receive from background.
// chrome.runtime.onMessage.addListener(
//     function(request, sender, sendResponse) {
//       console.log(sender.tab ?
//                   "from a content script:" + sender.tab.url :
//                   "from the extension");
//       if (request.type === "gave bank")
//         sendResponse({farewell: "goodbye"});
//     }
//   );