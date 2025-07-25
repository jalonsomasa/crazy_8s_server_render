"use strict";


//===================================================
// Constructor
//===================================================

/**
 * @constructor
 */
function Game() 
{
	this._gameId = null;
	this._size = null;
	this._arrUser = null;
	this._arrLiveEventData = [];
};
module.exports = Game;
Game.prototype.constructor = Game;


//===================================================
// Public
//===================================================

Game.prototype.init = function() 
{
	console.assert( this._gameId != null, "Game.js :: init() :: this._gameId cannot be null." );
	console.assert( this._size > 1, "Game.js :: init() :: this._size cannot be less than 1." );

	this._arrUser = [];
};


//===================================================
// Getters / Setters
//===================================================

Object.defineProperty(
	Game.prototype, 
	"gameId", 
	{ 
		get: function() { return this._gameId; },
		set: function( value ) { this._gameId = value; } 
	} );

Object.defineProperty(
	Game.prototype, 
	"size", 
	{ 
		get: function() { return this._size; },
		set: function( value ) { this._size = value; } 
	} );

Object.defineProperty(
	Game.prototype, 
	"players", 
	{ 
		get: function() { return this._arrUser; } 
	} );

Object.defineProperty(
	Game.prototype, 
	"liveEvents", 
	{ 
		get: function() { return this._arrLiveEventData; } 
	} );