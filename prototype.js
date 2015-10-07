(function( window ) {
    "use strict";


    extend( Function.prototype, (function() {
        var slice = Array.prototype.slice;


        function argumentNames() {
            var names = this.toString().match( /^[\s\(]*function[^(]*\(([^)]*)\)/ )[ 1 ]
                .replace( /\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '' )
                .replace( /\s+/g, '' ).split( ',' );
            return names.length == 1 && !names[ 0 ] ? [] : names;
        }

        function wrap( wrapper ) {
            var fn = this;
            return function() {
                return wrapper.apply( this, [ fn.bind( this ) ].concat( slice.call( arguments ) ) );
            }
        }

        return {
            argumentNames: argumentNames,
            wrap         : wrap
        };
    })() );


    function $A( a ) {
        var args = [];
        for( var i in a ) {
            if( parseInt( i ) )
                args.push( a[ i ] );
        }
        return args;
    }

    function addMethods( functions, fn ) {
        var $super   = fn.parent && fn.parent.prototype;
        each( functions, function( value, property ) {
            if( $super && typeof value === "function" ) {
                var method = value;
                value      = (function( m ) {
                    return function() { return $super[ m ].apply( this, arguments ); };
                })( property ).wrap( method );

                value.valueOf = (function( m ) {
                    return function() { return m.valueOf.call( m ); };
                })( method );

                value.toString = (function( m ) {
                    return function() { return m.toString.call( m ); };
                })( method );
            }
            fn.prototype[ property ] = value;
        } );

        return this;
    }

    function each( obj, callback ) {
        if( obj instanceof Array ) {
            if( Array.prototype.forEach ) {
                obj.forEach( callback );
            } else {
                for( var i in obj ) {
                    if( i.toString().match( /^\d*$/ ) ) {
                        callback( obj[ i ], i );
                    }
                }
            }
        } else if( obj instanceof Object ) {
            for( var i in obj ) {
                callback( obj[ i ], i );
            }
        }
    }

    function extend( a ) {
        var args = $A( arguments );
        each( args, function( it ) {
            for( var i in it ) {
                a[ i ] = it[ i ];
            }
        } );
        return a;
    }

    function Subclass() {}

    function Class( name, data, options, functions ) {
        var parent = null;
        if( typeof name === "function" ) {
            parent = name;
        } else {
            functions = options;
            options   = data;
            data      = name;
            name      = null;
            if( !(Object.keys( data )[ 0 ] in options) ) {
                functions = options;
                options   = null;
            }
        }
        Superclass.parent      = parent;
        Superclass.subclasses  = [];
        Superclass.$properties = {};

        each( data, function( it, i ) {
            if( typeof it === "string" ) {
                switch( it.toLowerCase() ) {
                    case "number":
                    case "integer":
                        Superclass.$properties[ i ] = 0;
                        break;
                    case "double":
                    case "float":
                        Superclass.$properties[ i ] = 0.0;
                        break;
                    case "array":
                    case "list":
                        Superclass.$properties[ i ] = [];
                        break;
                    case "object":
                    case "map":
                        Superclass.$properties[ i ] = {};
                        break;
                    default:
                        Superclass.$properties[ i ] = null;
                        break;
                }
            } else {
                Superclass.$properties[ i ] = null;
            }
        } );
        if( parent ) {
            Subclass.prototype   = parent.prototype;
            Superclass.prototype = new Subclass;
            parent.subclasses.push( Superclass );
            extend( Superclass.$properties, parent.$properties );
        }
        function init( object ) {
            if( object ) {
                extend( this, Superclass.$properties, object );
            }
        }

        function Superclass( object ) {
            init.call( this, object );
            return this;
        }

        addMethods( functions, Superclass );
        Superclass.prototype.constructor = Superclass;
        return Superclass;
    }

    window.Class = Class;
})
( window );


var Person = Class( {
    lastName : "string",
    firstName: "string"
}, {
    fullName: function() {
        return this.firstName + " " + this.lastName;
    },
    test    : function() {
        return "test";
    }
} );
var Child  = Class( Person, {
    taschengeld: "number"
}, {}, {
    fullName: function( $super ) {
        return this.firstName;
    }
} );
var Baby   = Class( Child, {
    weight: "number"
}, {}, {
    fullName: function( $super ) {
        return "unknown";
    }
} );

var me  = new Person( {
    lastName : "Ahrweiler",
    firstName: "Markus"
} );
var meC = new Child( {
    lastName : "Ahrweiler",
    firstName: "Markus"
} );
var meB = new Baby( {
    lastName : "Ahrweiler",
    firstName: "Markus"
} );