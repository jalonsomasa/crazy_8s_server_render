"use strict";

const Config = require( "./Config" );
const DataModel = require( "./DataModel" );
const ServiceLocator = require( "./ServiceLocator" );
const Utils = require( "./Utils" );

const User = require("./User");
const express = require( "express" )();
const http = require( "http" );

let keepAliveTimer = null;
let server = null;
let io = null;
if ( Config.isDebugMode )
{
    // Development.
    server = http.createServer( express );
    io = require( "socket.io" )( server, { wsEngine: "ws" } );
}
else
{
    // Production.
    /*const fs = require( "fs" );
    const kOptions = {
        key: fs.readFileSync( "/etc/letsencrypt/live/whitespell.net/privkey.pem" ),
        cert: fs.readFileSync( "/etc/letsencrypt/live/whitespell.net/cert.pem" ),
        ca: fs.readFileSync( "/etc/letsencrypt/live/whitespell.net/chain.pem" ) };
    server = require( "https" ).Server( kOptions, express );*/
    server = http.createServer( express );
    io = require( "socket.io" )( server, { origins: "*:*", wsEngine: "ws" } );
}


// #region Startup //

function main() 
{
    // Init global components.
    const kPort = process.env.PORT || 2053;
    Config.init( kPort );
    ServiceLocator.init();

    server.listen( kPort, function() { console.log( "listening on *:" + kPort ); } );

    io.on( "connection", Utils.callAndCatchErrors.bind( this, onClientConnected ) );

    ServiceLocator.io = io;
};

function onClientConnected( socket )
{
    console.log( "Server.js :: onClientConnected" );

    const kUserId = socket.handshake.query.userId;    

    if ( !DataModel.mapUserIdToUser.has( kUserId ) )
    {
        let user = new User();
        user.userId = kUserId;
        user.socket = socket;
        DataModel.mapUserIdToUser.set( kUserId, user );

        socket.on( "disconnect", Utils.callAndCatchErrors.bind( this, onDisconnect, user ) );

        ServiceLocator.gatewayEventManager.add( user );
    
        console.log( "Server.js :: onClientConnected :: accepted " + kUserId );
        socket.emit( "connectionAccepted" );

        const kUserProfile = DataModel.mapUserIdToProfile.has( kUserId ) ? DataModel.mapUserIdToProfile.get( kUserId ) : undefined;
        user.profile = kUserProfile;
        socket.emit( "onProfileChange", kUserProfile );

        if ( kUserProfile 
            && socket.handshake.query.roomId )
        {
            console.log( kUserId + " joinPrivateGame " + socket.handshake.query.roomId );
            ServiceLocator.gatewayEventManager.joinPrivateGame( user, socket.handshake.query.roomId );
        }
    }
    else
    {
        console.log( "Server.js :: onClientConnected :: rejected " + kUserId );

        socket.emit( "connectionRejected", 0 );
    }

    if ( !keepAliveTimer && !Config.isDebugMode )
    {
		console.log( "onClientConnected :: keep alive timer initialized." );
		pingServer();
        keepAliveTimer = setInterval( pingServer, 10 * 60 * 1000 );
    }
	
	function pingServer()
	{
		const kGetOptions = {
			host: "l5r-server.onrender.com",
			port: 80,
			path: "/"  };
		http.get( kGetOptions, function( res ) {
			res.on( "data", function( chunk ) {
				try 
				{
					// optional logging... disable after it's working
					console.log( "pingServer :: response: " + chunk );
				} 
				catch ( err ) 
				{
					console.log( err.message );
				}
			} );
		} ).on( "error", function( err ) {
			console.log( "pingServer :: error: " + err.message );
		} );
	};

    function onDisconnect( myUser, reason )
    {
        console.log( "Server.js :: onDisconnect() :: userId=" + myUser.userId );

        if ( myUser.game )
        {
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
                else
                {
                    player.socket.emit( "onPlayerPresenceUpdated", { profile: myUser.profile, action: "LEAVE" } );
                }
            }

            if ( myUser.game.length == 0 )
            {
                DataModel.mapGameIdToGame.delete( myUser.game.gameId );
                console.log( "Game deleted: " + myUser.game.gameId );
            }
            else
            {
                if ( isHostChanged )
                {
                    for ( let player of myUser.game.players )
                    {
                        player.socket.emit( "onPlayerPresenceUpdated", { profile: myUser.game.players[ 0 ].profile, action: "HOST_CHANGED" } );
                    }
                }
            }
        }

        DataModel.mapUserIdToUser.delete( myUser.userId );
        //socket.broadcast.emit( "userDisconnected", myUser.userId );
        console.log( "onDisconnect :: User disconnected: " + myUser.userId + " :: " + reason );

        if ( keepAliveTimer && DataModel.mapUserIdToUser.size == 0 )
        {
            clearInterval( keepAliveTimer );
            keepAliveTimer = null;
			console.log( "onDisconnect :: keep alive timer cleared." );
        }
    };
};

main();

// #endregion //