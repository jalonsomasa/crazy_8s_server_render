"use strict";


function Config() {}
module.exports = Config;


//===================================================
// Attributes
//===================================================

/**
 * @type {isDebugMode}
 * @static
 * @const
 */
Config.isDebugMode = true;

/**
 * @type {httpServerUrl}
 * @static
 * @const
 */
Config.httpServerUrl = null;

/**
 * @type {chatServerUrl}
 * @static
 * @const
 */
Config.chatServerUrl = null;

/**
 * @type {gameRoomSize}
 * @static
 * @const
 */
Config.gameRoomSize = 2;


//===================================================
// Methods
//===================================================

/**
 * @type {void}
 * @static
 */
Config.init = function( chatServerPort )
{
    if ( Config.isDebugMode )
    {
        Config.httpServerUrl = "http://localhost/";
        Config.chatServerUrl = "http://localhost:" + chatServerPort.toString();
    }
    else
    {
        Config.httpServerUrl = "https://jonalonso.epizy.com/crazy-8s";
        Config.chatServerUrl = "https://crazy8s-server.onrender.com:" + chatServerPort.toString();
    }
};