(function( window ) {
    "use strict";

    function defineProperty( object, property, settings ) {
        Object.defineProperty( object, property, settings );
    }

    /**
     * will iterate trough the object
     * @param object
     * @param fn
     * @returns {*}
     */
    function each( object, fn ) {
        for( var i in object ) {
            if( object.hasOwnProperty( i ) ) {
                var result = fn( object[ i ], i );
                if( result !== undefined ) {
                    return result;
                }
            }
        }
    }

    /**
     *
     * @param props
     * @returns {Map}
     * @constructor
     */
    function Map( props ) {
        var SELF = this;
        each( props, function( it, i ) {
            defineProperty( SELF, i, { value: it, enumerable: true } );
        } );
        return SELF;
    }

    Map.prototype = {};

    defineProperty( Map.prototype, "toString", {
        value     : function( delimiter ) {
            return (delimiter !== false ? "{" : "") + this.join( "," ) + (delimiter !== false ? "}" : "");
        },
        enumerable: false
    } );
    defineProperty( Map.prototype, "join", {
        value     : function( separator, skipNULL ) {
            var string = "";
            each( this, function( it, i ) {
                if( skipNULL ? ( it !== undefined && it !== null ) : true ) {
                    string += (separator || ",") + "\"" + i + "\":" + it.toString();
                }
            } );
            return string.substr( 1 );
        },
        enumerable: false
    } );


    /**
     *
     * @returns {List}
     * @constructor
     */
    function List() {
        var SELF = this;

        each( arguments, function( it, i ) {
            SELF[ parseInt( i ) ] = it;
        } );
        return SELF;
    }

    List.prototype = {};
    defineProperty( List.prototype, "first", {
        get         : function() {
            return each( this, function( it ) {
                return it;
            } );
        },
        enumerable  : false,
        configurable: false
    } );

    defineProperty( List.prototype, "last", {
        get         : function() {
            var last;
            each( this, function( it ) {
                last = it;
            } );
            return last;
        },
        enumerable  : false,
        configurable: false
    } );
    defineProperty( List.prototype, "length", {
        get         : function() {
            var length = 0;
            each( this, function() {
                length++;
            } );
            return length;
        },
        enumerable  : false,
        configurable: false
    } );
    defineProperty( List.prototype, "slice", {
        value     : Array.prototype.slice,
        enumerable: false
    } );
    defineProperty( List.prototype, "splice", {
        value     : Array.prototype.splice,
        enumerable: false
    } );
    defineProperty( List.prototype, "push", {
        value: function() {
            var SELF = this;
            each( arguments, function( it ) {
                SELF[ SELF.length ] = it;
            } );
            return SELF;
        }
    } );
    defineProperty( List.prototype, "join", {
        value: function( separator, skipNULL ) {
            var string = "";
            each( this, function( it ) {
                if( skipNULL ? ( it !== undefined && it !== null ) : true ) {
                    string += (separator || ",") + it.toString();
                }
            } );
            return string.substr( 1 );
        }
    } );
    defineProperty( List.prototype, "toString", {
        value     : function( delimiter ) {
            return (delimiter !== false ? "[" : "") + this.join( "," ) + (delimiter !== false ? "]" : "");
        },
        enumerable: false
    } );


    window.Map  = Map;
    window.List = List;

})( window );