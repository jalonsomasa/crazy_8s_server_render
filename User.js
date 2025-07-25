"use strict";

const ServiceLocator = require("./ServiceLocator");


//===================================================
// Constructor
//===================================================

/**
 * @constructor
 */
function User() 
{
	this._userId = null;
	this._socket = null;
	this._state = 0; // 0: IDLE, 1: LOOKING_FOR_GAME, 2: PLAYING
	this._game = null;
	this._profile = null;
};
module.exports = User;
User.prototype.constructor = User;


//===================================================
// Public
//===================================================

User.prototype.init = function() 
{
	console.assert( this._userId != null, "User.js :: init() :: this._userId cannot be null." );
	console.assert( this._socket != null, "User.js :: init() :: this._socket cannot be null." );
};

User.prototype.end = function() {};


//===================================================
// Getters / Setters
//===================================================

Object.defineProperty(
	User.prototype, 
	"userId", 
	{ 
		get: function() { return this._userId; },
		set: function( value ) { this._userId = value; } 
	} );

Object.defineProperty(
	User.prototype, 
	"socket", 
	{ 
		get: function() { return this._socket; },
		set: function( value ) { this._socket = value; } 
	} );

Object.defineProperty(
	User.prototype, 
	"state", 
	{ 
		get: function() { return this._state; },
		set: function( value ) { this._state = value; } 
	} );

Object.defineProperty(
	User.prototype, 
	"game", 
	{ 
		get: function() { return this._game; },
		set: function( value ) { this._game = value; } 
	} );

Object.defineProperty(
	User.prototype, 
	"profile", 
	{ 
		get: function() { return this._profile; },
		set: function( value ) { this._profile = value; } 
	} );