"use strict";

const TimeoutManager = require( "./service/TimeoutManager" );
const GatewayEventManager = require( "./service/GatewayEventManager" );


function ServiceLocator() {}
module.exports = ServiceLocator;


//===================================================
// Attributes
//===================================================

/**
 * @type {TimeoutManager}
 * @static
 * @const
 */
ServiceLocator.timeoutManager = null;

/**
 * @type {GatewayEvetManager}
 * @static
 * @const
 */
ServiceLocator.gatewayEventManager = null;

/**
 * @type {socket.io}
 * @static
 * @const
 */
ServiceLocator.io = null;


//===================================================
// Methods
//===================================================

/**
 * @type {void}
 * @static
 */
ServiceLocator.init = function()
{
	ServiceLocator.timeoutManager = new TimeoutManager();
	ServiceLocator.timeoutManager.init();

	ServiceLocator.gatewayEventManager = new GatewayEventManager();
	ServiceLocator.gatewayEventManager.init();
};

/**
 * @type {void}
 * @static
 */
ServiceLocator.end = function()
{
	ServiceLocator.timeoutManager.end();
	ServiceLocator.timeoutManager = null;

	ServiceLocator.gatewayEventManager.end();
	ServiceLocator.gatewayEventManager = null;
};