"use strict";

const Game = require( "../Game" );
const DataModel = require( "../DataModel" );
const Config = require( "../Config" );
const Utils = require( "../Utils" );


//===================================================
// Constructor
//===================================================

/**
 * @constructor
 */
function GatewayEventManager() {};
module.exports = GatewayEventManager;
GatewayEventManager.prototype.constructor = GatewayEventManager;


//===================================================
// Public
//===================================================

GatewayEventManager.prototype.init = function() {};
GatewayEventManager.prototype.end = function() {};

GatewayEventManager.prototype.add = function( myUser ) 
{
	// Profile.
	myUser.socket.on( "createProfile", Utils.callAndCatchErrors.bind( this, this._onCreateProfile, myUser ) );
	// Game room.
	myUser.socket.on( "createRoom", Utils.callAndCatchErrors.bind( this, this._onCreateRoom, myUser ) );
	myUser.socket.on( "updatePlayerPresence", Utils.callAndCatchErrors.bind( this, this._onUpdatePlayerPresence, myUser ) );
};


//===================================================
// Private
//===================================================

GatewayEventManager.prototype._onCreateProfile = function( myUser, username ) 
{
	let profile = {
    	username: { prefix: username, suffix: myUser.userId },
		avatar: { src: null, alt: null }
	};

	DataModel.mapUserIdToProfile.set( myUser.userId, profile );

	myUser.profile = profile;

	myUser.socket.emit( "onProfileChange", profile );
}

GatewayEventManager.prototype._onCreateRoom = function( myUser ) 
{
	myUser.state = 1;

	// Create the game.
	let game = new Game();
	const kGameId = myUser.userId + Date.now().toString();
	game.gameId = kGameId;
	game.size = Config.gameRoomSize;
	game.init();
	game.players.push( myUser );
	DataModel.mapGameIdToGame.set( kGameId, game );

	myUser.game = game;

	myUser.socket.on( "sendEvent", Utils.callAndCatchErrors.bind( this, this._onSendEvent, myUser, liveEventData ) );
	
	myUser.socket.emit( "onRoomCreated", kGameId );
};

GatewayEventManager.prototype._onSendEvent = function( myUser, liveEventData ) 
{
	myUser.game.liveEvents.push( liveEventData );

	for ( let player of myUser.game.players )
	{
		player.socket.emit( "onEventsReceived", [ liveEventData ] );
	}
};

GatewayEventManager.prototype._onUpdatePlayerPresence = function( myUser, livePresenceAction ) 
{
	switch ( livePresenceAction )
	{
		case "JOIN":
			{
				myUser.state = 1;

				let targetGame = null;
				for ( const [ gameId, game ] of DataModel.mapGameIdToGame.entries() )  
				{
					if ( game.size == Config.gameRoomSize && game.players.length < game.size )
					{
						targetGame = game;
						break;
					}
				}

				if ( targetGame )
				{
					myUser.game = targetGame;

					let arrPlayerProfile = [];
					for ( let player of myUser.game.players )
					{
						console.log( "onRoomLoaded " + player.userId + " :: profile.prefix=" + player.profile.username.prefix );
						arrPlayerProfile.push( player.profile );
					}
					myUser.socket.emit( "onRoomLoaded", { players: arrPlayerProfile } );

					targetGame.players.push( myUser );
					
					for ( let player of targetGame.players )
					{
						player.socket.emit( "onPlayerPresenceUpdated", { player: myUser.profile, type: livePresenceAction } );
					}
				}
				else
				{
					let game = new Game();
					const kGameId = myUser.userId + Date.now().toString();
					game.gameId = kGameId;
					game.size = Config.gameRoomSize;
					game.init();
					game.players.push( myUser );
					DataModel.mapGameIdToGame.set( kGameId, game );

					myUser.game = game;

					myUser.socket.emit( "onPlayerPresenceUpdated", { player: myUser.profile, type: livePresenceAction } );
				}

				myUser.socket.on( "sendEvent", Utils.callAndCatchErrors.bind( this, this._onSendEvent, myUser ) );

				break;
			}

		case "LEAVE":
			{
				myUser.state = 0;

				let isHostChanged = false;
				for ( let i = myUser.game.players.length - 1; i >= 0; --i )
				{
					let player = myUser.game.players[ i ];
					if ( player == myUser )
					{
						myUser.game.players.splice( i, 1 );
						if ( i == 0 )
						{
							isHostChanged = true;
						}
					}
					player.socket.emit( "onPlayerPresenceUpdated", { player: DataModel.mapUserIdToProfile.get( myUser.userId ), type: livePresenceAction } );
				}

				if ( myUser.game.length == 0 )
				{
					DataModel.mapGameIdToGame.delete( myUser.game.gameId );
				}
				else
				{
					if ( isHostChanged )
					{
						for ( let player of myUser.game.players )
						{
							player.socket.emit( "onPlayerPresenceUpdated", { player: DataModel.mapUserIdToProfile.get( myUser.game.players[ 0 ] ), type: "HOST_CHANGED" } );
						}
					}
				}

				myUser.game = null;

				myUser.socket.removeAllListeners( "sendEvent" );

				break;
			}

		case "HOST_CHANGED":
			{
				// TODO:
				break;
			}
	}
};

// #endregion //