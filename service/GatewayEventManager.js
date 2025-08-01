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

GatewayEventManager.prototype.joinPrivateGame = function( myUser, roomId ) 
{
	myUser.state = 1;

	let targetGame = null;
	if ( DataModel.mapGameIdToGame.has( roomId ) )
	{
		targetGame = DataModel.mapGameIdToGame.get( roomId );
	}

	if ( targetGame )
	{
		myUser.game = targetGame;

		let arrLivePlayerDataEvent = [];
		for ( let player of myUser.game.players )
		{
			console.log( "onRoomLoaded " + player.userId + " :: profile.prefix=" + player.profile.username.prefix );
			arrLivePlayerDataEvent.push( { profile: player.profile } );
		}
		myUser.socket.emit( "onRoomLoaded", { players: arrLivePlayerDataEvent, roomId: myUser.game.gameId } );
		
		myUser.socket.on( "sendEvent", Utils.callAndCatchErrors.bind( this, this._onSendEvent, myUser ) );

		targetGame.players.push( myUser );
		for ( let player of targetGame.players )
		{
			player.socket.emit( "onPlayerPresenceUpdated", { profile: myUser.profile, action: "JOIN", isHost: false, isLocalPlayer: player == myUser, uid: Date.now.toString() } );
		}
	}
	else
	{
		// TODO: Error event.
	}
}


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
	game.isPrivate = true;
	game.init();
	game.players.push( myUser );
	DataModel.mapGameIdToGame.set( kGameId, game );

	myUser.game = game;

	myUser.socket.on( "sendEvent", Utils.callAndCatchErrors.bind( this, this._onSendEvent, myUser ) );
	
	myUser.socket.emit( "onRoomCreated", Config.httpServerUrl + "/?roomId=" + kGameId );
};

GatewayEventManager.prototype._onSendEvent = function( myUser, liveEventData ) 
{
	myUser.game.liveEvents.push( liveEventData );

	if ( liveEventData.type == "START_GAME" )
	{
		myUser.game.isStarted = true;
	}

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
					if ( game.size == Config.gameRoomSize 
						&& game.players.length < game.size 
						&& !game.isPrivate
						&& !game.isStarted )
					{
						targetGame = game;
						break;
					}
				}

				if ( targetGame )
				{
					myUser.game = targetGame;

					let arrLivePlayerDataEvent = [];
					for ( let player of myUser.game.players )
					{
						console.log( "onRoomLoaded " + player.userId + " :: profile.prefix=" + player.profile.username.prefix );
						arrLivePlayerDataEvent.push( { profile: player.profile } );
					}
					myUser.socket.emit( "onRoomLoaded", { players: arrLivePlayerDataEvent, roomId: myUser.game.gameId } );

					targetGame.players.push( myUser );
					
					for ( let player of targetGame.players )
					{
						player.socket.emit( "onPlayerPresenceUpdated", { profile: myUser.profile, action: livePresenceAction, isHost: targetGame.players.length > 0 && myUser == targetGame.players[ 0 ], isLocalPlayer: player == myUser, uid: Date.now.toString() } );
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

					myUser.socket.emit( "onPlayerPresenceUpdated", { profile: myUser.profile, action: livePresenceAction, isHost: true, isLocalPlayer: true, uid: Date.now.toString() } );
				}

				myUser.socket.on( "sendEvent", Utils.callAndCatchErrors.bind( this, this._onSendEvent, myUser ) );

				break;
			}

		case "LEAVE":
			{
				myUser.state = 0;

				let isHost = myUser.game.players[ 0 ] == myUser;
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
					player.socket.emit( "onPlayerPresenceUpdated", { profile: myUser.profile, action: livePresenceAction, isHost: isHost, isLocalPlayer: player == myUser, uid: Date.now.toString() } );
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
							player.socket.emit( "onPlayerPresenceUpdated", { profile: myUser.profile, action: "HOST_CHANGED", isHost: isHost, isLocalPlayer: player == myUser, uid: Date.now.toString() } );
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